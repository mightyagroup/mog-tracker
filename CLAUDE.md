# CLAUDE.md — MOG Tracker Web App

## PROJECT OVERVIEW

Build and deploy a full-stack federal/commercial bid tracking web application for Mighty Oak Group (MOG) — a parent management company overseeing three operating entities:

- **Exousia Solutions LLC** — Cybersecurity compliance consulting, facilities management, government contracting
- **VitalX LLC** — HIPAA-compliant healthcare logistics, medical courier, DMV region
- **IronHouse Janitorial & Landscaping Services LLC** — Janitorial, landscaping, facilities maintenance

The app replaces: Notion bid trackers, HubSpot CRM, GovWin IQ, and Make.com automations.
The app works alongside: Google Workspace, SAM.gov, Wave/QuickBooks, Deel, Jotform, Tookan, Calendly, DeepRFP.

---

## OPERATING RULES — READ BEFORE WRITING ANY CODE

### Rule 1: Check Before Building
Before creating any new file, search the project for existing utilities, components, or scripts that do the same thing. Run `grep -r "functionName" src/` or check `src/lib/`, `src/components/ui/`, and `scripts/` first. Do not reinvent.

### Rule 2: Self-Improvement Loop
When you encounter an error, unexpected API behavior, or a workaround:
1. Fix the immediate issue
2. Append the lesson to `LESSONS_LEARNED.md` in the project root
3. Format: `## [Date] — [Topic]\n**Problem:** ...\n**Fix:** ...\n**Prevention:** ...`
4. If it affects future phases, update this CLAUDE.md inline with a `<!-- UPDATED: reason -->` comment

### Rule 3: File Structure Discipline
- All source code: `src/`
- All database migrations: `supabase/migrations/` (numbered: `001_`, `002_`, etc.)
- All scripts (SAM.gov feed, seed data, utilities): `scripts/`
- Temporary/intermediate files: `.tmp/` (gitignored)
- Environment variables: `.env.local` (gitignored, NEVER committed)
- Deliverables and outputs stay in the app or cloud services, not local files

### Rule 4: Error Recovery Protocol
When a command or API call fails:
1. Read the full error message — do not guess
2. Search for the error in official docs (Supabase, Next.js, Vercel)
3. Fix the root cause, not the symptom
4. Verify the fix works
5. Log it in LESSONS_LEARNED.md
6. Continue to the next step only after verification

### Rule 5: Commit After Every Phase
After completing each phase, run:
```bash
git add -A && git commit -m "Phase X: [description]"
git push origin main
```
Verify the Vercel deployment succeeds before moving to the next phase.

### Rule 6: Never Commit Secrets
`.env.local` must be in `.gitignore` from the very first commit. Verify with `git status` before every push. If `.env.local` ever appears in tracked files, stop and fix immediately.

---

## CREDENTIALS — ACTIVE AND VERIFIED

```
NEXT_PUBLIC_SUPABASE_URL=https://lqymdyorcwgeesmkvvob.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxeW1keW9yY3dnZWVzbWt2dm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjgzOTAsImV4cCI6MjA4OTgwNDM5MH0.f9_Jc7HkW96UWfWA3Ut_j34eFcxaSBhzGTgAZkIDMus
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxeW1keW9yY3dnZWVzbWt2dm9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIyODM5MCwiZXhwIjoyMDg5ODA0MzkwfQ.zihLeDPGBtsPskXgT5yqlVS-hLlkF1EARSp3VyKuiPo
```

GitHub: mightyagroup
Vercel: mightyagroup (connected to GitHub)

---

## TECH STACK

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | React-based, SSR, API routes, Vercel-native |
| Styling | Tailwind CSS | Same as artifacts, utility-first, responsive |
| Database | Supabase (PostgreSQL) | Free tier, 50K rows, auth built-in, RLS |
| Auth | Supabase Auth (email/password) | Simple, no OAuth complexity, add users later |
| Hosting | Vercel (free tier) | Auto-deploy from GitHub, edge functions |
| SAM.gov Feed | Python script (cron) | Existing script, adapted to write to Supabase |
| Package Manager | npm | Default for Next.js |

### Dependencies to Install
```bash
npx create-next-app@14 mog-tracker --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd mog-tracker
npm install @supabase/supabase-js @supabase/ssr
npm install lucide-react date-fns
npm install -D supabase
```

**Do NOT install**: any ORM (Prisma, Drizzle), any CSS framework besides Tailwind, any state management library (use React state + Supabase realtime).

---

## APP STRUCTURE — FOUR VIEWS

### 1. MOG Command Center (default landing after login)
- Pipeline summary cards across all three entities
- Total leads / active bids / awards / pipeline value
- Breakdown by entity (Exousia, VitalX, IronHouse)
- Breakdown by service category
- Upcoming deadlines (next 7/14/30 days)
- Master Contacts database (shared across entities)
- Recent activity feed

### 2. Exousia Solutions Tracker
- **Government Only**
- Tabs: Leads | Subcontractors | Active Bids | Awards | Pricing Calculator
- Service categories: Janitorial, Landscaping, Facilities Support, Consulting/Advisory, Administrative, Construction Adjacent
- Source field: SAM.gov, GovWin, eVA, eMMA, Local Government, Manual Entry
- USASpending pricing intelligence per opportunity

