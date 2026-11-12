# Facilitator Portal connection

The portal is implemented at `/portal`. Its URL and public key are configured and sign-in is enabled for approved accounts.
The password recovery page is deployed at `/reset-password`. Marla reported a successful password change.
Live checks passed: Marla's password login, active approved profile, authenticated table access, anonymous read denial, and denial of profile modification.
The interface now uses email/password sign-in. Passwords and tokens are not persisted in browser storage.
Marla confirmed the full `portal-privacy-test.sql` was run in the live SQL editor and its PASS result appeared. The agent did not directly observe that result. The transaction tests own-record access, cross-account reads and writes, and inactive access, then rolls back sample records.
The mocked interface test in `tracker-working/test-portal.cjs` passed login, guest creation/search, safe text rendering, failed-save retention, successful save/history, sign-out and back-cache clearing. It is not a live browser test. Browser automation was blocked by the Windows browser policy, so visual/mobile and end-to-end browser checks remain unverified.
No guest information or credentials are stored in browser localStorage or in the repository.

## Connect the sanctuary's Supabase account

1. Create a Supabase project owned by the sanctuary. Review service pricing, hosting region, backup/restore settings, and data handling before putting guest information into it.
2. Run `portal-schema.sql` once in its SQL editor. This enables row-level security and denies anonymous access to all records. Authenticated users cannot approve themselves or alter their access.
3. Public signups are confirmed disabled. Configure production email delivery for password recovery. The current Site URL points to the deployed `/reset-password` page. Allow that exact URL as a redirect.
4. Create each approved facilitator in Supabase Auth. Add their user UUID and name to `public.facilitators` from the administrator dashboard. Only the sanctuary administrator can add these approvals. Set `active=false` to revoke database access immediately.
5. Put only the project HTTPS URL and public publishable key in `portal-config.js`. Never use a service-role key or secret key. Keep `enabled:false` until testing passes.
6. Run the release checks below with synthetic records, then enable sign-in and deploy through the existing Vercel/Git workflow.

## Required live release checks

- Use two approved test accounts A and B, one unapproved account, and anonymous requests.
- A creates a guest and ceremony; refresh/sign in again and confirm both persist.
- B cannot list or retrieve A's guest/ceremony even by known UUID. Requests to insert a row with A's owner UUID must fail. B cannot attach a ceremony to A's guest with B's owner UUID (composite foreign key).
- Anonymous callers cannot read or write any table. An unapproved or inactive user cannot read/write guest records. A facilitator cannot change their profile or approval.
- Test password recovery delivery for each facilitator, invalid credentials, sign-out, token expiration, mobile layout, keyboard navigation, and failed-save retry. Confirm payment buttons open the exact existing sanctuary accounts. Production email delivery for other facilitators is still unverified.
- Confirm stored guest text displays as text, not executable markup. Confirm no guest data remains visible after sign-out or a browser back/forward cache restore.
- Marla reported `Editing enabled.` after running `portal-enable-editing.sql` in the administrator SQL editor. It grants UPDATE only on entry content columns and adds the own-active-account policy. It does not create tables or touch auth.users. The original transactional test is preserved in `portal-editing-privacy-test.sql`; its execution is unverified. The grant does not allow moving an entry to another guest or facilitator. Mock interface tests passed edit prefill, cancel, saving without duplication, failed/denied updates and sign-out clearing. A live browser edit remains unverified. Deletion is not offered.
- Lists currently cap at 1,000 guests and 1,000 entries per guest. Add pagination before these limits are reached.

## Membership

The amount and payment links were copied from `give.html`: $150 for 12 months, Venmo @bufohealingsanctuary and Cash App $bufohealingsanctuary. Payments are confirmed manually. No automatic renewal, paid-state tracking, or payment-based access lock is implemented.

## References

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/general-configuration

This document distinguishes direct live checks, user-reported SQL results, mocked interface checks, and outstanding verification. Setup documents and SQL are excluded from Vercel deployment by `.vercelignore`.
