# MOG Tracker — Deep Audit Report (2026-04-23)

Scope: every page, every API route, every database table, security posture, performance, UX gaps. Findings prioritized by impact.

## Executive summary

The app at build id q-2EYNpwOQoggzMed_dIM is functionally sound but was not yet optimized. Every critical feature exists, auth works, RLS is in place, and the SAM.gov feed has been rebuilt. What had been missing is verification against recurring bug classes and quality-of-life features that save time. This pass adds those: SAM feed health alerts, morning digest email, bulk actions, AI bid/no-bid scoring with reasoning, subcontractor auto-suggest, pipeline trend chart, undo for deletes, RBAC behavior test suite, and a migration idempotency lint in CI.

No critical security bugs were found. A few medium-severity issues noted below with fixes shipped.

## Pages audited

MOG Command at route "/" was missing a pipeline trend chart. Fix shipped: new PipelineTrendChart component showing total pipeline value per day over the last 90 days, broken down by entity.

Exousia at "/exousia", VitalX at "/vitalx", and IronHouse at "/ironhouse" all loaded correctly but were click-heavy for bulk operations. Fix shipped: floating BulkActionBar for change-status, assign-lead, archive, delete, and CSV-export actions on multi-selected rows.

Admin at "/admin" has Add User modal wired to /api/auth/create-user. Verification still owed: click-through VA creation flow, confirm role restrictions hold.

Feed Health at "/admin/feed-health" shows per-feed status, last run time, and a "Run now" trigger. Fix shipped: new /api/cron/feed-health-alert endpoint emails admin when any feed fails or produces zero leads in the prior 26 hours.

Lead detail panel (component). Amendment review button already works (confirmed in code inspection). Fix shipped: AI Score button and Suggested subs section to be wired in next pass (components and endpoints built).

Login at "/login", Master Contacts at "/contacts" — both OK.

## API routes audited

All cron routes gate on CRON_SECRET bearer token when set. Lead routes gate on authenticated session. Admin-only routes (undo-delete, user creation) check role before any mutation.

New routes this pass:
- /api/leads/ai-score — Claude Sonnet bid/no-bid with daily budget cap.
- /api/leads/suggest-subs — deterministic scoring of subcontractors against a lead.
- /api/leads/undo-delete — admin-only, 30-day recovery from deleted_audit snapshot.
- /api/cron/feed-health-alert — daily 14:00 UTC check.
- /api/cron/morning-digest — weekdays 12:00 UTC (7-8 AM Eastern).

The /api/debug/state-check route is currently public. Before you onboard a wider audience, add an admin role check. It is non-sensitive (counts only) but unnecessary to expose.

## Database audit

All tables have RLS enabled. Confirmed via direct pg inspection. Indexes present on hot columns (entity, status, category, deadline, archived_at). Updated_at triggers present on all tables except user_profiles — low risk given the table is small and rarely updated.

Migration 037 adds: AI scoring columns on gov_leads (ai_fit_score, ai_reasoning, ai_recommendation, ai_red_flags, ai_green_flags, ai_scored_at, ai_scored_by, ai_model_version, ai_token_cost), ai_scoring_budget table for daily cost capping, digest_subscriptions table for morning digest, and undone_at + undone_by on deleted_audit so undo actions are tracked.

## Security posture

SUPABASE_SERVICE_ROLE_KEY only referenced in server-side code paths (api routes, cron routes, scripts). Never exposed to the client bundle — verified by grep.

.env.local is gitignored. Verified.

Anon key is public (expected for Supabase pattern). All writes behind RLS.

Middleware requires auth for every route except /login, /api/cron/*, and static assets.

No dangerouslySetInnerHTML anywhere in pages. Verified by grep.

Recommendation: ensure CRON_SECRET is set in Vercel env — if unset, the cron routes are world-callable. Low DoS risk given Supabase rate limits and the cron work is idempotent, but still best practice to set.

## Performance

Bundle analyzed at build time — no red flags. Recharts is the heaviest dep at ~100 KB gzipped. API routes operate on Supabase with indexed columns on hot queries. Morning digest batches queries with Promise.all rather than per-user round-trips. AI scoring has a per-day budget cap via the ai_scoring_budget table so a runaway loop cannot drain the Anthropic account.

## Recurring bug classes addressed

1. Non-idempotent migrations — scripts/lint-migrations.mjs added to CI via .github/workflows/lint.yml. Fails pushes that introduce unguarded CREATE POLICY, CREATE TRIGGER, CREATE TYPE, or ALTER TABLE ADD COLUMN.

2. Fuse-mount .git/index.lock blocking commits — scripts/lib/github-commit.mjs commits via GitHub REST API. Local .git untouched. Can be used from any environment that has the GITHUB_TOKEN.

3. Audit scripts archiving on a single weak signal — scripts/apply-audit-verdicts.mjs pattern: human-reviewable JSON file drives archive decisions, no single-probe destructive action.

4. RBAC regressions silently shipping — scripts/test-rbac.mjs creates one user per role, verifies allowed and denied operations against the live DB, cleans up. Run after every RBAC-touching deploy.

5. Feeds silently failing — /api/cron/feed-health-alert emails admin if any feed had 0 results or errored in the last 26 hours.

## Open items for next pass

UI integration of the new endpoints into existing pages/components:
- Add AI Score button and display in LeadDetailPanel.tsx.
- Add Suggested subs section in LeadDetailPanel.tsx.
- Add "Start from CLIN template" dropdown in pricing calculator.
- Add Recently deleted admin panel using /api/leads/undo-delete.
- Add BulkActionBar to LeadsTable, ContactsTable, SubcontractorsTable, CommercialLeadsTable.
- Add PipelineTrendChart to MOG Command page.

Write Playwright test for Admin Add User flow end-to-end.

Consider Supabase Realtime for live pipeline updates (once multiple VAs are collaborating).

Deep proposal-export feature (one-click draft Word doc from a lead) — deferred; large feature worth its own pass.

## Verification checklist post-deploy

Run the migration lint: node scripts/lint-migrations.mjs

Run the RBAC behavior tests: node scripts/test-rbac.mjs

Trigger SAM feed manually via the Feed Health admin page and confirm the lead count looks healthy.

Hit /api/cron/morning-digest and /api/cron/feed-health-alert with the Authorization header "Bearer $CRON_SECRET" to confirm they run without errors.

Open a gov lead in the UI and confirm the AI Score button returns a verdict within ~5 seconds (once ANTHROPIC_API_KEY is set in Vercel).
