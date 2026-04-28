import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HumanOS — ICONSA',
  description: 'Plataforma de RRHH de ICONSA',
};

export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

export default RootLayout;
