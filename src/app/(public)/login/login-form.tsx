'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction } from './actions';

export function LoginForm({
  next,
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (next) formData.set('next', next);
    setError(null);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@iconsanet.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contrasena</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      {error && (
        <p
          role="alert"
          className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-3"
        >
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Ingresando...' : 'Ingresar'}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Si no tienes cuenta, contacta a RRHH para que te genere un codigo de invitacion.
      </p>
    </form>
  );
}
