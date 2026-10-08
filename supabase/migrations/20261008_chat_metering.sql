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