### 3. VitalX Tracker
- **Government + Commercial**
- Government Tabs: Leads | Subcontractors | Active Bids | Awards | Pricing Calculator (CLIN-based)
- Commercial Tabs: Prospects | Active Outreach | Contracts | Pricing Calculator (commercial)
- Government categories: Medical Courier/Specimen Transport, Lab Services Support, Home Health/Pharmacy Delivery, NEMT, DNA/Drug Testing, General Support
- Commercial categories: Hospital Systems, Reference Labs, Clinical Research/Biotech, Pharmacy/Specialty, Home Health, NEMT Brokers

### 4. IronHouse Tracker
- **Government Only** (clone of Exousia structure)
- IronHouse branding (use neutral dark theme, differentiate with accent color)
- Default Proposal Lead: Nana Badu
- Same service categories as Exousia
- Same tabs as Exousia

---

## DATABASE SCHEMA

### Important: Supabase-Specific Requirements
- All tables MUST have `id uuid DEFAULT gen_random_uuid() PRIMARY KEY`
- All tables MUST have `created_at timestamptz DEFAULT now()`
- All tables MUST have `updated_at timestamptz DEFAULT now()`
- Create an `updated_at` trigger function FIRST, then apply it to every table
- Enable RLS on every table immediately after creation
- Create RLS policies that allow authenticated users full access (we'll tighten later)

### Migration 001: Core Setup

```sql
-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enum types
CREATE TYPE entity_type AS ENUM ('exousia', 'vitalx', 'ironhouse');
CREATE TYPE lead_status AS ENUM ('new', 'reviewing', 'bid_no_bid', 'active_bid', 'submitted', 'awarded', 'lost', 'no_bid', 'cancelled');
CREATE TYPE commercial_status AS ENUM ('prospect', 'outreach', 'proposal', 'negotiation', 'contract', 'lost', 'inactive');
CREATE TYPE source_type AS ENUM ('sam_gov', 'govwin', 'eva', 'emma', 'local_gov', 'usaspending', 'manual', 'commercial');
CREATE TYPE set_aside_type AS ENUM ('wosb', 'edwosb', '8a', 'hubzone', 'sdvosb', 'small_business', 'total_small_business', 'full_and_open', 'sole_source', 'none');
CREATE TYPE contract_type AS ENUM ('firm_fixed', 'time_materials', 'cost_plus', 'idiq', 'bpa', 'purchase_order', 'commercial');
```

### Migration 002: Service Categories Table

```sql
CREATE TABLE service_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity entity_type NOT NULL,
  name text NOT NULL,
  naics_codes text[] DEFAULT '{}',
  keywords text[] DEFAULT '{}',
  color text DEFAULT '#6B7280',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON service_categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Seed Exousia categories
INSERT INTO service_categories (entity, name, naics_codes, keywords, color, sort_order) VALUES
  ('exousia', 'Janitorial Services', '{561720}', '{janitorial,cleaning,custodial,sanitation}', '#06A59A', 1),
  ('exousia', 'Landscaping', '{561730}', '{landscaping,grounds,lawn,mowing,irrigation}', '#059669', 2),
  ('exousia', 'Facilities Support', '{561210}', '{facilities,building,maintenance,hvac,plumbing}', '#2563EB', 3),
  ('exousia', 'Consulting / Advisory', '{541614,541990}', '{consulting,advisory,cybersecurity,compliance,rmf}', '#7C3AED', 4),
  ('exousia', 'Administrative', '{561110}', '{administrative,management,office,support}', '#D97706', 5),
  ('exousia', 'Construction Adjacent', '{237310}', '{construction,highway,road,infrastructure}', '#DC2626', 6);

-- Seed VitalX Government categories
INSERT INTO service_categories (entity, name, naics_codes, keywords, color, sort_order) VALUES
  ('vitalx', 'Medical Courier / Specimen Transport', '{492110,492210}', '{courier,specimen,transport,delivery,medical,laboratory}', '#06A59A', 1),
  ('vitalx', 'Lab Services Support', '{621511}', '{lab,laboratory,clinical,pathology,testing}', '#0891B2', 2),
  ('vitalx', 'Home Health / Pharmacy Delivery', '{621610}', '{home health,pharmacy,medication,delivery}', '#059669', 3),
  ('vitalx', 'NEMT', '{485991,485999}', '{nemt,non-emergency,transport,patient,medical transport}', '#7C3AED', 4),
  ('vitalx', 'DNA / Drug Testing', '{}', '{dna,drug test,paternity,toxicology,collection}', '#D97706', 5),
  ('vitalx', 'General Support', '{561990}', '{support,services,general}', '#6B7280', 6);

-- Seed IronHouse categories (same as Exousia)
INSERT INTO service_categories (entity, name, naics_codes, keywords, color, sort_order) VALUES
  ('ironhouse', 'Janitorial Services', '{561720}', '{janitorial,cleaning,custodial,sanitation}', '#06A59A', 1),
  ('ironhouse', 'Landscaping', '{561730}', '{landscaping,grounds,lawn,mowing,irrigation}', '#059669', 2),
  ('ironhouse', 'Facilities Support', '{561210}', '{facilities,building,maintenance,hvac,plumbing}', '#2563EB', 3),
  ('ironhouse', 'Consulting / Advisory', '{541614,541990}', '{consulting,advisory,compliance}', '#7C3AED', 4),
  ('ironhouse', 'Administrative', '{561110}', '{administrative,management,office,support}', '#D97706', 5),
  ('ironhouse', 'Construction Adjacent', '{237310}', '{construction,highway,road,infrastructure}', '#DC2626', 6);
```

### Migration 003: Government Leads Table

```sql
CREATE TABLE gov_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity entity_type NOT NULL,
  
  -- Opportunity Info
  title text NOT NULL,
  solicitation_number text,
  notice_id text,
  description text,
  
  -- Classification
  status lead_status DEFAULT 'new',
  service_category_id uuid REFERENCES service_categories(id),
  naics_code text,
  set_aside set_aside_type DEFAULT 'none',
  contract_type contract_type,
  source source_type DEFAULT 'manual',
  
  -- Agency
  agency text,
  sub_agency text,
  office text,
  place_of_performance text,
  
  -- Dates
  posted_date date,
  response_deadline timestamptz,
  archive_date date,
  
  -- Financials
  estimated_value numeric(15,2),
  award_amount numeric(15,2),
  
  -- USASpending Intelligence
  previous_award_total numeric(15,2),
  incumbent_contractor text,
  award_history_notes text,
  
  -- Scoring (auto-calculated)
  fit_score int DEFAULT 0 CHECK (fit_score >= 0 AND fit_score <= 100),
  
  -- Assignment
  proposal_lead text,
  
  -- Links
  sam_gov_url text,
  solicitation_url text,
  drive_folder_url text,
  
  -- Notes
  notes text,
  bid_decision_notes text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_gov_leads_updated_at
  BEFORE UPDATE ON gov_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_gov_leads_entity ON gov_leads(entity);
CREATE INDEX idx_gov_leads_status ON gov_leads(status);
CREATE INDEX idx_gov_leads_category ON gov_leads(service_category_id);
CREATE INDEX idx_gov_leads_deadline ON gov_leads(response_deadline);
CREATE INDEX idx_gov_leads_source ON gov_leads(source);

ALTER TABLE gov_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON gov_leads
  FOR ALL USING (auth.role() = 'authenticated');
```

### Migration 004: Commercial Leads Table (VitalX only)

```sql
CREATE TABLE commercial_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity entity_type DEFAULT 'vitalx',
  
  -- Organization Info
  organization_name text NOT NULL,
  contact_name text,
  contact_title text,
  contact_email text,
  contact_phone text,
  website text,
  
  -- Classification
  status commercial_status DEFAULT 'prospect',
  service_category text, -- free-form: Hospital Systems, Reference Labs, etc.
  
  -- Deal Info
  estimated_annual_value numeric(15,2),
  contract_length_months int,
  
  -- Outreach Tracking
  last_contact_date date,
  next_follow_up date,
  outreach_method text, -- email, phone, linkedin, in-person, referral
  
  -- Contract Details (when won)
  contract_start_date date,
  contract_end_date date,
  contract_value numeric(15,2),
  
  -- Links
  proposal_url text,
  drive_folder_url text,
  
  -- Notes
  notes text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_commercial_leads_updated_at
  BEFORE UPDATE ON commercial_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_commercial_leads_status ON commercial_leads(status);
CREATE INDEX idx_commercial_leads_follow_up ON commercial_leads(next_follow_up);

ALTER TABLE commercial_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON commercial_leads
  FOR ALL USING (auth.role() = 'authenticated');
```

### Migration 005: Subcontractors Table

```sql
CREATE TABLE subcontractors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Company Info
  company_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  
  -- Certifications
  uei text,
  cage_code text,
  certifications text[] DEFAULT '{}', -- WOSB, 8a, HUBZone, SDVOSB, etc.
  naics_codes text[] DEFAULT '{}',
  set_asides text[] DEFAULT '{}',
  
  -- Capabilities
  services_offered text,
  geographic_coverage text,
  
  -- Relationship
  entities_associated entity_type[] DEFAULT '{}', -- which MOG entities use this sub
  teaming_agreement_status text DEFAULT 'none', -- none, drafting, executed
  teaming_agreement_url text,
  
  -- Notes
  notes text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_subcontractors_updated_at
  BEFORE UPDATE ON subcontractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON subcontractors
  FOR ALL USING (auth.role() = 'authenticated');
```

### Migration 006: Master Contacts Table

```sql
CREATE TABLE contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Person Info
  first_name text NOT NULL,
  last_name text NOT NULL,
  title text,
  organization text,
  email text,
  phone text,
  linkedin text,
  
  -- Classification
  contact_type text DEFAULT 'general', -- prospect, partner, contracting_officer, mentor, vendor, subcontractor
  entities_associated entity_type[] DEFAULT '{}',
  
  -- Interaction
  last_contact_date date,
  next_follow_up date,
  relationship_notes text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON contacts
  FOR ALL USING (auth.role() = 'authenticated');
```

### Migration 007: Interaction Log Table

```sql
CREATE TABLE interactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- References
  entity entity_type,
  gov_lead_id uuid REFERENCES gov_leads(id) ON DELETE SET NULL,
  commercial_lead_id uuid REFERENCES commercial_leads(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  subcontractor_id uuid REFERENCES subcontractors(id) ON DELETE SET NULL,
  
  -- Interaction Details
  interaction_date date DEFAULT CURRENT_DATE,
  interaction_type text, -- email, phone, meeting, linkedin, proposal, site_visit
  subject text,
  notes text,
  follow_up_date date,
  follow_up_action text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_interactions_updated_at
  BEFORE UPDATE ON interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON interactions
  FOR ALL USING (auth.role() = 'authenticated');
```

### Migration 008: Compliance Checklist Table

```sql
CREATE TABLE compliance_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  gov_lead_id uuid REFERENCES gov_leads(id) ON DELETE CASCADE,
  
  item_name text NOT NULL,
  is_complete boolean DEFAULT false,
  due_date date,
  assigned_to text,
  notes text,
  sort_order int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_compliance_items_updated_at
  BEFORE UPDATE ON compliance_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON compliance_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Default compliance checklist template (inserted per bid when moved to active)
-- These are created via application logic, not seed data
```

### Migration 009: Pricing Data Table (for saved pricing calculations)

```sql
CREATE TABLE pricing_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  entity entity_type NOT NULL,
  pricing_type text NOT NULL, -- 'government' or 'commercial'
  
  -- Reference
  gov_lead_id uuid REFERENCES gov_leads(id) ON DELETE SET NULL,
  commercial_lead_id uuid REFERENCES commercial_leads(id) ON DELETE SET NULL,
  
  -- Pricing Data (stored as JSONB for flexibility)
  -- Government: { clins: [{ clinNumber, description, qty, unit, unitCost, ... }], totals: {...} }
  -- Commercial: { lines: [{ service, frequency, unitCost, units, ... }], totals: {...} }
  pricing_data jsonb NOT NULL DEFAULT '{}',
  
  -- Summary
  total_price numeric(15,2),
  total_cost numeric(15,2),
  margin_percent numeric(5,2),
  
  -- Metadata
  version int DEFAULT 1,
  is_submitted boolean DEFAULT false,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_pricing_records_updated_at
  BEFORE UPDATE ON pricing_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE pricing_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything" ON pricing_records
  FOR ALL USING (auth.role() = 'authenticated');
```

---

## PHASE 1: Project Scaffolding + Supabase + Auth + GitHub + Vercel

### Step 1.1: Create Next.js Project
```bash
npx create-next-app@14 mog-tracker --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd mog-tracker
```

### Step 1.2: Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install lucide-react date-fns
npm install -D supabase
```

### Step 1.3: Environment Variables
Create `.env.local` (NEVER commit this):
```
NEXT_PUBLIC_SUPABASE_URL=https://lqymdyorcwgeesmkvvob.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxeW1keW9yY3dnZWVzbWt2dm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjgzOTAsImV4cCI6MjA4OTgwNDM5MH0.f9_Jc7HkW96UWfWA3Ut_j34eFcxaSBhzGTgAZkIDMus
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxeW1keW9yY3dnZWVzbWt2dm9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIyODM5MCwiZXhwIjoyMDg5ODA0MzkwfQ.zihLeDPGBtsPskXgT5yqlVS-hLlkF1EARSp3VyKuiPo
```

Immediately add to `.gitignore`:
```
.env.local
.env*.local
```

**Verify**: Run `cat .gitignore | grep env` — must show `.env.local`.

### Step 1.4: Supabase Client Setup
Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — ignore
          }
        },
      },
    }
  )
}
```

Create `src/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

Create `src/middleware.ts`:
```typescript
import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/cron).*)'],
}
```

### Step 1.5: Run Database Migrations
Create a script `scripts/setup-db.ts` that uses the service role key to run all migrations against the Supabase REST API. Alternatively, use the Supabase Dashboard SQL Editor:

1. Go to https://supabase.com/dashboard/project/lqymdyorcwgeesmkvvob/sql
2. Run each migration file in order (001 through 009)
3. Verify each table exists in the Table Editor

**PREFERRED METHOD**: Create migration SQL files in `supabase/migrations/` and run them via a Node script using `fetch` against the Supabase SQL endpoint:
```
POST https://lqymdyorcwgeesmkvvob.supabase.co/rest/v1/rpc
```

Or even simpler — create a single `scripts/run-migrations.mjs` file:
```javascript
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  'https://lqymdyorcwgeesmkvvob.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY // from .env.local
)

