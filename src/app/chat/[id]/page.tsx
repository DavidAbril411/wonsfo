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
    <div className="flex flex-1 flex-col bg-zinc-950 h-[calc(100vh-56px)] justify-between font-sans">
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
            className="h-9 w-9 rounded-lg object-cover border border-zinc-800"
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
              onChange={(e) => setPremiumModels(e.target.value)}
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
            
            return (
              <div 
                key={msg.id} 
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed border ${
                  isUser 
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-150' 
                    : locked 
                    ? 'bg-red-950/10 border-red-900/40 text-red-300'
                    : 'bg-transparent border-transparent text-zinc-200'
                }`}>
                  {/* Avatar miniatura para el bot si no es el usuario */}
                  {!isUser && !locked && (
                    <div className="text-[10px] font-bold text-zinc-500 mb-1 tracking-tight">
                      {character.name}
                    </div>
                  )}

                  {/* Texto formateado */}
                  <div className="whitespace-pre-line">
                    {renderFormattedText(msg.text)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Mensaje en Streaming activo */}
          {isStreaming && streamedText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed bg-transparent border-transparent text-zinc-200">
                <div className="text-[10px] font-bold text-zinc-500 mb-1 tracking-tight">
                  {character.name}
                </div>
                <div className="whitespace-pre-line">
                  {renderFormattedText(streamedText)}
                  <span className="inline-block h-4 w-1.5 ml-0.5 bg-zinc-400 animate-pulse"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input de Mensajes */}
      <div className="border-t border-zinc-850 p-4 bg-zinc-900/5">
        <div className="max-w-3xl mx-auto">
          {/* Si el último mensaje es el paywall del cliffhanger, mostramos advertencia y bloqueamos input */}
          {messages.length > 0 && isLockMessage(messages[messages.length - 1].text) ? (
            <div className="rounded-lg border border-red-900/30 bg-red-950/15 p-4 text-center">
              <p className="text-sm font-semibold text-red-400 flex items-center justify-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                Se requiere Cuenta Premium
              </p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Has alcanzado el clímax narrativo. Puedes activar el simulador Premium en tu perfil para continuar chateando.
              </p>
              <button
                onClick={() => router.push('/profile')}
                className="mt-3.5 inline-flex items-center gap-1 rounded bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors"
              >
                Activar Premium en Perfil
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                disabled={isStreaming}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Envía un mensaje a ${character.name}...`}
                className="block flex-1 rounded-md border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-0 text-base transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isStreaming || !inputText.trim()}
                className="inline-flex items-center justify-center rounded-md bg-zinc-50 p-2.5 text-zinc-950 hover:bg-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
