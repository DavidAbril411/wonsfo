import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { characterId, messages } = await request.json();

    if (!characterId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 });
    }

    // 1. Validar autenticación
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado. Cabecera de autorización faltante.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 });
    }

    // 2. Verificar si ya existe un chat para este usuario y personaje
    let { data: chat, error: fetchChatError } = await supabaseAdmin
      .from('chats')
      .select('id')
      .eq('user_id', user.id)
      .eq('character_id', characterId)
      .limit(1)
      .single();

    let chatId = '';

    if (fetchChatError || !chat) {
      // Crear un chat nuevo
      const { data: newChat, error: createChatError } = await supabaseAdmin
        .from('chats')
        .insert({
          user_id: user.id,
          character_id: characterId
        })
        .select()
        .single();

      if (createChatError || !newChat) {
        throw new Error(`Error al crear chat: ${createChatError?.message}`);
      }
      chatId = newChat.id;
    } else {
      chatId = chat.id;
    }

    // 3. Verificar si el chat ya tiene mensajes. Si ya tiene, no migramos para no duplicar.
    const { count } = await supabaseAdmin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId);

    if (count && count > 0) {
      return NextResponse.json({ success: true, chatId, migrated: false });
    }

    // 4. Migrar los mensajes
    // Mapeamos los mensajes de local storage a las filas de la base de datos
    const dbMessages = messages.map((m, idx) => ({
      chat_id: chatId,
      sender: m.sender === 'user' ? 'user' : 'assistant',
      text: m.text,
      intimacy_score: 0.0, // empezamos en 0
      created_at: new Date(Date.now() - (messages.length - idx) * 1000).toISOString() // ordenados cronológicamente
    }));

    const { error: insertError } = await supabaseAdmin
      .from('chat_messages')
      .insert(dbMessages);

    if (insertError) {
      throw new Error(`Error al insertar mensajes migrados: ${insertError.message}`);
    }

    return NextResponse.json({ success: true, chatId, migrated: true });

  } catch (error: any) {
    console.error('Error migrating guest chat:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
