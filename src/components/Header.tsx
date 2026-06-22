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

  // Ocultar bottom navigation en login y en páginas de chat activo
  const showMobileNav = user && !pathname.startsWith('/chat/');

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img 
              src="/logo.jpg" 
              alt="wonsfo logo" 
              className="h-8 w-8 rounded-lg object-cover border border-zinc-800 shadow-md" 
            />
            <span className="font-sans text-lg font-bold tracking-tight text-zinc-50">wonsfo</span>
            <span className="rounded-md bg-pink-950/40 px-1.5 py-0.5 text-[9px] font-semibold text-pink-400 border border-pink-900/40">NSFW</span>
          </Link>

          {/* Navigation - Desktop */}
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
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider border transition-all ${
                    isPremium 
                      ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-zinc-50 border-transparent shadow-[0_0_10px_rgba(236,72,153,0.25)] hover:opacity-90' 
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <Sparkles className={`h-3 w-3 ${isPremium ? 'fill-zinc-50' : ''}`} />
                  {isPremium ? 'PREMIUM' : 'FREE'}
                </Link>

                {/* Profile Link - Desktop only */}
                <Link 
                  href="/profile" 
                  className={`hidden md:inline-flex rounded-md p-1.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-colors ${pathname === '/profile' ? 'text-zinc-50 bg-zinc-900' : ''}`}
                  title="Mi Perfil"
                >
                  <User className="h-4 w-4" />
                </Link>

                {/* Logout Button */}
                <button 
                  onClick={handleLogout}
                  className="rounded-md p-1.5 text-zinc-400 hover:text-pink-500 hover:bg-zinc-900 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              !loading && (
                <Link 
                  href="/login" 
                  className="rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 px-3.5 py-1.5 text-xs font-bold text-zinc-50 shadow-md hover:opacity-95 transition-all"
                >
                  Iniciar Sesión
                </Link>
              )
            )}
          </div>
        </div>
      </header>

      {/* Bottom Nav Bar for Mobile */}
      {showMobileNav && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-900 bg-zinc-950/95 backdrop-blur-lg pb-safe">
          <div className="flex h-16 items-center justify-around px-4">
            <Link 
              href="/" 
              className={`flex flex-col items-center gap-1 text-[10px] font-bold tracking-wide uppercase transition-colors ${
                pathname === '/' ? 'text-pink-500' : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <Flame className="h-5 w-5" />
              <span>Agentes</span>
            </Link>
            <Link 
              href="/create" 
              className={`flex flex-col items-center gap-1 text-[10px] font-bold tracking-wide uppercase transition-colors ${
                pathname === '/create' ? 'text-pink-500' : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <MessageSquarePlus className="h-5 w-5" />
              <span>Crear</span>
            </Link>
            <Link 
              href="/profile" 
              className={`flex flex-col items-center gap-1 text-[10px] font-bold tracking-wide uppercase transition-colors ${
                pathname === '/profile' ? 'text-pink-500' : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <User className="h-5 w-5" />
              <span>Perfil</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
