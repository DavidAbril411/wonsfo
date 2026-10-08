// Constantes de costo en tokens para las diferentes acciones del sistema

export const TOKEN_COSTS = {
  CREATE_CHARACTER: 5,
  GENERATE_SCENE: 2,
  UNLOCK_CLIMAX: 5
};

// Medición del chat (ver supabase/migrations/20261008_chat_metering.sql)
export const CHAT_METERING = {
  // Con tokens > 0 se usan modelos premium y se descuenta 1 token cada N mensajes
  PREMIUM_MESSAGES_PER_TOKEN: 10,
  // Sin tokens se usa el modelo gratis con este máximo diario (UTC)
  FREE_DAILY_MESSAGES: 50
};
