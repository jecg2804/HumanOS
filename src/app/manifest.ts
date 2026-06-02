import type { MetadataRoute } from 'next';

// FE-4: web app manifest (PWA-installable). Next auto-links this at /manifest.webmanifest.
// Icons = navy+gold ICONSA mark on white (the brand logo is navy/gold on transparent, so a white
// bg is required for legibility). 192/512 'any' + a SEPARATE 512 'maskable' (content within the
// central safe zone for Android cropping). Offline/service-worker is OUT of scope (Next ships no SW).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HumanOS - ICONSA',
    short_name: 'HumanOS',
    description: 'Portal interno de Recursos Humanos ICONSA',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#1B3A5C',
    lang: 'es',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
