import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'Wonsfo - Chat de IA NSFW y Roleplay Interactivo Gratis',
    template: '%s | Wonsfo'
  },
  description: 'Chatea gratis con personajes virtuales de inteligencia artificial en español. Explora fantasías, roleplay personalizado y avatares realistas sin límites.',
  keywords: ['chat ia nsfw', 'roleplay ia', 'novia virtual gratis', 'personajes ia español', 'wonsfo', 'inteligencia artificial nsfw'],
  metadataBase: new URL('https://wonsfo.com'),
  icons: {
    icon: [
      { url: '/logo.jpg', sizes: 'any' },
      { url: '/logo.jpg', type: 'image/jpeg' }
    ],
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
  openGraph: {
    title: 'Wonsfo - Chat de IA NSFW y Roleplay Interactivo',
    description: 'Chatea con personajes virtuales e IA personalizada en español. Roleplay sin censura.',
    url: 'https://wonsfo.com',
    siteName: 'Wonsfo',
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wonsfo - Chat de IA NSFW',
    description: 'Chatea sin filtros con personajes de inteligencia artificial.',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50 font-sans">
        <Header />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
