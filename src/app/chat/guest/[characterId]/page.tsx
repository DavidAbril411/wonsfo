'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Send, ArrowLeft, ShieldAlert, Sparkles, MapPin, Gauge, MessageSquare, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function GuestChatPage() {
  const router = useRouter();
  const { characterId } = useParams() as { characterId: string };

  const [character, setCharacter] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final del chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedText]);

  // Cargar personaje y mensajes previos de localStorage
  useEffect(() => {
    async function loadData() {
      if (!characterId) return;

      // 1. Obtener detalles del personaje de forma pública
      const { data: char, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (error || !char) {
        console.error('Error fetching character:', error);
        router.push('/');
        return;
      }

      setCharacter(char);

      // 2. Cargar mensajes de localStorage o iniciar con saludo
      const stored = localStorage.getItem(`guest_chat_${characterId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setMessages(parsed);
          
          // Si ya tiene 5 o más mensajes del usuario, mostrar paywall modal al cargar
          const userMsgs = parsed.filter((m: any) => m.sender === 'user');
          if (userMsgs.length >= 5) {
            setShowPaywallModal(true);
          }
        } catch (e) {
          console.error("Failed to parse stored chat", e);
        }
      } else {
        // Inicializar con el saludo del personaje
        const initial = [
          {
            id: 'initial',
            sender: 'assistant',
            text: char.initial_greeting,
            created_at: new Date().toISOString()
          }
        ];
        setMessages(initial);
        localStorage.setItem(`guest_chat_${characterId}`, JSON.stringify(initial));
      }
      setLoading(false);
    }
    
    loadData();
  }, [characterId, router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming || !character) return;

    // Verificar si ya envió 5 mensajes del usuario
    const userMsgs = messages.filter(m => m.sender === 'user');
    if (userMsgs.length >= 5) {
      setShowPaywallModal(true);
      return;
    }

    const userMsgText = inputText.trim();
    setInputText('');

    const newMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      created_at: new Date().toISOString()
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    localStorage.setItem(`guest_chat_${characterId}`, JSON.stringify(updatedMessages));

    // Si este mensaje es el 5to del usuario, bloquear inmediatamente después de guardarlo
    if (userMsgs.length + 1 >= 5) {
      setShowPaywallModal(true);
      return;
    }

    // Streaming del bot
    setIsStreaming(true);
    setStreamedText('');

    try {
      const response = await fetch('/api/chat/guest-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          characterId,
          messages: updatedMessages
        })
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            const cleaned = line.trim();
            if (cleaned === 'data: [DONE]') break;

            if (cleaned.startsWith('data: ')) {
              try {
                const dataObj = JSON.parse(cleaned.slice(6));
                const content = dataObj.choices?.[0]?.delta?.content || '';
                assistantText += content;
                setStreamedText(assistantText);
              } catch (err) {
                // Parciales JSON omitidos
              }
            }
          }
        }
      }

      // Guardar mensaje completo en el historial
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: assistantText,
        created_at: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      localStorage.setItem(`guest_chat_${characterId}`, JSON.stringify(finalMessages));

    } catch (error) {
      console.error('Error sending guest message:', error);
      alert('Ocurrió un error al enviar el mensaje.');
    } finally {
      setIsStreaming(false);
      setStreamedText('');
    }
  };

  const handleGoogleSignup = async () => {
    try {
      // Indicamos a dónde volver y activamos flujo
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      alert(err.message || 'Error al registrarse con Google.');
    }
  };

  // Formateador simple de cursiva
  const renderFormattedText = (text: string) => {
    if (!text) return null;
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

  if (loading || !character) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-950 min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-50"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 h-screen justify-between font-sans">
      {/* Header */}
      <div className="border-b border-zinc-850 bg-zinc-900/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/')}
            className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          
          <img
            src={character.avatar_url}
            alt={character.name}
            className="h-9 w-9 rounded-lg object-cover border border-zinc-800"
          />
          <div>
            <h2 className="text-sm font-semibold text-zinc-50 leading-tight">{character.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-pink-400 font-bold uppercase tracking-wider">
              <span>MODO INVITADO (GUEST CHAT)</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push(`/login?characterId=${characterId}`)}
          className="rounded-xl border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-900/80 px-3.5 py-1.5 text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition-colors"
        >
          <LogIn className="h-3.5 w-3.5" />
          Registrarse
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div 
                key={msg.id} 
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-center`}
              >
                <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed border ${
                  isUser 
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-100 rounded-2xl rounded-tr-none shadow-sm' 
                    : 'bg-purple-950/10 border border-purple-900/25 text-zinc-100 rounded-2xl rounded-tl-none shadow-[0_2px_8px_rgba(139,92,246,0.02)]'
                }`}>
                  {!isUser && (
                    <div className="text-[10px] font-bold text-purple-400/80 mb-1.5 px-2 tracking-tight uppercase">
                      {character.name}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap font-sans text-zinc-150 tracking-normal antialiased">
                    {renderFormattedText(msg.text)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* streaming bubble */}
          {isStreaming && streamedText && (
            <div className="flex justify-start items-center">
              <div className="max-w-[85%] px-4 py-3 text-sm leading-relaxed border bg-purple-950/10 border-purple-900/25 text-zinc-100 rounded-2xl rounded-tl-none">
                <div className="text-[10px] font-bold text-purple-400/80 mb-1.5 px-2 tracking-tight uppercase">
                  {character.name}
                </div>
                <div className="whitespace-pre-wrap font-sans text-zinc-150 tracking-normal antialiased">
                  {renderFormattedText(streamedText)}
                  <span className="inline-block h-4 w-1.5 ml-0.5 bg-pink-400 animate-pulse"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-900/80 p-4 bg-zinc-950/50 backdrop-blur-xs">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2.5 items-center">
            <input
              type="text"
              disabled={isStreaming}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Chatea gratis como invitado con ${character.name}...`}
              className="block flex-1 rounded-full border border-zinc-800 bg-zinc-900/40 px-5 py-3 text-zinc-100 placeholder:text-zinc-550 focus:border-pink-500/50 focus:outline-hidden focus:ring-1 focus:ring-pink-500/20 text-base transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isStreaming || !inputText.trim()}
              className="inline-flex items-center justify-center rounded-full bg-neon-brand p-3 text-zinc-50 shadow-[0_0_10px_rgba(236,72,153,0.25)] hover:opacity-95 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Paywall Modal */}
      {showPaywallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-pink-500/20 bg-zinc-900 p-6 text-center shadow-2xl shadow-pink-500/5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pink-950/30 border border-pink-900/40">
              <ShieldAlert className="h-6 w-6 text-pink-400" />
            </div>
            
            <h3 className="mt-4 text-lg font-bold text-zinc-100">
              ¡Prueba de 5 Mensajes Completada! 🪙
            </h3>
            
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Has agotado tus 5 mensajes gratuitos de prueba con {character.name}. Registrate ahora en 1 segundo usando Google para continuar esta conversación sin perder tus mensajes, y te regalaremos <strong>5 Tokens de bienvenida 🪙</strong>.
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleGoogleSignup}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-100 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.44 0-6.228-2.77-6.228-6.19s2.788-6.19 6.228-6.19c1.55 0 2.96.57 4.05 1.51l3.05-3.05C18.66 2.03 15.65 1 12.24 1 6.03 1 1 6.03 1 12.24s5.03 11.24 11.24 11.24c6.36 0 11.39-4.47 11.39-11.24 0-.76-.08-1.5-.23-1.955H12.24z"/>
                </svg>
                Continuar con Google
              </button>

              <button
                onClick={() => router.push(`/login?characterId=${characterId}`)}
                className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 py-3 text-sm font-bold text-zinc-50 shadow-md hover:opacity-90 transition-opacity"
              >
                Registrarse con Correo
              </button>

              <button
                onClick={() => router.push('/')}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-400 block mx-auto transition-colors"
              >
                Volver a Explora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
