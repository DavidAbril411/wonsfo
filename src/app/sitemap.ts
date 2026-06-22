import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600; // Regenerar sitemap cada hora

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://wonsfo.com';

  // Rutas estáticas básicas
  const staticRoutes = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
  ];

  try {
    // Obtener todos los personajes de la base de datos de forma pública
    const { data: characters } = await supabase
      .from('characters')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    const characterRoutes = (characters || []).map((char) => ({
      url: `${baseUrl}/char/${char.id}`,
      lastModified: new Date(char.created_at || Date.now()),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...staticRoutes, ...characterRoutes];
  } catch (error) {
    console.error('Error generando sitemap:', error);
    return staticRoutes;
  }
}
