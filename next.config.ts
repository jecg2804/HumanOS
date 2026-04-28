import type { NextConfig } from 'next';

const config: NextConfig = {
  // typedRoutes intentionally disabled for MVP: bloquea redirects dinámicos
  // (login `next` param, server actions). Re-evaluar post-MVP.
  typedRoutes: false,
};

export default config;
