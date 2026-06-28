import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_wonsfo', {
  apiVersion: '2025-02-18-preview' as any
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Falta la firma de Stripe.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn("Falta STRIPE_WEBHOOK_SECRET en las variables de entorno. Omisión de verificación de firma para pruebas.");
      // En desarrollo local, si no se tiene webhook secret, podemos parsear directamente el body
      event = JSON.parse(body);
    } else {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    }
  } catch (err: any) {
    console.error(`Error de verificación de firma de webhook: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Procesar evento checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const userId = session.metadata?.userId;
    const tokensToAddStr = session.metadata?.tokensToAdd;

    if (!userId || !tokensToAddStr) {
      console.error("Faltan metadatos esenciales en la sesión de Stripe:", session.id);
      return NextResponse.json({ error: 'Faltan metadatos en la sesión.' }, { status: 400 });
    }

    const tokensToAdd = parseInt(tokensToAddStr, 10);
    if (isNaN(tokensToAdd)) {
      console.error("Cantidad de tokens inválida en los metadatos:", tokensToAddStr);
      return NextResponse.json({ error: 'Cantidad de tokens inválida.' }, { status: 400 });
    }

    try {
      console.log(`Acreditando ${tokensToAdd} tokens al usuario ${userId}...`);

      // 1. Obtener balance actual del usuario
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('tokens, unlimited_tokens')
        .eq('id', userId)
        .single();

      if (fetchError || !profile) {
        throw new Error(`No se pudo encontrar el perfil del usuario: ${fetchError?.message}`);
      }

      // Si tiene tokens ilimitados, no necesitamos sumarlos, pero actualizamos igual
      const currentTokens = profile.tokens || 0;
      const newTokens = profile.unlimited_tokens ? 999999 : currentTokens + tokensToAdd;

      // 2. Actualizar tokens en la base de datos
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          tokens: newTokens,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      console.log(`Tokens acreditados con éxito al usuario ${userId}. Anterior: ${currentTokens}, Nuevo: ${newTokens}`);

    } catch (dbError: any) {
      console.error(`Error al actualizar tokens en Supabase:`, dbError);
      return NextResponse.json({ error: `Database update error: ${dbError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
