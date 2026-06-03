import { describe, it, expect } from 'vitest';
import * as Templates from '@/emails';
import { TEMPLATE_CODE_MAP } from './types';

// F-08 / CODE-TEMPLATE-GAP guard.
// The cron worker resolves a notification's React Email component by looking up its template_code
// as a key on the `@/emails` namespace (see app/api/cron/process-notifications/route.ts). A code in
// TEMPLATE_CODE_MAP with no matching export is delivered as a PERMANENT failure at runtime.
//
// This test makes that gap a build-time failure instead. Every code must be either:
//   - IMPLEMENTED: exported from @/emails, or
//   - PENDING: explicitly listed below as a known, not-yet-built template.
// Adding a new notification type without doing one or the other fails here.

// Domain templates currently shipped in src/emails (BaseLayout is a layout, not a template code).
const IMPLEMENTED = [
  'OnboardingErrorReported',
  'InviteCodeDelivered',
  'InviteCodeRegenerated',
  'WelcomeEmployee',
] as const;

// Mapped but not yet built. These notification types must not be enqueued until implemented.
const PENDING = [
  'TicketCreatedApprover',
  'TicketStatusChangedRequester',
  'TicketCompleted',
  'ManualEntryCreated',
  'ProfileChangedSensitive',
] as const;

describe('email template wiring (CODE-TEMPLATE-GAP)', () => {
  it('exports exactly the implemented domain templates', () => {
    for (const code of IMPLEMENTED) {
      expect(Templates, `missing export @/emails.${code}`).toHaveProperty(code);
    }
  });

  it('does not silently ship a pending template (update IMPLEMENTED/PENDING when one lands)', () => {
    for (const code of PENDING) {
      expect(
        Object.prototype.hasOwnProperty.call(Templates, code),
        `${code} is now exported — move it from PENDING to IMPLEMENTED`
      ).toBe(false);
    }
  });

  it('every TEMPLATE_CODE_MAP code is either implemented or explicitly pending', () => {
    const known = new Set<string>([...IMPLEMENTED, ...PENDING]);
    const unaccounted = Object.values(TEMPLATE_CODE_MAP).filter((code) => !known.has(code));
    expect(unaccounted, `template codes with no component and not tracked: ${unaccounted}`).toEqual(
      []
    );
  });
});