// Read and execute each migration file in order
const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
const files = fs.readdirSync(migrationsDir).sort()

for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
  const { error } = await supabase.rpc('exec_sql', { sql_text: sql })
  if (error) {
    console.error(`Migration ${file} failed:`, error)
    // Log to LESSONS_LEARNED.md
    process.exit(1)
  }
  console.log(`✓ ${file}`)
}
```

**IMPORTANT**: The `rpc('exec_sql')` function may not exist by default. If it fails, fall back to running SQL directly in the Supabase Dashboard SQL Editor. Log this in LESSONS_LEARNED.md if encountered.

**FALLBACK**: If programmatic migration fails, paste each migration SQL block into the Supabase SQL Editor at:
`https://supabase.com/dashboard/project/lqymdyorcwgeesmkvvob/sql/new`

After all migrations, verify by running:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```
Expected tables: `commercial_leads`, `compliance_items`, `contacts`, `gov_leads`, `interactions`, `pricing_records`, `service_categories`, `subcontractors`

### Step 1.6: Auth Setup
Create login page at `src/app/login/page.tsx`:
- Simple email/password form
- MOG branding (dark background, gold accent)
- Error handling for invalid credentials
- Redirect to `/` on success

Create the admin user via script `scripts/create-admin.mjs`:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lqymdyorcwgeesmkvvob.supabase.co',
  'SERVICE_ROLE_KEY_HERE' // Replace at runtime, never hardcode
)

const { data, error } = await supabase.auth.admin.createUser({
  email: 'admin@mightyoakgroup.com',
  password: 'ASK_ELLA_FOR_PASSWORD', // <-- ASK for this
  email_confirm: true
})

if (error) console.error('Failed:', error)
else console.log('Admin user created:', data.user.id)
```

