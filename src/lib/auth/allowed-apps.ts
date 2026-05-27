import type { User } from '@supabase/supabase-js';
import { APP_NAME } from './constants';

export function userHasHumanOSAccess(user: User | null): boolean {
  if (!user) return false;
  const allowedApps = user.app_metadata?.allowed_apps;
  if (!Array.isArray(allowedApps)) return false;
  return allowedApps.includes(APP_NAME);
}
