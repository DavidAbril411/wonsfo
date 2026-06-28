'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Send, ArrowLeft, ShieldAlert, Sparkles, MapPin, Gauge, Pencil, RotateCcw, Trash2, X, Coins } from 'lucide-react';

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
  const [isZoomed, setIsZoomed] = useState(false);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [tokens, setTokens] = useState(0);

  // Estados de edición y control de chat
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInputText, setEditInputText] = useState('');

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

      // Cargar perfil Premium y tokens
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium, tokens, unlimited_tokens')
        .eq('id', session.user.id)
        .single();
      const userPremium = !!profile?.is_premium || !!profile?.unlimited_tokens;
      setIsPremium(userPremium);
      setTokens(profile?.tokens || 0);

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

        if (chat.model) {
          if (chat.model === 'openai/gpt-oss-120b') {
            const fallbackModel = 'thedrummer/skyfall-36b-v2';
            setPremiumModels(fallbackModel);
            localStorage.setItem(`chat_model_${chatId}`, fallbackModel);
            // Migrate in background to avoid blocking
            supabase
              .from('chats')
              .update({ model: fallbackModel })
              .eq('id', chatId)
              .then(({ error }) => {
                if (error) console.error('Error migrating model:', error);
              });
          } else {
            setPremiumModels(chat.model);
            localStorage.setItem(`chat_model_${chatId}`, chat.model);
          }
        }

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

  const syncMessagesFromDB = async () => {
    try {
      const { data: freshMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (freshMessages) {
        setMessages(freshMessages);
      }
    } catch (e) {
      console.error('Error reloading messages:', e);
    }
  };

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
      await syncMessagesFromDB();

    } catch (err) {
      console.error('Error during streaming chat:', err);
      alert('Error de conexión al chatear.');
      await syncMessagesFromDB();
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
      
      if (data.prompt) {
        console.log("Prompt enviado a Pollinations para la escena:", data.prompt);
      }
      
      // Añadir la escena generada al feed de mensajes
      setMessages(prev => [...prev, data.message]);
      
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al generar la escena con IA.');
    } finally {
      setIsGeneratingScene(false);
    }
  };

  const startEditing = (msgId: string, text: string) => {
    setEditingMessageId(msgId);
    setEditInputText(text);
  };

  const saveEditedMessage = async (msgId: string, createdAt: string) => {
    if (!editInputText.trim() || isStreaming || !user) return;

    const newText = editInputText.trim();
    setEditingMessageId(null);

    if (!confirm('¿Editar este mensaje? Esto borrará todas las respuestas posteriores en la conversación.')) {
      return;
    }

    try {
      // 1. Eliminar el mensaje editado y todo lo posterior de la base de datos
      const { error: deleteError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('chat_id', chatId)
        .gte('created_at', createdAt);

      if (deleteError) throw deleteError;

      // 2. Actualizar estado local (quedar con los mensajes anteriores)
      const msgIndex = messages.findIndex(m => m.id === msgId);
      const keptMessages = messages.slice(0, msgIndex);
      setMessages(keptMessages);

      // 3. Iniciar el streaming enviando el nuevo texto
      setIsStreaming(true);
      setStreamedText('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          chatId,
          messageText: newText,
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

      // 4. Recargar mensajes actualizados
      await syncMessagesFromDB();

    } catch (err) {
      console.error('Error during editing message:', err);
      alert('Error de conexión al guardar el mensaje editado.');
      await syncMessagesFromDB();
    } finally {
      setIsStreaming(false);
      setStreamedText('');
    }
  };

  const handleRegenerate = async (assistantMsgId: string) => {
    if (isStreaming || !user) return;

    // 1. Encontrar el índice del mensaje del asistente
    const assistantIndex = messages.findIndex(m => m.id === assistantMsgId);
    if (assistantIndex === -1) return;

    // 2. Encontrar el mensaje del usuario inmediatamente anterior
    let userMsgIndex = -1;
    for (let i = assistantIndex - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        userMsgIndex = i;
        break;
      }
    }

    if (userMsgIndex === -1) {
      alert('No se encontró el mensaje del usuario anterior para regenerar la respuesta.');
      return;
    }

    const userMsg = messages[userMsgIndex];

    if (!confirm(`¿Regenerar la respuesta de ${character.name}?`)) {
      return;
    }

    try {
      // 3. Eliminar ambos mensajes (y cualquier mensaje posterior) de la base de datos
      const { error: deleteError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('chat_id', chatId)
        .gte('created_at', userMsg.created_at);

      if (deleteError) throw deleteError;

      // 4. Actualizar estado local (quedar con los mensajes anteriores al del usuario)
      const keptMessages = messages.slice(0, userMsgIndex);
      setMessages(keptMessages);

      // 5. Iniciar la regeneración enviando el texto del usuario
      setIsStreaming(true);
      setStreamedText('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          chatId,
          messageText: userMsg.text,
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

      // 6. Recargar mensajes actualizados
      await syncMessagesFromDB();

    } catch (err) {
      console.error('Error during regeneration:', err);
      alert('Error de conexión al regenerar.');
      await syncMessagesFromDB();
    } finally {
      setIsStreaming(false);
      setStreamedText('');
    }
  };

  const handleDeleteImage = async (msgId: string) => {
    if (!confirm('¿Seguro que deseas borrar esta escena del chat?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', msgId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      console.error('Error deleting image:', err);
      alert('Error al borrar la imagen del chat.');
    }
  };

  const handleDeleteChat = async () => {
    if (!confirm('¿Seguro que deseas borrar TODA la conversación? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;

      router.push('/');
    } catch (err) {
      console.error('Error deleting chat:', err);
      alert('Error al borrar la conversación.');
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

  const handleUnlockClimax = async () => {
    setIsUnlocking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/chat/unlock-climax', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ chatId })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Recargar los mensajes de la base de datos
        await syncMessagesFromDB();
        
        // Actualizar el estado local de tokens
        if (data.tokensLeft !== undefined) {
          setTokens(data.tokensLeft);
        }
      } else {
        alert(data.error || 'Error al desbloquear el clímax.');
      }
    } catch (err: any) {
      console.error('Error unlocking climax:', err);
      alert('Error inesperado al desbloquear el clímax.');
    } finally {
      setIsUnlocking(false);
    }
  };

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

        <div className="flex items-center gap-3">
          {/* Modelo Selector (Solo Premium) */}
          {isPremium && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-semibold tracking-wide flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-zinc-400" />
                MODELO:
              </span>
              <select
                value={premiumModels}
                onChange={async (e) => {
                  const selected = e.target.value;
                  setPremiumModels(selected);
                  localStorage.setItem(`chat_model_${chatId}`, selected);
                  // Persistir en base de datos
                  await supabase
                    .from('chats')
                    .update({ model: selected })
                    .eq('id', chatId);
                }}
                className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 focus:outline-hidden"
              >
                <option value="thedrummer/cydonia-24b-v4.1">Cydonia 24B (RP Diario)</option>
                <option value="thedrummer/skyfall-36b-v2">Skyfall 36B (Creativo)</option>
                <option value="sao10k/l3.3-euryale-70b">Euryale 70B (Descriptivo)</option>
              </select>
            </div>
          )}

          {/* Botón Borrar Conversación */}
          <button
            onClick={handleDeleteChat}
            className="rounded-md p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors"
            title="Borrar conversación entera"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
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

            const isLastMsg = messages[messages.length - 1]?.id === msg.id;

            return (
              <div 
                key={msg.id} 
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-center gap-2 group`}
              >
                {/* Botones de acción a la izquierda para mensajes del usuario */}
                {isUser && !isStreaming && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => startEditing(msg.id, msg.text)}
                      className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-md hover:bg-zinc-900 transition-colors"
                      title="Editar mensaje"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

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

                  {/* Texto formateado, editor, o Imagen */}
                  {editingMessageId === msg.id ? (
                    <div className="flex flex-col gap-2 min-w-[220px]">
                      <textarea
                        value={editInputText}
                        onChange={(e) => setEditInputText(e.target.value)}
                        className="w-full bg-zinc-950 text-zinc-100 border border-zinc-850 rounded-xl p-2 text-sm focus:outline-hidden focus:border-pink-500/60"
                        rows={3}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setEditingMessageId(null)}
                          className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg hover:bg-zinc-950/65 transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => saveEditedMessage(msg.id, msg.created_at)}
                          className="px-2.5 py-1 text-xs bg-pink-650 hover:bg-pink-700 text-zinc-50 rounded-lg transition-all font-bold"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : isImage ? (
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

                {/* Botones de acción a la derecha para mensajes del bot */}
                {!isUser && !isStreaming && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {!locked && !isImage && isLastMsg && (
                      <button
                        onClick={() => handleRegenerate(msg.id)}
                        className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-md hover:bg-zinc-900 transition-colors"
                        title="Regenerar respuesta"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isImage && (
                      <button
                        onClick={() => handleDeleteImage(msg.id)}
                        className="text-zinc-500 hover:text-red-400 p-1.5 rounded-md hover:bg-zinc-900 transition-colors"
                        title="Borrar imagen del chat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
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
                Clímax Narrativo Alcanzado 🪙
              </p>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-md mx-auto">
                Has llegado al momento de mayor tensión en la historia con {character.name}. Desbloquea este clímax por <strong>5 Tokens</strong> para continuar chateando libremente.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleUnlockClimax}
                  disabled={isUnlocking}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-neon-brand text-zinc-50 px-5 py-2.5 text-xs font-bold shadow-[0_0_10px_rgba(236,72,153,0.2)] hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Coins className="h-3.5 w-3.5 fill-zinc-50" />
                  {isUnlocking ? 'Desbloqueando...' : 'Desbloquear por 5 Tokens'}
                </button>
                <button
                  onClick={() => router.push('/profile')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/30 text-zinc-300 px-5 py-2.5 text-xs font-bold hover:bg-zinc-900/60 transition-all cursor-pointer"
                >
                  Comprar Tokens
                </button>
              </div>
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
              {isPremium && character?.personality_description?.includes('<!-- METADATA:') && (
                <button
                  type="button"
                  disabled={isGeneratingScene || isStreaming || messages.length === 0}
                  onClick={handleGenerateScene}
                  className="inline-flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 p-3 text-zinc-400 hover:text-pink-400 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 cursor-pointer shadow-md"
                  title="Generar imagen de la escena actual con IA"
                >
                  {isGeneratingScene ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-800 border-t-pink-500"></div>
                  ) : (
                    "📸"
                  )}
                </button>
              )}

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
          onClick={() => { setShowImageModal(false); setIsZoomed(false); }}
        >
          <div 
            className="relative max-w-4xl w-full flex flex-col items-center p-4 bg-zinc-950/70 border border-zinc-850/60 rounded-3xl shadow-[0_0_50px_rgba(236,72,153,0.15)]"
            onClick={(e) => e.stopPropagation()} // Evitar cerrar al hacer click dentro
          >
            {/* Botón de cerrar */}
            <button 
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-50 font-bold bg-zinc-900/80 border border-zinc-800 rounded-full h-8 w-8 flex items-center justify-center cursor-pointer transition-colors z-10"
              onClick={() => { setShowImageModal(false); setIsZoomed(false); }}
            >
              ✕
            </button>
            <div className="relative w-full overflow-auto max-h-[70vh] flex items-center justify-center rounded-2xl border border-zinc-850 bg-zinc-950/20">
              <img
                src={modalImageUrl || character.avatar_url}
                alt={character.name}
                className={`transition-all duration-300 origin-center ${
                  isZoomed 
                    ? 'cursor-zoom-out max-h-[140vh] max-w-[140vw] scale-150 my-16 mx-16 rounded-xl' 
                    : 'cursor-zoom-in max-h-[65vh] max-w-full object-contain rounded-2xl'
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
              />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-black text-zinc-50">{character.name}</h3>
              <p className="text-xs text-zinc-400 mt-1.5 px-2 leading-relaxed">
                {modalImageUrl === character.avatar_url 
                  ? character.personality_description.replace(/<!-- METADATA: (\{.*?\}) -->/, '')
                  : "Escena generada por IA basada en tu chat. Clic en la imagen para ampliar/reducir."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
