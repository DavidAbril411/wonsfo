'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function RedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterId = searchParams.get('characterId');

  useEffect(() => {
    async function handleRedirect() {
      if (!characterId) {
        router.push('/');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Redirigir al chat de invitado si no está autenticado
        router.push(`/chat/guest/${characterId}`);
        return;
      }

      try {
        // 1. Verificar si ya existe un chat activo con este personaje
        const { data: existingChat } = await supabase
          .from('chats')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('character_id', characterId)
          .limit(1)
          .single();

        if (existingChat) {
          router.push(`/chat/${existingChat.id}`);
          return;
        }

        // 2. Si no existe, crear un nuevo chat
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert({
            user_id: session.user.id,
            character_id: characterId
          })
          .select()
          .single();

        if (error) throw error;
        router.push(`/chat/${newChat.id}`);
      } catch (err) {
        console.error('Error in chat-redirect:', err);
        router.push('/');
      }
    }

    handleRedirect();
  }, [characterId, router]);

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-50"></div>
    </div>
  );
}

export default function ChatRedirectPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-50"></div>
      </div>
    }>
      <RedirectHandler />
    </Suspense>
  );
}
