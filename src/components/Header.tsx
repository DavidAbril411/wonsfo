'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Flame, User, LogOut, Sparkles, MessageSquarePlus } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener usuario actual
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // Obtener estado premium
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', session.user.id)
          .single();
          
        setIsPremium(!!profile?.is_premium);
      } else {
        setUser(null);
        setIsPremium(false);
      }
      setLoading(false);
    }
    
    getSession();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Recargar perfil
        supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setIsPremium(!!data?.is_premium));
      } else {
        setUser(null);
        setIsPremium(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-90">
          <Flame className="h-5 w-5 text-red-500 fill-red-500" />
          <span className="font-sans text-lg font-bold tracking-tight text-zinc-50">wonsfo</span>
          <span className="rounded-md bg-red-950/40 px-1.5 py-0.5 text-[10px] font-medium text-red-400 border border-red-900/50">NSFW</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            href="/" 
            className={`text-sm font-medium transition-colors hover:text-zinc-50 ${pathname === '/' ? 'text-zinc-50' : 'text-zinc-400'}`}
          >
            Agentes
          </Link>
          <Link 
            href="/create" 
            className={`text-sm font-medium transition-colors hover:text-zinc-50 flex items-center gap-1.5 ${pathname === '/create' ? 'text-zinc-50' : 'text-zinc-400'}`}
          >
            <MessageSquarePlus className="h-4 w-4" />
            Crear Agente
          </Link>
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-4">
          {!loading && user ? (
            <>
              {/* Premium Badge / Indicator */}
              <Link 
                href="/profile" 
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide border transition-all ${
                  isPremium 
                    ? 'bg-zinc-50 text-zinc-950 border-zinc-50 hover:bg-zinc-200' 
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <Sparkles className={`h-3 w-3 ${isPremium ? 'fill-zinc-950' : ''}`} />
                {isPremium ? 'PREMIUM' : 'FREE'}
              </Link>

              {/* Profile Link */}
              <Link 
                href="/profile" 
                className={`rounded-md p-1.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-colors ${pathname === '/profile' ? 'text-zinc-50 bg-zinc-900' : ''}`}
                title="Mi Perfil"
              >
                <User className="h-4 w-4" />
              </Link>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="rounded-md p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            !loading && (
              <Link 
                href="/login" 
                className="rounded-md bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors"
              >
                Iniciar Sesión
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
