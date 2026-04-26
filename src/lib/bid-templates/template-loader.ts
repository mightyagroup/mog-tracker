// Template loader — fetches a tokenized .docx/.xlsx template Buffer.
//
// Templates are NOT committed to git (proprietary narrative content carries
// over from Ella's real bid samples). They live in Supabase Storage under
// the `bid-templates` bucket.
//
// At deploy time, run scripts/templates/upload-to-storage.mjs once to
// populate the bucket. Subsequent deploys can reuse the same templates.
//
// Server-side only.

import { createClient } from '@supabase/supabase-js'

const STORAGE_BUCKET = 'bid-templates'
const STORAGE_PREFIX = 'tokenized'

// Phase 1 Bid Starter manifest. Order = generation order.
export const PHASE_1_TEMPLATE_NAMES = [
  '01_Contract_Intel_Sheet.docx',
  '02_USASpending_Deep_Dive.docx',
  '03_Wage_Determination.docx',
  '04a_Proposal_Pricing.docx',
  '04b_Proposal_Technical.docx',
  '05_Subcontractor_Scope_of_Work.docx',
  '06_Sub_Outreach_Email.docx',
  '07_Subcontractor_Search.docx',
  '08_Tracker_Workbook.xlsx',
  '09_To_Do_List.docx',
  '10_Risk_Log.docx',
  '11_Contract_Summary.docx',
  '12_Game_Plan.docx',
  '13_Submission_Checklist.docx',
] as const

// Subset that mirrors to the VA's Drive folder.
// Per handoff: Contract_Summary, Subcontractor_Scope_of_Work, Subcontractor_Search,
// Sub_Outreach folder, To_Do_List, Risk_Log.
// Excludes: Pricing, USASpending_Deep_Dive, Game_Plan, Final_Submission folder.
export const VA_VISIBLE_TEMPLATES = new Set<string>([
  '05_Subcontractor_Scope_of_Work.docx',
  '06_Sub_Outreach_Email.docx',
  '07_Subcontractor_Search.docx',
  '08_Tracker_Workbook.xlsx',
  '09_To_Do_List.docx',
  '10_Risk_Log.docx',
  '11_Contract_Summary.docx',
  '13_Submission_Checklist.docx',
])

export type TemplateName = typeof PHASE_1_TEMPLATE_NAMES[number]

export type LoadResult = {
  buffer: Buffer
  contentType: string
}

/**
 * Fetch a tokenized template by file name from Supabase Storage.
 * Throws if not found — the caller should surface that as a clear setup error.
 */
export async function loadTemplate(templateName: string): Promise<LoadResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase env vars missing — cannot load templates from storage')
  }
  const supabase = createClient(url, key)

  const path = STORAGE_PREFIX + '/' + templateName
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(path)
  if (error) {
    throw new Error('Template not found at ' + STORAGE_BUCKET + '/' + path + ': ' + error.message)
  }
  if (!data) {
    throw new Error('Template returned empty for ' + path)
  }

  const arrayBuffer = await data.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const contentType = templateName.endsWith('.xlsx')
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  return { buffer, contentType }
}

/**
 * Check whether all Phase 1 templates are uploaded. Returns a list of missing
 * names. Empty list = all good.
 */
export async function checkTemplatesAvailable(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return [...PHASE_1_TEMPLATE_NAMES]
  const supabase = createClient(url, key)
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(STORAGE_PREFIX, { limit: 100 })
  if (error || !data) return [...PHASE_1_TEMPLATE_NAMES]
  const present = new Set(data.map(d => d.name))
  return PHASE_1_TEMPLATE_NAMES.filter(n => !present.has(n))
}

export function isVaVisible(templateName: string): boolean {
  return VA_VISIBLE_TEMPLATES.has(templateName)
}
