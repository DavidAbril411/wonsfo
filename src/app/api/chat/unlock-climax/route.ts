import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { TOKEN_COSTS } from '@/lib/token-costs';

export async function POST(request: NextRequest) {
  try {
    const { chatId } = await request.json();

    if (!chatId) {
      return NextResponse.json({ error: 'Falta el parámetro chatId.' }, { status: 400 });
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

    // 2. Verificar saldo de tokens
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tokens, unlimited_tokens')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'No se pudo cargar el perfil de usuario.' }, { status: 500 });
    }

    const { tokens = 0, unlimited_tokens = false } = profile;
    const cost = TOKEN_COSTS.UNLOCK_CLIMAX;

    if (!unlimited_tokens && tokens < cost) {
      return NextResponse.json({ 
        error: `Tokens insuficientes. Desbloquear el clímax cuesta ${cost} tokens, pero tienes ${tokens}.` 
      }, { status: 403 });
    }

    // 3. Descontar tokens si no es ilimitado
    if (!unlimited_tokens) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ tokens: Math.max(0, tokens - cost) })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Error al debitar tokens: ${updateError.message}`);
      }
    }

    // 4. Resetear la tensión acumulada en este chat (establecer scores de intimidad anteriores a 0)
    const { error: resetError } = await supabaseAdmin
      .from('chat_messages')
      .update({ intimacy_score: 0 })
      .eq('chat_id', chatId);

    if (resetError) {
      console.error('Error resetting intimacy scores on unlock:', resetError);
      // Continuamos de todas formas ya que los tokens fueron debitados
    }

    // 5. Opcional: Insertar un mensaje del sistema indicando que la escena fue desbloqueada
    const { data: systemMsg, error: insertError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender: 'assistant',
        text: `✨ **[SISTEMA]** Escena desbloqueada con éxito usando tokens. ¡La conversación continúa!`,
        intimacy_score: 0
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      tokensLeft: unlimited_tokens ? 999999 : tokens - cost,
      systemMessage: systemMsg
    });

  } catch (error: any) {
    console.error('Error unlocking climax:', error);
    return NextResponse.json({ error: `Error al desbloquear el clímax: ${error.message}` }, { status: 500 });
  }
}
