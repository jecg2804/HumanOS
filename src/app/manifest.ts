import type { MetadataRoute } from 'next';

// FE-4: basic web app manifest (PWA-ready). Next auto-links this at
// /manifest.webmanifest. Icons + full offline support are deferred until
// design assets exist (needs James) — declaring metadata + theme is the
// bounded remediation here.
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
  };
}
