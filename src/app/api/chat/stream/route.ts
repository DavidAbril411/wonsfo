import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { evaluateMessageIntimacy, getClimaxMultiplier, shouldTriggerPaywall } from '@/lib/climax-engine';
import { processSpeechDialect, applyLocalLexicon } from '@/lib/dialect-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { chatId, messageText, model } = await request.json();

    if (!chatId || !messageText) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros requeridos: chatId y messageText.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Obtener sesión de usuario desde la cabecera de autorización para validar seguridad
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado. Cabecera Bearer token requerida.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token de autenticación inválido o expirado.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Obtener detalles del chat y del agente asociado
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('*, character:characters(*)')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single();

    if (chatError || !chat) {
      return new Response(JSON.stringify({ error: 'Chat no encontrado o no pertenece a este usuario.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const character = chat.character;
    const country = character.default_country || 'Neutro';

    // 3. Obtener el perfil del usuario para validar si es Premium
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();

    const isPremium = profileError ? false : !!profile?.is_premium;

    // 4. Calcular el score de intimidad del mensaje actual
    // Para el MVP, omitimos generar el embedding real en este paso y usamos solo análisis de keywords.
    const messageIntimacy = evaluateMessageIntimacy(messageText);

    // 5. Calcular la tensión acumulada histórica del chat
    const { data: pastMessages, error: msgError } = await supabaseAdmin
      .from('chat_messages')
      .select('intimacy_score')
      .eq('chat_id', chatId);

    const accumulatedBefore = pastMessages?.reduce((sum, msg) => sum + (msg.intimacy_score || 0), 0) || 0;

    // Aplicar multiplicador de velocidad de clímax
    // Si no está definido en el agente, asumimos 'Standard' (1.0x)
    const climaxSpeed = (character as any).climax_speed || 'Standard';
    const multiplier = getClimaxMultiplier(climaxSpeed);
    const newIntimacyScore = messageIntimacy * multiplier;
    const accumulatedAfter = accumulatedBefore + newIntimacyScore;

    // 6. Verificar el Muro de Pago (Paywall Cliffhanger)
    // Se dispara si: NO es Premium AND el score superó el umbral (80)
    const paywallThreshold = 80;
    if (!isPremium && shouldTriggerPaywall(accumulatedAfter, paywallThreshold)) {
      const cliffhangerText = 
        `Te acercas lentamente, sintiendo el calor de su cuerpo y la agitación de su respiración. Todo está listo para el momento que tanto esperabas, pero...\n\n` +
        `🔒 **[ESCENA BLOQUEADA]** Has alcanzado el clímax narrativo de esta historia. Para desbloquear esta escena íntima, configurar dialectos locales y chatear sin límites, activa tu cuenta **Premium** en tu perfil.`;

      // Guardar el mensaje del usuario (con su score de clímax)
      await supabaseAdmin.from('chat_messages').insert({
        chat_id: chatId,
        sender: 'user',
        text: messageText,
        intimacy_score: newIntimacyScore
      });

      // Guardar el cliffhanger bloqueado en el historial
      await supabaseAdmin.from('chat_messages').insert({
        chat_id: chatId,
        sender: 'assistant',
        text: cliffhangerText,
        intimacy_score: 0
      });

      // Retornar la respuesta bloqueada simulando streaming SSE
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: cliffhangerText } }] })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // 7. Guardar el mensaje del usuario en la base de datos
    const { data: insertedUserMsg, error: insertError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender: 'user',
        text: messageText,
        intimacy_score: newIntimacyScore
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting user message:', insertError);
    }

    // 8. Construir el contexto del chat (Historial de Mensajes)
    // Obtenemos los últimos 15 mensajes del chat para contexto inmediato
    const { data: chatHistory, error: historyError } = await supabaseAdmin
      .from('chat_messages')
      .select('sender, text')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(15);

    if (historyError) {
      console.error('Error fetching chat history:', historyError);
    }

    // RAG (Memoria de Largo Plazo): En producción se realizaría una búsqueda de pgvector aquí.
    // Para simplificar el MVP, confiamos en la ventana deslizante del historial.

    // 9. Prompt Engineering e Inyección de Directivas Dialectales
    let systemPrompt = 
      `Eres ${character.name}. Mantén estrictamente tu personaje en todo momento, respondiendo en primera persona.\n` +
      `Personalidad e Historia:\n${character.personality_description}\n\n` +
      `Instrucciones de estilo de escritura:\n` +
      `- Mantén descripciones literarias vívidas y ricas. Usa cursivas *para acciones y gestos* y comillas "para diálogos".\n` +
      `- Tu tono debe ser inmersivo, sugestivo y adaptado al rol.\n` +
      `- Escribe exclusivamente en Español.`;

    // Si es premium, inyectamos la directiva dialectal al prompt del sistema del LLM principal
    if (isPremium && country !== 'Neutro') {
      let dialectDirective = '';
      if (country === 'Argentina') {
        dialectDirective = `\n[REGLAS DE DIALECTO: Habla como una persona de Argentina. Utiliza el voseo rioplatense (ej. 'vos querés', 'pensás', 'tenés', 'sos', 'estás'). Usa jerga argentina moderada de forma sutil y natural ('che', 'boludo', 'lindo', 'trago') sin sonar forzado ni sobreactuado.]`;
      } else if (country === 'España') {
        dialectDirective = `\n[REGLAS DE DIALECTO: Habla como una persona de España. Utiliza el tuteo y el vosotros ('vosotros tenéis', 'sabéis', 'queréis'). Usa expresiones españolas comunes de forma sutil ('vale', 'tío', 'chaval', 'guay', 'móvil', 'ordenador').]`;
      } else if (country === 'México') {
        dialectDirective = `\n[REGLAS DE DIALECTO: Habla como una persona de México. Utiliza el tuteo mexicano y añade sutilmente expresiones locales comunes ('güey', 'chavo', 'chamarra', 'qué onda') sin sonar forzado ni exagerado.]`;
      } else if (country === 'Colombia') {
        dialectDirective = `\n[REGLAS DE DIALECTO: Habla como una persona de Colombia. Utiliza el ustedeo cariñoso común en las conversaciones cercanas ('usted quiere', 'usted sabe', 'computador', 'celular').]`;
      }
      systemPrompt += dialectDirective;
    }

    // Construir mensajes para OpenRouter
    const apiMessages = [
      { role: 'system', content: systemPrompt }
    ];

    if (chatHistory) {
      chatHistory.forEach((msg) => {
        apiMessages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      });
    }

    // 10. Seleccionar el Modelo de Inferencia
    // Free: dolphin-mistral-24b
    // Premium: gpt-oss-120b, euryale-70b o cydonia-24b (por defecto cydonia-24b si no se especifica)
    let selectedModel = 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free';
    if (isPremium) {
      selectedModel = model || 'thedrummer/cydonia-24b-v4.1';
    }

    // 11. Llamar a OpenRouter con Streaming habilitado
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return new Response(JSON.stringify({ error: 'La API key de OpenRouter no está configurada en el servidor.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterApiKey}`,
        'HTTP-Referer': 'https://wonsfo.com',
        'X-Title': 'Wonsfo NSFW Chat Client'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: apiMessages,
        stream: true,
        temperature: 0.85
      })
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter error response:', errorText);
      return new Response(JSON.stringify({ error: `Error de OpenRouter: ${errorText}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let assistantFullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openRouterResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                
                if (dataStr === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                try {
                  const dataObj = JSON.parse(dataStr);
                  const content = dataObj.choices?.[0]?.delta?.content || '';
                  assistantFullResponse += content;

                  // Aplicar reemplazo rápido de localismos en el stream (Premium)
                  // para corregir pronombres en tiempo real sin latencia adicional
                  let processedContent = content;
                  if (isPremium && country !== 'Neutro') {
                    processedContent = applyLocalLexicon(content, country);
                  }

                  const outboundObj = {
                    choices: [{ delta: { content: processedContent } }]
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(outboundObj)}\n\n`));
                } catch (e) {
                  // Omitir errores de JSON parciales
                }
              }
            }
          }

          // 12. Al finalizar el stream, aplicar el post-procesador dialectal profundo (Premium)
          // y guardar la respuesta pulida en la base de datos
          let finalPolishedText = assistantFullResponse;
          if (isPremium && country !== 'Neutro') {
            finalPolishedText = await processSpeechDialect(assistantFullResponse, country, isPremium, openrouterApiKey);
          }

          await supabaseAdmin.from('chat_messages').insert({
            chat_id: chatId,
            sender: 'assistant',
            text: finalPolishedText,
            intimacy_score: 0.0 // Las respuestas del asistente no acumulan score para el paywall
          });

        } catch (error) {
          console.error('Error in streaming read:', error);
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
    console.error('Stream route exception:', error);
    return new Response(JSON.stringify({ error: `Error interno del servidor: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
