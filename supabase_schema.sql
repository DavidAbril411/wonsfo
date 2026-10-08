-- Habilitar extensión vectorial para RAG y análisis semántico
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla de Perfiles de Usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  username TEXT UNIQUE,
  is_premium BOOLEAN DEFAULT FALSE,
  tokens INTEGER DEFAULT 5,
  unlimited_tokens BOOLEAN DEFAULT FALSE,
  display_name TEXT,
  gender TEXT
);

-- Habilitar RLS en perfiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver su propio perfil" 
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger para crear perfil automáticamente cuando un usuario se registra en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_premium, tokens, unlimited_tokens, display_name, gender)
  VALUES (
    new.id, 
    split_part(new.email, '@', 1), 
    FALSE,
    5, -- 5 tokens de bienvenida
    FALSE,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    coalesce(new.raw_user_meta_data->>'gender', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabla de Personajes (Simple Proprietary Schema)
CREATE TABLE IF NOT EXISTS public.characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  name TEXT NOT NULL,
  personality_description TEXT NOT NULL,
  initial_greeting TEXT NOT NULL,
  avatar_url TEXT,
  default_language TEXT DEFAULT 'es',
  default_country TEXT DEFAULT 'Neutro',
  is_public BOOLEAN DEFAULT FALSE
);

-- Habilitar RLS en personajes
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquier usuario autenticado puede ver los personajes" 
  ON public.characters FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Los usuarios pueden crear personajes" 
  ON public.characters FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden modificar sus propios personajes" 
  ON public.characters FOR UPDATE USING (auth.uid() = user_id);

-- Tabla de Chats Activos
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  character_id UUID REFERENCES public.characters ON DELETE CASCADE NOT NULL,
  model TEXT
);

-- Habilitar RLS en chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver sus propios chats" 
  ON public.chats FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propios chats" 
  ON public.chats FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden borrar sus propios chats" 
  ON public.chats FOR DELETE USING (auth.uid() = user_id);

-- Tabla de Mensajes (con Vector Embeddings para RAG)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  chat_id UUID REFERENCES public.chats ON DELETE CASCADE NOT NULL,
  sender TEXT CHECK (sender IN ('user', 'assistant')) NOT NULL,
  text TEXT NOT NULL,
  embedding vector(1536),
  intimacy_score FLOAT DEFAULT 0.0
);

-- Habilitar RLS en mensajes
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver los mensajes de sus propios chats" 
  ON public.chat_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE public.chats.id = chat_messages.chat_id AND public.chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Los usuarios pueden crear mensajes en sus propios chats" 
  ON public.chat_messages FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE public.chats.id = chat_messages.chat_id AND public.chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Los usuarios pueden borrar mensajes en sus propios chats" 
  ON public.chat_messages FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE public.chats.id = chat_messages.chat_id AND public.chats.user_id = auth.uid()
    )
  );

-- Función SQL para buscar similitud semántica de mensajes (RAG)
CREATE OR REPLACE FUNCTION match_chat_messages (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  target_chat_id uuid
)
RETURNS TABLE (
  id uuid,
  text text,
  sender text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chat_messages.id,
    chat_messages.text,
    chat_messages.sender,
    1 - (chat_messages.embedding <=> query_embedding) AS similarity
  FROM chat_messages
  WHERE chat_messages.chat_id = target_chat_id
    AND 1 - (chat_messages.embedding <=> query_embedding) > match_threshold
  ORDER BY chat_messages.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Trigger de seguridad para proteger tokens y premium de cambios desde el cliente
CREATE OR REPLACE FUNCTION public.protect_tokens_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    NEW.tokens := OLD.tokens;
    NEW.unlimited_tokens := OLD.unlimited_tokens;
    NEW.is_premium := OLD.is_premium;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_update_protect_tokens
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_tokens_on_update();

-- ============================================================
-- Migración 2026-10-08: medición del chat (ver supabase/migrations/20261008_chat_metering.sql)
-- ============================================================
-- Medición de mensajes de chat (modelo híbrido):
--   * Modelos premium (usuario con tokens > 0): 1 token cada N mensajes.
--   * Modelo gratis (usuario sin tokens): máximo M mensajes por día (UTC).
-- Ejecutar UNA vez en Supabase → SQL Editor ANTES de desplegar el código nuevo.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_msg_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_msgs_today INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_msgs_date DATE;

-- Los contadores, igual que los tokens, no pueden ser modificados desde el cliente
CREATE OR REPLACE FUNCTION public.protect_tokens_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    NEW.tokens := OLD.tokens;
    NEW.unlimited_tokens := OLD.unlimited_tokens;
    NEW.is_premium := OLD.is_premium;
    NEW.premium_msg_count := OLD.premium_msg_count;
    NEW.free_msgs_today := OLD.free_msgs_today;
    NEW.free_msgs_date := OLD.free_msgs_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Consume un mensaje de forma atómica (FOR UPDATE evita cobros dobles con pestañas simultáneas)
CREATE OR REPLACE FUNCTION public.consume_chat_message(
  p_user_id UUID,
  p_free_daily_limit INT,
  p_msgs_per_token INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.profiles%ROWTYPE;
  today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  used_today INT;
BEGIN
  SELECT * INTO prof FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_profile');
  END IF;

  IF prof.unlimited_tokens THEN
    RETURN jsonb_build_object('allowed', true, 'tier', 'unlimited');
  END IF;

  IF prof.tokens > 0 THEN
    IF prof.premium_msg_count + 1 >= p_msgs_per_token THEN
      UPDATE public.profiles SET premium_msg_count = 0, tokens = tokens - 1 WHERE id = p_user_id;
      RETURN jsonb_build_object('allowed', true, 'tier', 'premium', 'charged', true, 'tokens', prof.tokens - 1);
    END IF;
    UPDATE public.profiles SET premium_msg_count = premium_msg_count + 1 WHERE id = p_user_id;
    RETURN jsonb_build_object('allowed', true, 'tier', 'premium', 'charged', false, 'tokens', prof.tokens);
  END IF;

  used_today := CASE WHEN prof.free_msgs_date = today THEN prof.free_msgs_today ELSE 0 END;
  IF used_today >= p_free_daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'free_daily_limit', 'tier', 'free');
  END IF;

  UPDATE public.profiles SET free_msgs_today = used_today + 1, free_msgs_date = today WHERE id = p_user_id;
  RETURN jsonb_build_object('allowed', true, 'tier', 'free', 'free_remaining', p_free_daily_limit - used_today - 1);
END;
$$;

-- Solo el backend (service_role) puede llamarla
REVOKE ALL ON FUNCTION public.consume_chat_message(UUID, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_chat_message(UUID, INT, INT) TO service_role;