**STOP AND ASK ELLA FOR HER DESIRED ADMIN PASSWORD BEFORE RUNNING THIS SCRIPT.**

### Step 1.7: GitHub Setup
```bash
git init
git add -A
git commit -m "Phase 1: Project scaffolding, Supabase config, auth, database schema"
gh repo create mightyagroup/mog-tracker --public --source=. --push
```

If `gh` CLI is not installed:
```bash
git remote add origin https://github.com/mightyagroup/mog-tracker.git
git branch -M main
git push -u origin main
```

### Step 1.8: Vercel Deployment
```bash
npx vercel --yes
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel --prod
```

**Verify**: Open the Vercel URL in browser. Should show login page. Log in with admin credentials. Should redirect to empty dashboard.

**CHECKPOINT**: Before proceeding to Phase 2, confirm:
- [ ] All 8 tables exist in Supabase
- [ ] Service categories are seeded (18 rows)
- [ ] Login works with admin credentials
- [ ] App is live on Vercel
- [ ] GitHub repo has first commit

---

## PHASE 2: Entity Tracker UI — Exousia (Template)

### Layout Structure
```
src/app/
  layout.tsx          — Root layout with sidebar nav
  page.tsx            — MOG Command (Phase 4)
  login/page.tsx      — Login (Phase 1)
  exousia/
    page.tsx          — Exousia tracker
  vitalx/
    page.tsx          — VitalX tracker (Phase 3)
  ironhouse/
    page.tsx          — IronHouse tracker (Phase 3)
  
src/components/
  layout/
    Sidebar.tsx       — Entity navigation
    Header.tsx        — Page header with entity name + branding
  tracker/
    LeadsTable.tsx    — Government leads table with filters
    LeadDetailPanel.tsx — Slide-over panel for lead details
    SubcontractorsTable.tsx
    ActiveBidsTable.tsx
    AwardsTable.tsx
    StatusBadge.tsx
    CategoryBadge.tsx
    DeadlineCountdown.tsx
    FitScoreBadge.tsx
    TabNav.tsx        — Tab switching (Leads, Subs, Active Bids, Awards, Pricing)
  pricing/
    GovPricingCalculator.tsx    — CLIN-based pricing (Phase 5)
    CommercialPricingCalculator.tsx — Commercial pricing (Phase 5)
  contacts/
    ContactsTable.tsx
    ContactDetailPanel.tsx
  common/
    SearchBar.tsx
    FilterDropdown.tsx
    SortableHeader.tsx
    EmptyState.tsx
    LoadingSpinner.tsx
    Modal.tsx
    ConfirmDialog.tsx
```

