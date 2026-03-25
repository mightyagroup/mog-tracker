# MOG Tracker Web App — Continuation Prompt

## CONTEXT
I'm Ella (Emmanuela Wireko-Brobbey). I've been building the MOG Tracker — a full-stack federal/commercial bid tracking web app for my parent company Mighty Oak Group (MOG) and three operating entities: Exousia Solutions LLC (facilities management, procurement, government contracting — NOT cybersecurity), VitalX LLC (HIPAA-compliant healthcare logistics, medical courier, DMV region), and IronHouse Janitorial & Landscaping (Nana Badu's company).

## WHAT'S BUILT AND LIVE
App URL: https://mog-tracker-app.vercel.app
GitHub: github.com/mightyagroup/mog-tracker
Supabase Project: https://lqymdyorcwgeesmkvvob.supabase.co
Vercel: mightyagroup
Login: admin@mightyoakgroup.com (password set)

### Tech Stack
- Next.js 14 (App Router) + Tailwind CSS
- Supabase (PostgreSQL + Auth + RLS)
- Vercel (hosting + cron)
- SAM.gov API key: SAM-1be51989-0151-45de-9afc-3a489af4f5e3 (stored as SAMGOV_API_KEY in Vercel env vars)
- CRON_SECRET set in Vercel env vars

### Completed Phases
- **Phase 1**: Project scaffolding, Supabase schema (migrations 001-015 run), auth, GitHub, Vercel deployment
- **Phase 2**: Exousia tracker — Leads table with filters, sortable columns, status badges, fit scoring (WOSB=35pts, NAICS=25, Location=20, Value=15, Time=5), deadline countdowns, service category badges, detail panel with compliance checklist (16 items auto-created on active_bid), subcontractors tab, active bids, awards, contacts tab with entity-siloed interaction logs
- **Phase 3**: VitalX (government + commercial sections with 178 seeded prospects scored by fit) and IronHouse (Exousia clone, amber #B45309 accent, Nana Badu default proposal lead)
- **Phase 4**: MOG Command Center with pipeline stats, entity cards, visual deadline calendar, category breakdown chart, source breakdown, quick action buttons (Add Lead, Add Contact, Add Subcontractor), Master Contacts page with entity-filtered views and siloed interaction logs
- **Phase 5**: Government CLIN-based pricing calculator (all entities) + Commercial pricing calculator (VitalX only), save to DB, export CSV
- **Phase 6**: SAM.gov auto-feed via /api/cron/sam-feed, Vercel cron daily 6AM EST, 19 leads successfully pulled and routed to entities by NAICS, contracting officer POC data extracted to Master Contacts
- **Compliance Calendar**: /compliance page with Registrations & Certs tab + Subscriptions & Tools tab, monthly spend tracking per entity ($403/mo total), expiration dates with days-until-due countdowns (migration 015 fixed dates)
- **Commercial Prospects**: 178 DMV-area organizations seeded for VitalX with commercial fit scores (Inova 87, MedStar 85, VCU 83, etc.)
- **Contacts**: 9 contracting officers auto-populated from SAM.gov feed
- **Exousia rebrand**: Description = "Facilities management · Procurement · Government contracting support" — NO cybersecurity
- **Low-fit filtering**: Leads meeting <2 of 4 criteria hidden by default with "Show all" toggle
- **Region filter**: Federal/VA State/MD State/Local/Manual
- **CSV Import**: Import button on every entity's Leads tab
- **USASpending auto-lookup**: Built into lead detail panel (was searching by solicitation number — needs fix)

### NAICS Codes (confirmed, do not change)
**Exousia**: 561720, 561730, 561210, 541614, 541990, 561110, 237310 (optional)
**VitalX**: 492110, 492210, 621511, 621610, 485991, 485999, 561990
**IronHouse**: 561720, 561730, 561210

### Entity Branding
- MOG: primary #1F2937, accent #D4AF37
- Exousia: primary #253A5E, accent #D4AF37, UEI XNZ2KYQYK566, CAGE 0ENQ3, tagline "Trust. Honor. Execute."
- VitalX: primary #064E3B, accent #06A59A, phone (571) 622-9133, email info@thevitalx.com
- IronHouse: primary #292524, accent #B45309, Proposal Lead: Nana Badu (21+ yrs facilities experience)

### Supabase Migrations Run
001 (core setup + enums), 002 (service categories + seed), 003 (gov_leads), 004 (commercial_leads), 005 (subcontractors), 006 (contacts), 007 (interactions), 008 (compliance_items), 009 (pricing_records), 010 (compliance_records + seed), 011 (fix compliance RLS), 012 (commercial fit score), 013 (seed commercial prospects 178 orgs), 014 (lead contacts — contracting officer fields), 015 (fix compliance dates)

## WHAT WAS BEING BUILT WHEN SESSION ENDED
I sent the following prompt to Claude Code. It may or may not have finished — check the app and Claude Code to verify:

### Last Prompt Sent to Claude Code:
"Fix these issues thoroughly: (1) Compliance Calendar — add a visual month-view calendar (like the Deadline Calendar on MOG Command) showing registration expirations, renewal dates, and subscription billing dates as colored dots. Each compliance record must have editable start date and expiration/renewal date fields. Keep the table view too — calendar and table as two views. (2) Master Contacts — the Organization field is empty for all SAM.gov-pulled contacts. Update the SAM.gov feed to populate organization from the agency/sub-agency name on each opportunity. Re-run the feed to fix the 9 existing contacts. (3) USASpending lookup is returning 'No prior award data found' for all leads because it's searching by solicitation number which won't exist for new opportunities. Fix the lookup to search by NAICS code + agency name to find historical spending — what has this agency spent on this type of service before? That gives pricing intelligence even on new solicitations. Show results as: total spent by agency on this NAICS in last 3 years, top contractors who won similar work, average award size. (4) Subcontractors — these are NOT SAM.gov companies. These are private local businesses I'd hire to fulfill contract requirements. Build the subcontractor system with service category tags: Electrical, Plumbing, HVAC, Janitorial/Cleaning, Landscaping, Painting, Environmental/Hazmat, Security, General Labor/Staffing, Carpet/Flooring, Pest Control, Locksmith, Fire Protection, Roofing, Window Cleaning, Waste Removal. Each subcontractor record has: company name, contact name, phone, email, website, service tags (multi-select), geographic coverage, and a fit score based on: proximity to Fredericksburg/DMV (25 pts), number of relevant service capabilities (25 pts), online reputation rating field (25 pts), business size/capacity (25 pts). Sort highest to lowest fit. Seed with 20-30 well-known, verifiable DMV-area companies across the major categories that I can confirm and build from. Associate all with Exousia and IronHouse. When a lead is opened, auto-suggest matching subs from the database ranked by fit based on service tag match to the opportunity's category and description keywords. If no matches, show 'No subcontractors match — Add one' with quick-add button. (5) Commercial estimated values — populate est_annual_value for all 178 VitalX prospects based on organization type: Hospital Systems=$120K, Multi-location labs=$80K, Single facility=$40K, CRO=$60K, Specialty Pharmacy=$30K, Home Health=$25K, NEMT Brokers=$50K, Urgent Care=$15K, Blood Banks=$35K, VA/Military=$100K, Dental/Vet Labs=$10K. (6) Leads table deadline column — show full date AND days remaining together like 'Apr 15, 2026 (17d)'. Verify this is working. (7) Required documents per bid — when a lead moves to active_bid, auto-generate a documents-required checklist: capability statement, past performance writeup, pricing worksheet, technical approach, subcontractor agreements, org chart, representations and certifications, cover letter, project schedule. Show completion percentage as a progress bar on the leads table and in the detail panel. Commit and deploy."

## KNOWN ISSUES TO CHECK
1. Verify if the above prompt completed — if not, re-run it
2. If there are new migrations (016+), they need to be run in Supabase SQL Editor at https://supabase.com/dashboard/project/lqymdyorcwgeesmkvvob/sql/new
3. SAM.gov API endpoint: https://api.sam.gov/opportunities/v2/search (NO /prod/ — returns 404)
4. SAM.gov date format: MM/DD/YYYY not ISO
5. USASpending was searching by solicitation number (wrong) — should search by NAICS + agency
6. Master Contacts Organization field was empty — SAM.gov feed needed to pull agency name
7. Commercial prospects had no est_annual_value or contact info beyond websites
8. Subcontractor database was empty — needed seeding with real DMV businesses
9. Compliance Calendar had table view but no visual calendar view
10. Required documents checklist per bid not yet built

## IP PROTECTION & PRODUCTIZATION ROADMAP
The MOG Tracker system and methodology is protectable IP that should be housed under Mighty Oak Tree Holdings LLC (MOTH) via the Oakshield Revocable Trust. Plan:
1. **Copyright register** the source code at Copyright.gov ($65) — automatic copyright exists but registration strengthens enforcement
2. **Document the methodology** as a proprietary framework under MOTH — the multi-entity bid routing, fit scoring algorithm, dual subcontractor matching, compliance tracking, and commercial prospect scoring system
3. **Trademark the product name** (e.g., "MOG Operating System™" or a productized SaaS name like "BidCommand™" or "GovBid OS™") — use the Virginia IP law school clinics (Howard priority, American, Richmond, Liberty)
4. **File trademark under MOTH** since that's where IP lives in the trust structure
5. **Future licensing model**: License the framework to other WOSB/EDWOSB businesses breaking into government contracting — they pay for the system, methodology, and scoring logic
6. This aligns with existing IP strategy: POA&M Remediation-as-a-Service™, ATO-in-a-Box™, Living SSP™, CleanSlate SSP™, Exousia CaaS Framework™, RMF Proposal Kit™, Owner-Led Oversight™

## WHAT'S STILL ON THE ROADMAP (NOT YET BUILT)
- eVA (Virginia) and eMMA (Maryland) auto-feeds for state opportunities
- Email notifications for new leads and approaching deadlines
- Role-based access (admin, viewer, entity-specific) for when I add an assistant or Nana
- Custom domain (mog-tracker.mightyoakgroup.com)
- Mobile PWA (installable on phone)
- Document upload/attachment per lead
- Notion two-way sync (Notion is backup)
- Google Alerts integration for commercial lead discovery
- Commercial prospect contact enrichment (procurement contact names, emails, phones)
- Productize MOG Tracker as licensable SaaS for other small gov contractors

## KEY DECISIONS MADE
- Exousia is facilities management and procurement, NOT cybersecurity — drop all IT/cyber NAICS codes
- Subcontractors are private companies (electricians, plumbers, etc.) NOT SAM.gov registered firms — never search SAM.gov for subs (protects leads from competitors)
- Commercial leads are manual + seeded — no auto-feed exists for commercial (relationship-driven)
- SAM.gov feeds federal leads automatically; eVA/eMMA are manual entry for now
- Make.com eliminated — replaced by Vercel cron
- HubSpot eliminated — replaced by app's leads/contacts/interactions
- GovWin IQ eliminated — replaced by SAM.gov feed + USASpending
- Notion bid trackers replaced by app — Notion stays as backup
- M&T Bank is primary operating bank for VitalX and Exousia
- Wave for MOG/IronHouse invoicing, QuickBooks for Exousia

## HOW I WORK
- I prefer direct communication, no fluff
- I want to be consulted and approve layouts before building
- I prefer additive changes over structural rebuilds unless I explicitly ask
- The project folder is at ~/Documents/Automation/mog-tracker-app/
- Claude Code v2.1.81 runs in VS Code terminal
- Migrations go in supabase/migrations/ and I paste them into Supabase SQL Editor manually using: cat supabase/migrations/FILENAME.sql | pbcopy then Cmd+V in browser
- I use a second VS Code terminal tab (not Claude Code) for pbcopy commands
- I prefer individual file downloads, not ZIP files
- I live in Fredericksburg, Spotsylvania County, VA 22407

## DOCUMENTS TO BUILD IN THIS SESSION
1. **MOG Operating System™ Methodology Document** — formal IP document under MOTH describing the entire system: multi-entity bid routing, fit scoring algorithm, dual subcontractor matching, compliance lifecycle tracking, automated lead intelligence pipeline, commercial prospect scoring, required documents framework. This is the foundation for copyright registration and future licensing.
2. **MOG Tracker Decision Log & Knowledge Base** — every question Ella asked during the build, the solution chosen, and why. Organized by topic: architecture, entity structure, scoring methodology, subcontractor strategy, data integrity rules, tool stack, IP protection, compliance design, SAM.gov lessons. Becomes the operational playbook.

## FUTURE BUILD ROADMAP (IP-WORTHY SYSTEMS)
These are additional systems that can be built, productized under MOTH, and potentially licensed:
1. **VitalX Dispatch & Chain-of-Custody OS** — automated dispatch, GPS tracking, proof-of-delivery, temperature logging, HIPAA-compliant chain-of-custody for medical couriers. Integrates with Tookan/Onfleet. IP: the compliance workflow and COC automation.
2. **Contractor Compliance Engine** — automated 1099 vs W-2 classification checker, contractor onboarding workflow, W-9 collection, agreement generation, annual 1099-NEC filing tracker. Works for any business using independent contractors.
3. **SheMoves™ Partner Platform** — the women-first empowerment program under VitalX. Onboarding portal, training modules, workflow templates, revenue share calculator, partner dashboard. IP: the entire partner model and curriculum.
4. **Compliance-as-a-Service Dashboard** — client-facing compliance dashboard for Exousia's consulting clients. They log in and see their RMF status, POA&M items, ATO progress, SSP health. Productizes Exousia's consulting into a SaaS tool.
5. **Multi-Entity Financial Command Center** — real-time view across all entities: revenue, expenses, contractor payments, tax reserves per entity, cash flow forecasting, bank account balances (Wave/QB integration). Replaces manual spreadsheet tracking.
6. **Grant Readiness Automation** — grant application tracker, document assembler (auto-fills common fields across applications), deadline tracker, submission status. Works for any small business applying for grants.
7. **Proposal Assembly Engine** — takes a solicitation, pulls your capability statement, past performance, pricing data, and org chart, and assembles a draft proposal package. Integrates with DeepRFP. IP: the assembly workflow and template intelligence.
8. **Client Onboarding Portal** — for VitalX healthcare clients. They submit intake forms (Jotform), sign agreements, provide delivery specs, and track order status. Replaces email back-and-forth.
9. **Trust & Entity Management Dashboard** — visualizes the entire Stonehaven/Oakshield trust structure, tracks entity compliance, manages internal leases/licenses between MOG entities, monitors asset allocation under MOTH. IP: the trust management methodology.

All of these can be built as standalone web apps (same stack: Next.js + Supabase + Vercel), documented as proprietary methodologies, copyrighted, and licensed through MOTH.

## FIRST THING TO DO IN THIS SESSION
1. Check Claude Code status — is it still running? What did it finish?
2. Check the app at https://mog-tracker-app.vercel.app for current state
3. If there are pending migrations, tell me which files to run
4. Build the Methodology Document and Decision Log
5. Ask me what I want to work on or fix next
