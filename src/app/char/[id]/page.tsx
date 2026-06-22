import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MessageSquare, MapPin, Gauge, ArrowLeft, Heart, Sparkles, Languages } from 'lucide-react';
import Link from 'next/link';

interface CharPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 3600; // Cachear el contenido por una hora

// Generación de metadatos dinámicos para SEO
export async function generateMetadata({ params }: CharPageProps): Promise<Metadata> {
  const { id } = await params;
  
  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single();

  if (!character) {
    return {
      title: 'Personaje no encontrado | Wonsfo',
      description: 'El compañero de chat de IA solicitado no se encuentra en nuestra plataforma.',
    };
  }

  const cleanDesc = character.personality_description.slice(0, 155);

  return {
    title: `Chatear con ${character.name} - Chat de IA NSFW y Roleplay Gratis`,
    description: `Chatea con ${character.name} en Wonsfo. ${cleanDesc}...`,
    openGraph: {
      title: `Chatear con ${character.name} - Chat de IA NSFW`,
      description: character.personality_description,
      images: [
        {
          url: character.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop',
          width: 400,
          height: 400,
          alt: character.name,
        },
      ],
      type: 'website',
    },
  };
}

export default async function CharacterDetailPage({ params }: CharPageProps) {
  const { id } = await params;

  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single();

  if (!character) {
    notFound();
  }

  // Datos estructurados JSON-LD para indexación enriquecida en buscadores
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': `${character.name} - Personaje de Chat IA`,
    'applicationCategory': 'GameApplication',
    'operatingSystem': 'All',
    'description': character.personality_description,
    'offers': {
      '@type': 'Offer',
      'price': '0.00',
      'priceCurrency': 'USD'
    },
    'author': {
      '@type': 'Organization',
      'name': 'Wonsfo'
    }
  };

  return (
    <div className="bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full font-sans min-h-screen flex flex-col justify-center">
      {/* Script JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex items-center gap-2 mb-6 text-zinc-400 hover:text-zinc-50 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <Link href="/" className="text-xs font-semibold">
          Volver a Explora
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-xs">
        {/* Avatar grande centrado */}
        <div className="flex flex-col items-center text-center">
          <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shadow-2xl">
            <img
              src={character.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop'}
              alt={character.name}
              className="h-full w-full object-cover"
            />
          </div>
          
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-zinc-50 tracking-tight">{character.name}</h1>
          <p className="mt-1.5 text-xs text-red-500 font-semibold tracking-wider uppercase bg-red-950/40 px-2 py-0.5 rounded border border-red-900/30">
            Compañero de Chat IA
          </p>
        </div>

        {/* Tags de Parámetros */}
        <div className="flex flex-wrap justify-center gap-2.5 pt-2 border-t border-b border-zinc-850/50 py-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-3.5 py-1 text-xs text-zinc-300">
            <MapPin className="h-3.5 w-3.5 text-zinc-500" />
            Dialecto: <span className="font-semibold text-zinc-200">{character.default_country}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-3.5 py-1 text-xs text-zinc-300">
            <Gauge className="h-3.5 w-3.5 text-zinc-500" />
            Ritmo: <span className="font-semibold text-zinc-200">{character.climax_speed || 'Standard'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-3.5 py-1 text-xs text-zinc-300">
            <Languages className="h-3.5 w-3.5 text-zinc-500" />
            Idioma: <span className="font-semibold text-zinc-200">{character.default_language === 'es' ? 'Español' : character.default_language}</span>
          </span>
        </div>

        {/* Personalidad y Descripción */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-300 tracking-wide flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-zinc-500" />
            Personalidad & Contexto
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed bg-zinc-900/10 rounded-lg p-4 border border-zinc-850">
            {character.personality_description}
          </p>
        </div>

        {/* Saludo Inicial */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-300 tracking-wide flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-zinc-500" />
            Mensaje de Saludo
          </h2>
          <p className="text-sm italic text-zinc-300 leading-relaxed bg-zinc-900/20 rounded-lg p-4 border border-zinc-850">
            "{character.initial_greeting}"
          </p>
        </div>

        {/* CTA Button */}
        <div className="pt-4">
          <Link
            href={`/chat-redirect?characterId=${character.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-50 hover:bg-zinc-200 py-3.5 text-sm font-bold text-zinc-950 transition-colors shadow-lg"
          >
            <MessageSquare className="h-4 w-4" />
            Iniciar Chat de Rol Gratis
          </Link>
        </div>
      </div>
    </div>
  );
}