### Sidebar Navigation
- MOG logo/wordmark at top
- Nav items: MOG Command, Exousia, VitalX, IronHouse
- Each entity shows its accent color
- Collapsible on mobile (hamburger menu)
- Current entity highlighted

### Branding Colors
```typescript
const ENTITY_BRANDING = {
  mog: { primary: '#1F2937', accent: '#D4AF37', name: 'MOG Command' },
  exousia: { primary: '#253A5E', accent: '#D4AF37', name: 'Exousia Solutions' },
  vitalx: { primary: '#064E3B', accent: '#06A59A', name: 'VitalX' },
  ironhouse: { primary: '#292524', accent: '#B45309', name: 'IronHouse' },
}
```

### Leads Table Features
- Sortable columns: Title, Agency, Deadline, Value, Fit Score, Status, Category
- Filter by: Status, Category, Set-Aside, Source, Date Range
- Search: Full-text search across title, description, agency, solicitation number
- Inline status change (dropdown in table row)
- Click row to open detail panel
- Deadline countdown badge: green (>14 days), yellow (7-14), red (<7), black (overdue)
- Fit score badge: color-coded 0-100
- Category badge: colored pill with category name
- Bulk actions: change status, assign lead, delete
- "Add Lead" button opens modal with full form
- Export to CSV

### Lead Detail Panel (slide-over from right)
- Full opportunity details
- Editable fields
- Compliance checklist (auto-generated when status changes to active_bid)
- Interaction log for this lead
- Pricing link (opens pricing calculator pre-filled)
- USASpending data section
- Drive folder link
- SAM.gov link

### Default Compliance Checklist Items (auto-created when lead moves to active_bid)
```typescript
const DEFAULT_COMPLIANCE_ITEMS = [
  'Download and review full solicitation',
  'Identify all submission requirements',
  'Confirm NAICS code and size standard',
  'Verify SAM.gov registration is active',
  'Check set-aside eligibility',
  'Identify evaluation criteria and weights',
  'Review past performance requirements',
  'Draft technical approach',
  'Complete pricing worksheet',
  'Identify subcontractors needed',
  'Draft subcontractor agreements',
  'Prepare past performance references',
  'Internal review and quality check',
  'Final pricing review',
  'Submit proposal before deadline',
  'Confirm receipt of submission',
]
```

### Fit Score Auto-Calculation
```typescript
function calculateFitScore(lead: GovLead, entity: EntityType): number {
  let score = 0
  
  // NAICS match (0-30 points)
  const entityNaics = ENTITY_NAICS[entity]
  if (lead.naics_code && entityNaics.includes(lead.naics_code)) score += 30
  
  // Set-aside match (0-25 points)
  if (lead.set_aside === 'wosb' || lead.set_aside === 'edwosb') score += 25
  else if (lead.set_aside === 'small_business' || lead.set_aside === 'total_small_business') score += 15
  else if (lead.set_aside === 'full_and_open') score += 5
  
  // Value range (0-15 points) — sweet spot $50K-$500K
  const val = lead.estimated_value || 0
  if (val >= 50000 && val <= 500000) score += 15
  else if (val > 500000 && val <= 2000000) score += 10
  else if (val > 0 && val < 50000) score += 5
  
  // Location match (0-15 points) — DMV area
  const loc = (lead.place_of_performance || '').toLowerCase()
  if (loc.includes('virginia') || loc.includes('maryland') || loc.includes('dc') || loc.includes('washington')) score += 15
  
  // Time to respond (0-15 points)
  if (lead.response_deadline) {
    const daysLeft = Math.ceil((new Date(lead.response_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysLeft >= 14) score += 15
    else if (daysLeft >= 7) score += 10
    else if (daysLeft >= 3) score += 5
  }
  
  return Math.min(score, 100)
}
```

