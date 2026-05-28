// HMAC-stateless token para onboarding wizard (NEW.A Batch 3).
// Bound a (invite_id, person_id, validated_at_iso) con ONBOARDING_TOKEN_SECRET.
// Usado por reportOnboardingErrorAction para validar que la sesion del wizard
// es la misma que paso validateInviteCodeAction (kills person_id spoofing NEW.B).

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface OnboardingTokenPayload {
  invite_id: string;
  person_id: string;
  validated_at: string; // ISO 8601
}

const MIN_SECRET_LENGTH = 32;

function getSecret(): string {
  const secret = process.env.ONBOARDING_TOKEN_SECRET;
  if (!secret) {
    throw new Error('ONBOARDING_TOKEN_SECRET env var no esta seteada');
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `ONBOARDING_TOKEN_SECRET debe tener al menos ${MIN_SECRET_LENGTH} chars`
    );
  }
  return secret;
}

function encodePayload(payload: OnboardingTokenPayload): string {
  return `${payload.invite_id}|${payload.person_id}|${payload.validated_at}`;
}

function decodePayload(data: string): OnboardingTokenPayload | null {
  const parts = data.split('|');
  if (parts.length !== 3) return null;
  const [invite_id, person_id, validated_at] = parts;
  if (!invite_id || !person_id || !validated_at) return null;
  return { invite_id, person_id, validated_at };
}

export function signOnboardingToken(payload: OnboardingTokenPayload): string {
  const data = encodePayload(payload);
  const hmac = createHmac('sha256', getSecret());
  hmac.update(data);
  const signature = hmac.digest('base64url');
  const encodedData = Buffer.from(data, 'utf-8').toString('base64url');
  return `${encodedData}.${signature}`;
}

export function verifyOnboardingToken(token: string): OnboardingTokenPayload | null {
  if (typeof token !== 'string' || !token.includes('.')) return null;

  const [encodedData, signature] = token.split('.');
  if (!encodedData || !signature) return null;

  let data: string;
  try {
    data = Buffer.from(encodedData, 'base64url').toString('utf-8');
  } catch {
    return null;
  }

  let expectedSignature: string;
  try {
    const hmac = createHmac('sha256', getSecret());
    hmac.update(data);
    expectedSignature = hmac.digest('base64url');
  } catch {
    return null;
  }

  // Constant-time comparison para evitar timing attacks
  const sigBuf = Buffer.from(signature, 'utf-8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  return decodePayload(data);
}
