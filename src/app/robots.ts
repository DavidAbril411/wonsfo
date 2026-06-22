import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/char/'],
      disallow: ['/chat/', '/profile', '/create', '/api/'],
    },
    sitemap: 'https://wonsfo.com/sitemap.xml',
  };
}