### NAICS Codes Per Entity
```typescript
const ENTITY_NAICS: Record<EntityType, string[]> = {
  exousia: ['561720', '561730', '561210', '541614', '541990', '561110', '237310'],
  vitalx: ['492110', '492210', '621511', '621610', '485991', '485999', '561990'],
  ironhouse: ['561720', '561730', '561210', '541614', '541990', '561110', '237310'],
}
```

### Mobile Responsiveness Requirements
- Sidebar collapses to bottom nav on mobile
- Tables become card views on screens < 768px
- Detail panel becomes full-screen on mobile
- Touch-friendly tap targets (min 44px)
- Pricing calculator stacks vertically on mobile

**Commit after Phase 2**: `git add -A && git commit -m "Phase 2: Exousia tracker UI — leads, subs, bids, awards" && git push`

---

## PHASE 3: VitalX + IronHouse Trackers

### VitalX Additions
- Two-section layout: Government section (identical to Exousia) + Commercial section
- Commercial tabs: Prospects | Active Outreach | Contracts
- Commercial table: organization name, contact, status, value, last contact, next follow-up, category
- Commercial detail panel: contact info, deal info, outreach history, contract details
- VitalX accent color: teal (#06A59A)

### IronHouse
- Clone Exousia tracker structure exactly
- Change branding to IronHouse colors (dark stone #292524, amber accent #B45309)
- Default Proposal Lead: "Nana Badu" pre-filled on all new leads
- Same service categories as Exousia

### Entity Switcher
- Sidebar navigation handles entity switching
- URL-based routing: `/exousia`, `/vitalx`, `/ironhouse`
- Each entity page is its own route with shared components
- Entity context passed via route params, not global state

**Commit after Phase 3**: `git add -A && git commit -m "Phase 3: VitalX + IronHouse trackers" && git push`

---

## PHASE 4: MOG Command Center + Master Contacts

### MOG Command Dashboard (`/` route)
- **Pipeline Summary Cards**: Total leads, active bids, awards, pipeline value — per entity and aggregate
- **Deadline Calendar**: Visual calendar showing upcoming deadlines across all entities
- **Category Breakdown**: Chart/table showing leads by service category across entities
- **Source Breakdown**: Leads by source (SAM.gov, eVA, eMMA, Local, Manual)
- **Recent Activity**: Last 20 interactions/status changes across all entities
- **Quick Actions**: Add lead, add contact, add subcontractor

### Master Contacts (`/contacts` route)
- Shared contacts table (not entity-specific)
- Columns: Name, Organization, Type, Email, Phone, Associated Entities, Last Contact, Next Follow-Up
- Detail panel with full info + interaction history
- Contact types: Prospect, Partner, Contracting Officer, Mentor, Vendor, Subcontractor

### MOG Branding
- Dark gray (#1F2937) primary, gold (#D4AF37) accent
- Wordmark: "Mighty Oak Group" or "MOG" — use text, no custom fonts needed

**Commit after Phase 4**: `git add -A && git commit -m "Phase 4: MOG Command Center + Master Contacts" && git push`

---

## PHASE 5: Pricing Calculators

### Government Pricing Calculator (all entities)
Replicate the artifact pricing calculator with these features:

**CLIN-Based Layout:**
- Add/remove CLIN rows
- Per CLIN: CLIN Number, Description, Quantity, Unit (each, hour, month, lot, sqft), Unit Cost, Extended Price
- Sub-cost breakdown per CLIN: Labor, Materials, Equipment, Subcontractor, Overhead, Other
- Margin input per CLIN (percentage)
- Auto-calculate: Extended Price = Qty × Unit Cost, Total Cost, Total Price, Margin Amount, Margin %

**Summary Section:**
- Total Base Cost
- Total Overhead (% input)
- Total G&A (% input)
- Total Profit/Fee (% input)
- Grand Total Price
- Blended margin percentage

**Actions:**
- Save pricing to database (linked to gov_lead_id)
- Export to CSV
- Version history (each save creates new version)

### Commercial Pricing Calculator (VitalX only)
Replicate the VitalX commercial pricing artifact:

**Per-Line Items:**
- Service Description
- Frequency (per trip, daily, weekly, monthly, per specimen, per test)
- Unit Cost
- Number of Units
- Extended Price
- Driver Cost, Fuel Cost, Supply Cost, Other Cost breakdown

**Summary Section:**
- Total Revenue
- Total Cost breakdown (driver, fuel, supply, other)
- Gross Margin ($ and %)
- Net Margin after overhead

**Actions:**
- Save pricing (linked to commercial_lead_id)
- Export to CSV

### UI for Both Calculators
- Live-calculating — every field updates totals instantly
- Currency formatting ($X,XXX.XX)
- Teal theme for VitalX commercial, navy for government
- Tab within each entity tracker (Pricing tab)
- Can also be opened standalone from a lead's detail panel

**Commit after Phase 5**: `git add -A && git commit -m "Phase 5: Government + Commercial pricing calculators" && git push`

---

## PHASE 6: SAM.gov Feed Integration + Final Deploy

### SAM.gov API Integration
Create `scripts/sam-feed.py` (or adapt the existing Python script):

**SAM.gov API Endpoint:**
```
https://api.sam.gov/prod/opportunities/v2/search
```
**Note the `/prod/` in the URL — this was a lesson learned. Without it, the API returns 404.**

**Parameters:**
```python
params = {
    'api_key': 'YOUR_SAM_API_KEY',  # Get from api.sam.gov
    'postedFrom': (datetime.now() - timedelta(days=7)).strftime('%m/%d/%Y'),
    'postedTo': datetime.now().strftime('%m/%d/%Y'),
    'naics': ','.join(ALL_NAICS_CODES),
    'limit': 100,
    'offset': 0,
}
```

**NAICS codes to query (combined across all entities):**
```
561720,561730,561210,541614,541990,561110,237310,492110,492210,621511,621610,485991,485999,561990
```

**Entity routing logic:**
```python
ENTITY_NAICS = {
    'exousia': ['561720', '561730', '561210', '541614', '541990', '561110', '237310'],
    'vitalx': ['492110', '492210', '621511', '621610', '485991', '485999', '561990'],
    'ironhouse': ['561720', '561730', '561210', '541614', '541990', '561110', '237310'],
}

def route_to_entity(naics_code):
    """Route opportunity to correct entity based on NAICS code."""
    entities = []
    for entity, codes in ENTITY_NAICS.items():
        if naics_code in codes:
            entities.append(entity)
    return entities  # May route to multiple entities (e.g., Exousia AND IronHouse)
```

**Service category auto-assignment:**
- Match NAICS code to service_categories table
- If no NAICS match, scan description for keywords
- If no keyword match, assign to "General Support" / last category

**Deduplication:**
- Check `solicitation_number` before inserting
- If exists, update fields (deadline may have changed)
- If new, insert with status='new'

**Write to Supabase:**
```python
from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

for opp in opportunities:
    entities = route_to_entity(opp['naics_code'])
    category = match_service_category(opp)
    
    for entity in entities:
        existing = supabase.table('gov_leads') \
            .select('id') \
            .eq('solicitation_number', opp['solicitation_number']) \
            .eq('entity', entity) \
            .execute()
        
        if existing.data:
            # Update
            supabase.table('gov_leads') \
                .update({...}) \
                .eq('id', existing.data[0]['id']) \
                .execute()
        else:
            # Insert
            supabase.table('gov_leads') \
                .insert({...}) \
                .execute()
```

**Running the feed:**
- Manual: `python scripts/sam-feed.py`
- Automated: Set up as GitHub Action cron (runs daily at 6 AM EST)

### GitHub Action for SAM.gov Cron
Create `.github/workflows/sam-feed.yml`:
```yaml
name: SAM.gov Daily Feed
on:
  schedule:
    - cron: '0 11 * * *'  # 11 UTC = 6 AM EST / 7 AM EDT
  workflow_dispatch:  # Allow manual trigger

jobs:
  feed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install supabase requests python-dateutil
      - run: python scripts/sam-feed.py
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          SAM_API_KEY: ${{ secrets.SAM_API_KEY }}
```

**IMPORTANT**: The SAM.gov API key needs to be obtained from https://api.sam.gov. If Ella doesn't have one yet, the feed can be tested with manual entry first, and the API key added to GitHub Secrets later.

### Alternative: Next.js API Route for SAM.gov Feed
If GitHub Actions feel too complex, create an API route at `src/app/api/cron/sam-feed/route.ts` that Vercel Cron calls daily. This keeps everything in one codebase.

```typescript
// src/app/api/cron/sam-feed/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // SAM.gov fetch logic here...

  return NextResponse.json({ success: true, count: insertedCount })
}
```

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sam-feed",
      "schedule": "0 11 * * *"
    }
  ]
}
```

### Final Deployment
```bash
git add -A
git commit -m "Phase 6: SAM.gov feed integration + cron setup"
git push origin main
npx vercel --prod
```

### Post-Deploy Verification Checklist
- [ ] Login page works
- [ ] MOG Command shows empty dashboard
- [ ] Exousia tracker loads with all tabs
- [ ] VitalX tracker loads with government + commercial sections
- [ ] IronHouse tracker loads with Nana Badu as default lead
- [ ] Can add a lead manually in each entity
- [ ] Lead auto-categorizes into service category
- [ ] Fit score calculates on lead creation
- [ ] Deadline countdown badge shows correctly
- [ ] Moving lead to active_bid creates compliance checklist
- [ ] Can add/edit subcontractors
- [ ] Master contacts work
- [ ] Government pricing calculator calculates live
- [ ] Commercial pricing calculator calculates live
- [ ] Can save pricing to a lead
- [ ] Mobile: sidebar collapses, tables become cards, panels go full-screen
- [ ] SAM.gov feed script runs without errors (if API key available)

---

## SEED DATA (Pre-populate after first deploy)

### Known Subcontractors
```sql
INSERT INTO subcontractors (company_name, contact_name, certifications, entities_associated, teaming_agreement_status, notes) VALUES
('TommyLee Capital LLC', 'Natalie Rosario', '{WOSB}', '{exousia}', 'executed', 'Environmental remediation. Hispanic American-owned. Teaming partner.'),
('IronHouse Janitorial & Landscaping Services LLC', 'Nana Badu', '{}', '{exousia,vitalx}', 'executed', 'Physical facilities subcontractor. Internal MOG entity.');
```

### Known Commercial Prospects (VitalX)
```sql
INSERT INTO commercial_leads (entity, organization_name, service_category, status, notes) VALUES
('vitalx', 'Quest Diagnostics', 'Reference Labs', 'prospect', 'National lab. Target for specimen courier services.'),
('vitalx', 'Labcorp', 'Reference Labs', 'prospect', 'National lab. Target for specimen courier services.'),
('vitalx', 'VCU Health', 'Hospital Systems', 'prospect', 'Richmond-area health system.'),
('vitalx', 'MedStar Health', 'Hospital Systems', 'prospect', 'DMV-area health system. Multiple facilities.'),
('vitalx', 'Inova Health System', 'Hospital Systems', 'prospect', 'Northern Virginia health system.'),
('vitalx', 'Johns Hopkins Medicine', 'Hospital Systems', 'prospect', 'Baltimore-area. Major research hospital.'),
('vitalx', 'Children''s National Hospital', 'Hospital Systems', 'prospect', 'DC pediatric hospital.'),
('vitalx', 'George Washington University Hospital', 'Hospital Systems', 'prospect', 'DC-area hospital.'),
('vitalx', 'Kaiser Permanente Mid-Atlantic', 'Hospital Systems', 'prospect', 'Multi-state health system in DMV.'),
('vitalx', 'Sentara Healthcare', 'Hospital Systems', 'prospect', 'Virginia-based health system.'),
('vitalx', 'Novant Health UVA Health System', 'Hospital Systems', 'prospect', 'Central Virginia health system.'),
('vitalx', 'BioReference Laboratories', 'Reference Labs', 'prospect', 'Specialty lab services.'),
('vitalx', 'ICON plc', 'Clinical Research/Biotech', 'prospect', 'CRO. Clinical trial specimen logistics.');
```

### Priority Government Lead (VitalX)
```sql
INSERT INTO gov_leads (entity, title, solicitation_number, status, source, agency, naics_code, set_aside, notes) VALUES
('vitalx', 'NIAID Medical Courier Services', 'RFQ-NIAID-25-2259905', 'reviewing', 'sam_gov', 'National Institute of Allergy and Infectious Diseases', '492110', 'small_business', 'Recompete. Top priority. Watch for solicitation release.');
```

---

## APPENDIX A: Entity Reference Data

### Exousia Solutions LLC
- **UEI**: XNZ2KYQYK566
- **CAGE**: 0ENQ3
- **SAM.gov Email**: admin@exousiaofficial.com
- **Public Email**: info@exousias.com
- **Brand Colors**: Navy #253A5E, Gold #D4AF37, Off-White #F9F9F9
- **Tagline**: "Trust. Honor. Execute."
- **NAICS**: 561720, 561730, 561210, 541614, 541990, 561110, 237310
- **Past Performance**: Federal cybersecurity compliance support for SEC through Zvolvant Solutions LLC and GDIT

### VitalX LLC
- **Brand Colors**: Teal #06A59A, Dark Green #064E3B
- **Website**: www.thevitalx.com
- **Email**: info@thevitalx.com
- **Phone**: (571) 622-9133
- **NAICS**: 492110, 492210, 621511, 621610, 485991, 485999, 561990
- **SAM.gov**: Needs registration (not yet registered)

### IronHouse Janitorial & Landscaping Services LLC
- **Owner**: Nana Badu (21+ years facilities experience, Fairfax County Public Schools)
- **NAICS**: 561720, 561730, 561210
- **Default Proposal Lead**: Nana Badu

### Mighty Oak Group LLC (MOG)
- **Role**: Parent management company
- **Email**: admin@mightyoakgroup.com

---

## APPENDIX B: Troubleshooting

### Common Supabase Issues
1. **RLS blocks all reads**: If tables return empty despite having data, check that RLS policies exist. Run: `SELECT * FROM pg_policies WHERE tablename = 'gov_leads';`
2. **updated_at not updating**: Verify trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE 'update_%';`
3. **Auth user creation fails**: Ensure you're using the service role key, not the anon key.
4. **CORS errors**: Supabase handles CORS automatically for the anon key. If errors occur, verify the URL in `.env.local` has no trailing slash.

