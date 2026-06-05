import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  crons: [
    {
      path: '/api/cron/process-notifications',
      schedule: '*/5 * * * *',
    },
    // DISABLED until the SDX vendor (Dexter+Chaney / iconsanet) confirms the intended auth model.
    // Empty <GUID> works today (validated 2026-06-05) but the intended auth is unconfirmed, so the
    // nightly people sync stays OFF. Uncomment to enable once vendor auth is signed off. ADR-0033.
    // {
    //   path: '/api/cron/sdx-people-sync',
    //   schedule: '0 6 * * *', // 06:00 UTC nightly (~01:00 Panama)
    // },
  ],
};
