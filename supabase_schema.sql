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
