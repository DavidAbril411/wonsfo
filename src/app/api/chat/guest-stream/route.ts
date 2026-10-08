import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { evaluateMessageIntimacy } from '@/lib/climax-engine';
import { CHAT_MODELS, buildModelChain, openRouterChat } from '@/lib/llm-models';
import { getClientIp, isRateLimited } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Endpoint sin autenticación: limitar por IP para que no se use como LLM gratis.
    // Sin IP (proxy que no envía X-Forwarded-For) no se limita: un bucket compartido bloquearía a todos.
    const clientIp = getClientIp(request.headers);
    if (clientIp === 'unknown') {
      console.warn('guest-stream: sin IP de cliente, rate limit desactivado. Configurar X-Forwarded-For en nginx.');
    } else if (isRateLimited(`guest:${clientIp}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json({
        error: 'Demasiados mensajes como invitado. Regístrate gratis para seguir chateando.'
      }, { status: 429 });
    }

    const { characterId, messages } = await request.json();

    if (!characterId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 });
    }

    // 1. Validar que es un chat de invitado y no tiene más de 5 mensajes del usuario
    const userMessages = messages.filter(m => m.sender === 'user');
    if (userMessages.length >= 5) {
      return NextResponse.json({ 
        error: 'Límite de chat de invitado alcanzado. Por favor regístrate para continuar.' 
      }, { status: 403 });
    }

    // 2. Obtener detalles del personaje
    const { data: character, error: charError } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single();

    if (charError || !character) {
      return NextResponse.json({ error: 'Personaje no encontrado.' }, { status: 404 });
    }

    // 3. Preparar el historial de chat para OpenRouter
    const chatHistory = messages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    // System prompt del personaje
    const systemPrompt = `Eres ${character.name}. ${character.personality_description}\n\n` +
      `Instrucciones del Juego de Rol:\n` +
      `- Responde siempre manteniendo tu personalidad y el contexto indicado.\n` +
      `- Mantén tus respuestas en un tono inmersivo e interactivo.\n` +
      `- El usuario se llama "Invitado". Dirígete a él de forma neutra y natural.`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory
    ];

    // 4. Llamar a OpenRouter para streaming (con fallback nativo entre modelos)
    const openrouterResponse = await openRouterChat({
      models: buildModelChain(CHAT_MODELS.FREE, false),
      messages: formattedMessages,
      title: 'Wonsfo Guest Chat',
      stream: true,
      temperature: 0.88,
      maxTokens: 450
    });

    if (!openrouterResponse.ok) {
      const errText = await openrouterResponse.text();
      throw new Error(`OpenRouter API error: ${errText}`);
    }

    // 5. Configurar respuesta de Streaming SSE
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = openrouterResponse.body?.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!reader) {
            controller.close();
            return;
          }

          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const cleanedLine = line.trim();
              if (!cleanedLine) continue;

              if (cleanedLine === 'data: [DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                break;
              }

              if (cleanedLine.startsWith('data: ')) {
                const dataStr = cleanedLine.slice(6);
                try {
                  const dataObj = JSON.parse(dataStr);
                  const content = dataObj.choices?.[0]?.delta?.content || '';
                  
                  const outboundObj = {
                    choices: [{ delta: { content } }]
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(outboundObj)}\n\n`));
                } catch (e) {
                  // Omitir errores de JSON parciales
                }
              }
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    console.error('Error in guest streaming:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
