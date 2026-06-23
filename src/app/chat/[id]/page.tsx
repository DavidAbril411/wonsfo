'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Send, ArrowLeft, ShieldAlert, Sparkles, MapPin, Gauge } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const { id: chatId } = useParams() as { id: string };
  
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Datos del agente
  const [character, setCharacter] = useState<any>(null);
  
  // Lista de mensajes en la conversación
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  
  // Estados de streaming e inferencia
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [premiumModels, setPremiumModels] = useState('thedrummer/cydonia-24b-v4.1');
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);

  useEffect(() => {
    if (chatId) {
      const storedModel = localStorage.getItem(`chat_model_${chatId}`);
      if (storedModel) {
        setPremiumModels(storedModel);
      }
    }
  }, [chatId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final del chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedText]);

  useEffect(() => {
    async function loadChatAndAuth() {
      // 1. Validar autenticación
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Cargar perfil Premium
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', session.user.id)
        .single();
      const userPremium = !!profile?.is_premium;
      setIsPremium(userPremium);

      try {
        // 2. Obtener los detalles del chat y personaje
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .select('*, character:characters(*)')
          .eq('id', chatId)
          .eq('user_id', session.user.id)
          .single();

        if (chatError || !chat) {
          console.error('Chat error:', chatError);
          router.push('/');
          return;
        }

        setCharacter(chat.character);

        // 3. Cargar el histórico de mensajes
        const { data: chatMessages, error: msgError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        // Si es una conversación totalmente nueva (0 mensajes), insertamos el saludo inicial
        if (!chatMessages || chatMessages.length === 0) {
          const initialMsg = {
            chat_id: chatId,
            sender: 'assistant',
            text: chat.character.initial_greeting,
            intimacy_score: 0.0
          };

          const { data: insertedMsg, error: insertError } = await supabase
            .from('chat_messages')
            .insert(initialMsg)
            .select()
            .single();

          if (insertError) throw insertError;
          setMessages([insertedMsg]);
        } else {
          setMessages(chatMessages);
        }

      } catch (err) {
        console.error('Error loading chat:', err);
        alert('Ocurrió un error al cargar la conversación.');
      } finally {
        setLoading(false);
      }
    }

    if (chatId) {
      loadChatAndAuth();
    }
  }, [chatId, router]);

  // Enviar mensaje e iniciar stream SSE
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming || !user) return;

    const messageToSend = inputText.trim();
    setInputText('');

    // 1. Agregar mensaje del usuario localmente para actualización instantánea de la UI
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      text: messageToSend,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    
    setIsStreaming(true);
    setStreamedText('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 2. Hacer POST a la ruta de streaming de Next.js
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          chatId,
          messageText: messageToSend,
          model: premiumModels
        })
      });

      if (!response.ok) {
        throw new Error('Error al conectar con la API de streaming de chat.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let bufferText = '';

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();

            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              const dataObj = JSON.parse(dataStr);
              const content = dataObj.choices?.[0]?.delta?.content || '';
              bufferText += content;
              setStreamedText(bufferText);
            } catch (e) {
              // Omitir errores de JSON parciales
            }
          }
        }
      }

      // 3. Finalizar streaming y recargar los mensajes desde la base de datos para sincronizar ids reales
      const { data: freshMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (freshMessages) {
        setMessages(freshMessages);
      }

    } catch (err) {
      console.error('Error during streaming chat:', err);
      alert('Error de conexión al chatear.');
    } finally {
      setIsStreaming(false);
      setStreamedText('');
    }
  };

  const handleGenerateScene = async () => {
    if (isGeneratingScene || !user) return;
    
    setIsGeneratingScene(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const response = await fetch('/api/character/generate-scene', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ chatId })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al generar la escena.');
      }
      
      const data = await response.json();
      
      // Añadir la escena generada al feed de mensajes
      setMessages(prev => [...prev, data.message]);
      
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al generar la escena con IA.');
    } finally {
      setIsGeneratingScene(false);
    }
  };

  // Renderizador básico de cursivas para el Roleplay (*acción*)
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    
    // Split en asteriscos
    const parts = text.split(/(\*.*?\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={index} className="text-zinc-400 font-light italic tracking-wide">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-50"></div>
      </div>
    );
  }

  const isLockMessage = (text: string) => text.includes('🔒');

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 h-[calc(100dvh-56px)] justify-between font-sans">
      {/* Header del Chat */}
      <div className="border-b border-zinc-850 bg-zinc-900/10 px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/')}
            className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          
          <img
            src={character.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop'}
            alt={character.name}
            onClick={() => { setModalImageUrl(character.avatar_url); setShowImageModal(true); }}
            className="h-9 w-9 rounded-lg object-cover border border-zinc-800 cursor-pointer hover:border-pink-500/50 transition-all duration-200"
            title="Ver imagen en grande"
          />
          <div>
            <h2 className="text-sm font-semibold text-zinc-50 leading-tight">{character.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500">
              <span className="flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" />
                {character.default_country}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Gauge className="h-2.5 w-2.5" />
                Clímax: {character.climax_speed || 'Standard'}
              </span>
            </div>
          </div>
        </div>

        {/* Modelo Selector (Solo Premium) */}
        {isPremium && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-semibold tracking-wide flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-zinc-400" />
              MODELO:
            </span>
            <select
              value={premiumModels}
              onChange={(e) => {
                const selected = e.target.value;
                setPremiumModels(selected);
                localStorage.setItem(`chat_model_${chatId}`, selected);
              }}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 focus:outline-hidden"
            >
              <option value="thedrummer/cydonia-24b-v4.1">Cydonia 24B (RP Diario)</option>
              <option value="openai/gpt-oss-120b">GPT-OSS 120B (Inteligencia)</option>
              <option value="sao10k/l3.3-euryale-70b">Euryale 70B (Descriptivo)</option>
            </select>
          </div>
        )}
      </div>

      {/* Feed de Conversación */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const locked = isLockMessage(msg.text);
            
            const isImage = msg.text.startsWith('![Escena](');
            let imageUrl = '';
            if (isImage) {
              const match = msg.text.match(/\!\[Escena\]\((.*?)\)/);
              if (match) imageUrl = match[1];
            }

            return (
              <div 
                key={msg.id} 
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] ${isImage ? 'p-1.5' : 'px-4 py-3'} text-sm leading-relaxed border ${
                  isUser 
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-100 rounded-2xl rounded-tr-none shadow-sm' 
                    : locked 
                    ? 'bg-pink-950/15 border-pink-900/40 text-pink-300 rounded-2xl rounded-tl-none shadow-sm'
                    : 'bg-purple-950/10 border border-purple-900/25 text-zinc-100 rounded-2xl rounded-tl-none shadow-[0_2px_8px_rgba(139,92,246,0.02)]'
                }`}>
                  {/* Avatar miniatura para el bot si no es el usuario */}
                  {!isUser && !locked && (
                    <div className="text-[10px] font-bold text-purple-400/80 mb-1.5 px-2 tracking-tight uppercase">
                      {character.name}
                    </div>
                  )}

                  {/* Texto formateado o Imagen */}
                  {isImage ? (
                    <div className="flex flex-col items-center">
                      <img 
                        src={imageUrl} 
                        alt="Escena generada" 
                        className="rounded-xl max-h-[350px] max-w-full object-contain cursor-pointer border border-zinc-850 hover:border-pink-500/30 transition-colors"
                        onClick={() => {
                          setModalImageUrl(imageUrl);
                          setShowImageModal(true);
                        }}
                      />
                      <span className="text-[10px] text-zinc-500 mt-1.5 px-2 pb-1 font-semibold italic flex items-center gap-1">
                        📸 Escena generada por IA (Clic para ampliar)
                      </span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-line font-medium">
                      {renderFormattedText(msg.text)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Mensaje en Streaming activo */}
          {isStreaming && streamedText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] px-4 py-3 text-sm leading-relaxed bg-purple-950/10 border border-purple-900/25 text-zinc-100 rounded-2xl rounded-tl-none shadow-[0_2px_8px_rgba(139,92,246,0.02)]">
                <div className="text-[10px] font-bold text-purple-400/80 mb-1.5 tracking-tight uppercase">
                  {character.name}
                </div>
                <div className="whitespace-pre-line font-medium">
                  {renderFormattedText(streamedText)}
                  <span className="inline-block h-4 w-1.5 ml-0.5 bg-pink-400 animate-pulse"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input de Mensajes */}
      <div className="border-t border-zinc-900/80 p-4 bg-zinc-950/50 backdrop-blur-xs">
        <div className="max-w-3xl mx-auto">
          {/* Si el último mensaje es el paywall del cliffhanger, mostramos advertencia y bloqueamos input */}
          {messages.length > 0 && isLockMessage(messages[messages.length - 1].text) ? (
            <div className="rounded-2xl border border-pink-900/40 bg-pink-950/15 p-5 text-center shadow-[0_0_15px_rgba(236,72,153,0.05)]">
              <p className="text-sm font-semibold text-pink-400 flex items-center justify-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-pink-400" />
                Se requiere Cuenta Premium
              </p>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-md mx-auto">
                Has alcanzado el clímax narrativo. Puedes activar el simulador Premium en tu perfil para continuar chateando con {character.name}.
              </p>
              <button
                onClick={() => router.push('/profile')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-neon-brand text-zinc-50 px-4 py-2 text-xs font-bold shadow-[0_0_10px_rgba(236,72,153,0.2)] hover:opacity-90 transition-all cursor-pointer"
              >
                <Sparkles className="h-3 w-3 fill-zinc-50" />
                Activar Premium en Perfil
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2.5 items-center">
              <input
                type="text"
                disabled={isStreaming}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Envía un mensaje a ${character.name}...`}
                className="block flex-1 rounded-full border border-zinc-800 bg-zinc-900/40 px-5 py-3 text-zinc-100 placeholder:text-zinc-550 focus:border-pink-500/50 focus:outline-hidden focus:ring-1 focus:ring-pink-500/20 text-base transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isStreaming || !inputText.trim()}
                className="inline-flex items-center justify-center rounded-full bg-neon-brand p-3 text-zinc-50 shadow-[0_0_10px_rgba(236,72,153,0.25)] hover:opacity-95 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
              >
                <Send className="h-4 w-4 fill-zinc-50" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Modal para ver la imagen en grande */}
      {showImageModal && character && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 transition-all duration-300 animate-fadeIn"
          onClick={() => setShowImageModal(false)}
        >
          <div 
            className="relative max-w-md w-full flex flex-col items-center p-4 bg-zinc-950/70 border border-zinc-850/60 rounded-3xl shadow-[0_0_50px_rgba(236,72,153,0.15)]"
            onClick={(e) => e.stopPropagation()} // Evitar cerrar al hacer click dentro
          >
            {/* Botón de cerrar */}
            <button 
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-50 font-bold bg-zinc-900/80 border border-zinc-800 rounded-full h-8 w-8 flex items-center justify-center cursor-pointer transition-colors"
              onClick={() => setShowImageModal(false)}
            >
              ✕
            </button>
            <img
              src={modalImageUrl || character.avatar_url}
              alt={character.name}
              className="max-h-[60vh] max-w-full rounded-2xl object-contain border border-zinc-850"
            />
            <div className="mt-4 text-center">
              <h3 className="text-lg font-black text-zinc-50">{character.name}</h3>
              <p className="text-xs text-zinc-400 mt-1.5 px-2 leading-relaxed">
                {modalImageUrl === character.avatar_url 
                  ? character.personality_description 
                  : "Escena generada por IA basada en tu chat."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
