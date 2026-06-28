import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { evaluateMessageIntimacy } from '@/lib/climax-engine';

export async function POST(request: NextRequest) {
  try {
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

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'Falta la API Key de OpenRouter.' }, { status: 500 });
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

    // Usar el modelo por defecto de Airforce para chats no NSFW de invitados
    // (o el modelo estándar rápido)
    const modelToUse = process.env.AIRFORCE_REAL_MODEL || 'flux-2-klein-9b';

    // 4. Llamar a OpenRouter para streaming
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterApiKey}`,
        'HTTP-Referer': 'https://wonsfo.com',
        'X-Title': 'Wonsfo Guest Chat'
      },
      body: JSON.stringify({
        model: 'cognitivecomputations/dolphin-mixtral-8x7b', // Modelo rápido e inteligente para rol libre
        messages: formattedMessages,
        stream: true,
        temperature: 0.88,
        max_tokens: 450
      })
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
