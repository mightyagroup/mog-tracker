// CLIN skeleton templates per NAICS. Pre-populates the pricing calculator so
// Ella isn't starting from blank every bid.

export type ClinTemplate = {
  naics: string
  label: string
  clins: Array<{
    clinNumber: string
    description: string
    qty: number
    unit: string
    unitCostPlaceholder: number   // a reasonable starting point, user adjusts
    subCosts: Partial<{ labor: number; materials: number; equipment: number; subcontractor: number; overhead: number; other: number }>
    marginPercent: number
    notes?: string
  }>
}

export const CLIN_TEMPLATES: Record<string, ClinTemplate> = {
  // ── Exousia / IronHouse ────────────────────────────────────────────────────
  '561720': {
    naics: '561720',
    label: 'Janitorial Services',
    clins: [
      { clinNumber: '0001', description: 'Base Janitorial Services', qty: 12, unit: 'month', unitCostPlaceholder: 8500, subCosts: { labor: 6000, materials: 800, equipment: 400, overhead: 500 }, marginPercent: 18 },
      { clinNumber: '0002', description: 'Supplies (restroom paper, soap, liners)', qty: 12, unit: 'month', unitCostPlaceholder: 600, subCosts: { materials: 500 }, marginPercent: 15 },
      { clinNumber: '0003', description: 'Floor Care (strip/wax/buff quarterly)', qty: 4, unit: 'each', unitCostPlaceholder: 2500, subCosts: { labor: 1600, materials: 500, equipment: 200 }, marginPercent: 20 },
      { clinNumber: '0004', description: 'Carpet Extraction (annual)', qty: 1, unit: 'each', unitCostPlaceholder: 1800, subCosts: { labor: 1100, equipment: 400 }, marginPercent: 20, notes: 'Option CLIN' },
    ],
  },
  '561730': {
    naics: '561730',
    label: 'Landscaping Services',
    clins: [
      { clinNumber: '0001', description: 'Mowing (weekly Apr-Oct, biweekly Nov-Mar)', qty: 32, unit: 'each', unitCostPlaceholder: 425, subCosts: { labor: 260, equipment: 100 }, marginPercent: 18 },
      { clinNumber: '0002', description: 'Fertilization (4 applications/yr)', qty: 4, unit: 'each', unitCostPlaceholder: 800, subCosts: { materials: 450, labor: 200 }, marginPercent: 20 },
      { clinNumber: '0003', description: 'Mulching (spring + fall)', qty: 2, unit: 'each', unitCostPlaceholder: 1800, subCosts: { materials: 1100, labor: 500 }, marginPercent: 18 },
      { clinNumber: '0004', description: 'Snow Removal', qty: 10, unit: 'each', unitCostPlaceholder: 650, subCosts: { labor: 350, equipment: 200 }, marginPercent: 22, notes: 'Per event, estimated 10 events/season' },
      { clinNumber: '0005', description: 'Irrigation Maintenance', qty: 2, unit: 'each', unitCostPlaceholder: 500, subCosts: { labor: 320 }, marginPercent: 25, notes: 'Option CLIN' },
    ],
  },
  '561210': {
    naics: '561210',
    label: 'Facilities Support Services',
    clins: [
      { clinNumber: '0001', description: 'Base Facilities Support (on-site tech)', qty: 12, unit: 'month', unitCostPlaceholder: 9500, subCosts: { labor: 7000, overhead: 600 }, marginPercent: 18 },
      { clinNumber: '0002', description: 'Preventive Maintenance Tasks', qty: 12, unit: 'month', unitCostPlaceholder: 1200, subCosts: { labor: 800, materials: 150 }, marginPercent: 20 },
      { clinNumber: '0003', description: 'Reactive Repairs (ODC/NTE)', qty: 1, unit: 'lot', unitCostPlaceholder: 15000, subCosts: { labor: 9000, materials: 4000 }, marginPercent: 15, notes: 'NTE pool; invoiced against actuals' },
    ],
  },

  // ── VitalX ─────────────────────────────────────────────────────────────────
  '492110': {
    naics: '492110',
    label: 'Medical Courier / Specimen Transport',
    clins: [
      { clinNumber: '0001', description: 'Base Scheduled Route (5x/week)', qty: 12, unit: 'month', unitCostPlaceholder: 6500, subCosts: { labor: 4200, other: 600, overhead: 500 }, marginPercent: 22, notes: 'Per-site base. Fuel + vehicle included.' },
      { clinNumber: '0002', description: 'Per-Specimen Pickup', qty: 1000, unit: 'each', unitCostPlaceholder: 18, subCosts: { labor: 10, other: 3 }, marginPercent: 30, notes: 'Beyond scheduled routes' },
      { clinNumber: '0003', description: 'STAT / Same-Day (under 4 h)', qty: 50, unit: 'each', unitCostPlaceholder: 125, subCosts: { labor: 65, other: 18 }, marginPercent: 35 },
      { clinNumber: '0004', description: 'After-Hours Courier', qty: 30, unit: 'each', unitCostPlaceholder: 95, subCosts: { labor: 60, other: 15 }, marginPercent: 28 },
      { clinNumber: '0005', description: 'Cold-Chain / Temperature-Controlled', qty: 200, unit: 'each', unitCostPlaceholder: 45, subCosts: { labor: 22, other: 10, equipment: 5 }, marginPercent: 32 },
    ],
  },
  '492210': {
    naics: '492210',
    label: 'Local Courier (non-medical delivery)',
    clins: [
      { clinNumber: '0001', description: 'Scheduled Local Route', qty: 12, unit: 'month', unitCostPlaceholder: 5500, subCosts: { labor: 3600, other: 450 }, marginPercent: 20 },
      { clinNumber: '0002', description: 'On-Demand Pickup', qty: 500, unit: 'each', unitCostPlaceholder: 22, subCosts: { labor: 13, other: 3 }, marginPercent: 28 },
    ],
  },
  '621610': {
    naics: '621610',
    label: 'Home Health / Pharmacy Delivery',
    clins: [
      { clinNumber: '0001', description: 'Per-Medication Delivery (HIPAA)', qty: 500, unit: 'each', unitCostPlaceholder: 28, subCosts: { labor: 15, other: 5 }, marginPercent: 30 },
      { clinNumber: '0002', description: 'Monthly Base (dedicated route)', qty: 12, unit: 'month', unitCostPlaceholder: 4500, subCosts: { labor: 2800, other: 400 }, marginPercent: 22 },
      { clinNumber: '0003', description: 'After-Hours Medication Delivery', qty: 40, unit: 'each', unitCostPlaceholder: 75, subCosts: { labor: 45, other: 12 }, marginPercent: 30 },
    ],
  },
  '485991': {
    naics: '485991',
    label: 'NEMT (Non-Emergency Medical Transport)',
    clins: [
      { clinNumber: '0001', description: 'One-Way NEMT Trip (ambulatory)', qty: 1000, unit: 'each', unitCostPlaceholder: 28, subCosts: { labor: 16, other: 6 }, marginPercent: 22 },
      { clinNumber: '0002', description: 'Round-Trip NEMT (ambulatory)', qty: 500, unit: 'each', unitCostPlaceholder: 48, subCosts: { labor: 28, other: 10 }, marginPercent: 22 },
      { clinNumber: '0003', description: 'Wheelchair-Accessible Trip', qty: 300, unit: 'each', unitCostPlaceholder: 85, subCosts: { labor: 45, other: 15, equipment: 8 }, marginPercent: 25 },
      { clinNumber: '0004', description: 'No-Show / Late-Cancel Fee', qty: 50, unit: 'each', unitCostPlaceholder: 15, subCosts: { labor: 8 }, marginPercent: 30 },
    ],
  },
}

export function templateForNaics(naics: string): ClinTemplate | null {
  return CLIN_TEMPLATES[naics] || null
}

export function availableTemplates(): Array<{ naics: string; label: string }> {
  return Object.values(CLIN_TEMPLATES).map(t => ({ naics: t.naics, label: t.label }))
}
