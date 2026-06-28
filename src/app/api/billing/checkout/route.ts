import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_wonsfo', {
  apiVersion: '2025-02-18-preview' as any // Configuración de versión compatible
});

const PACKS = {
  pack_10: { name: '10 Tokens Wonsfo', tokens: 10, price: 130 }, // precio en centavos ($1.30)
  pack_20: { name: '20 Tokens Wonsfo', tokens: 20, price: 200 }, // precio en centavos ($2.00)
  pack_60: { name: '60 Tokens Wonsfo', tokens: 60, price: 480 }, // precio en centavos ($4.80)
  pack_150: { name: '150 Tokens Wonsfo', tokens: 150, price: 900 } // precio en centavos ($9.00)
};

export async function POST(request: NextRequest) {
  try {
    const { packId } = await request.json();

    if (!packId || !PACKS[packId as keyof typeof PACKS]) {
      return NextResponse.json({ error: 'Paquete de tokens inválido o no especificado.' }, { status: 400 });
    }

    const selectedPack = PACKS[packId as keyof typeof PACKS];

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

    // Obtener perfil del usuario para asociar cliente o email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'La API Key de Stripe no está configurada en el servidor.' }, { status: 500 });
    }

    const origin = request.headers.get('origin') || `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // 2. Crear sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPack.name,
              description: `Añade ${selectedPack.tokens} tokens a tu cuenta de Wonsfo para chatear sin límites y generar imágenes.`,
              images: [`${origin}/logo_symbol.jpg`]
            },
            unit_amount: selectedPack.price
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${origin}/profile?payment=success&tokens=${selectedPack.tokens}`,
      cancel_url: `${origin}/profile?payment=cancel`,
      metadata: {
        userId: user.id,
        packId: packId,
        tokensToAdd: selectedPack.tokens.toString()
      },
      customer_email: user.email
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Error creating Stripe checkout session:', error);
    return NextResponse.json({ error: `Error al procesar el pago: ${error.message}` }, { status: 500 });
  }
}