### Common Vercel Issues
1. **Environment variables not loading**: Redeploy after adding env vars. Vercel caches builds.
2. **Build fails on types**: Run `npm run build` locally first to catch TypeScript errors.
3. **API routes timeout**: Vercel free tier has 10-second limit for serverless functions. SAM.gov feed may need to be split into smaller batches.

### Common Next.js Issues
1. **"use client" missing**: Any component using useState, useEffect, or event handlers needs `"use client"` at the top.
2. **Server/client mismatch**: Supabase client creation differs between server components and client components. Use the correct import.
3. **Middleware not running**: Check the `matcher` config in `src/middleware.ts`. The login route must be excluded.

### SAM.gov API Issues
1. **404 error**: Ensure URL includes `/prod/` — `https://api.sam.gov/prod/opportunities/v2/search`
2. **Rate limiting**: SAM.gov allows 10 requests per minute. Add delay between paginated requests.
3. **Date format**: SAM.gov expects `MM/DD/YYYY`, not ISO format.
4. **Empty results**: Check that NAICS codes are comma-separated with no spaces.

---

## APPENDIX C: Future Enhancements (NOT in current build)

- eVA (Virginia) and eMMA (Maryland) auto-feeds
- USASpending.gov API integration for pricing intelligence
- Email notifications for new leads and approaching deadlines
- Role-based access (admin, viewer, entity-specific)
- Custom domain (mog-tracker.mightyoakgroup.com)
- Notion two-way sync
- DeepRFP integration link
- Mobile PWA (installable on phone home screen)
- Dashboard charts (pipeline value over time, win rate)
- Document upload/attachment per lead (using Supabase Storage)
