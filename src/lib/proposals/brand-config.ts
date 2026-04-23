// Per-entity brand configuration for the proposal platform.
// Used by the proposal document generator, validator (brand consistency check),
// and the per-entity proposal pages.

import path from 'path'
import fs from 'fs'

export type EntityBrandConfig = {
  entityKey: 'exousia' | 'vitalx' | 'ironhouse'
  legalName: string
  displayName: string
  tagline?: string
  primaryColor: string
  accentColor: string
  bodyFont: string
  headingFont: string
  logoPath: string
  logoMonoPath?: string
  signaturePath?: string
  voiceGuide: VoiceGuide
  capabilityTagline: string
  samUei?: string
  samCage?: string
}

export type VoiceGuide = {
  tone: string
  avoid: string[]
  prefer: string[]
  sampleOpening: string
  sampleClosing: string
}

function brandAsset(entityKey: string, file: string): string {
  return path.join(process.cwd(), 'public', 'brands', entityKey, file)
}

const EXOUSIA_VOICE: VoiceGuide = {
  tone: 'Authoritative compliance professional. Federal-contracting cadence. Present tense, active voice, precise verbs. No marketing fluff, no superlatives. Facts, evidence, measurable commitments. Think: a lead compliance strategist writing a bid narrative.',
  avoid: [
    'pivotal', 'crucial', 'seamless', 'robust', 'leverage', 'utilize', 'cutting-edge',
    'world-class', 'best-in-class', 'innovative solutions', 'strategic partner',
    'commitment to excellence', 'vision for the future', 'bright future',
    'delivering value', 'end-to-end', 'holistic', 'synergy',
  ],
  prefer: [
    'we deliver', 'we maintain', 'we document', 'we report', 'we comply with',
    'measured against', 'tracked in', 'audited quarterly', 'certified to',
  ],
  sampleOpening: 'Exousia Solutions LLC delivers custodial, landscaping, and facilities support services to federal and state customers across the DMV. We maintain WOSB and EDWOSB certifications, a current SAM.gov registration under UEI XNZ2KYQYK566, and active past performance on federal cybersecurity compliance contracts.',
  sampleClosing: 'All deliverables are tracked in our internal QC system and reported monthly to the Contracting Officer. Exousia accepts the terms of this solicitation as stated, including all amendments.',
}

const VITALX_VOICE: VoiceGuide = {
  tone: 'Clinical precision. HIPAA-compliance cadence. Chain-of-custody and time-critical language. Active voice, numeric specificity, regulatory references. Think: a healthcare-logistics operations director writing for a hospital procurement team.',
  avoid: [
    'pivotal', 'crucial', 'seamless', 'robust', 'cutting-edge',
    'patient-centric', 'end-to-end', 'innovative', 'transformative',
    'comprehensive solutions', 'unmatched', 'exceptional service',
  ],
  prefer: [
    'HIPAA-compliant', 'chain-of-custody documented', 'scheduled transport',
    'temperature-controlled', 'specimen integrity', 'audit trail', 'certified courier',
    'response within', 'dispatched by', 'documented handoff',
  ],
  sampleOpening: 'VitalX LLC provides HIPAA-compliant medical courier, specimen transport, and pharmacy delivery services across the DC, Maryland, and Virginia metropolitan area. Our couriers are trained to CLSI specimen-handling standards, vehicles are temperature-controlled and GPS-tracked, and every pickup and delivery is logged with a timestamped chain-of-custody record.',
  sampleClosing: 'VitalX maintains a current SAM.gov registration, HIPAA BAA coverage, and a 24/7 dispatch line. All services in this proposal are available on the performance start date stated in the solicitation.',
}

const IRONHOUSE_VOICE: VoiceGuide = {
  tone: 'Plain-spoken operational trades. Short sentences. Concrete equipment, crew sizes, frequencies. No abstractions. Think: a facilities superintendent with 20+ years of FCPS experience writing what the crew will actually do.',
  avoid: [
    'pivotal', 'seamless', 'robust', 'holistic', 'optimize', 'leverage',
    'strategic', 'paradigm', 'transformative', 'bring to the table',
    'best-in-class', 'world-class', 'synergy',
  ],
  prefer: [
    'our crew', 'we use', 'we mow', 'we apply', 'we clean', 'we dispose',
    'inspected by', 'supervised by', 'on site', 'per week', 'per month',
    'EPA-labeled', 'OSHA-trained', 'background-checked',
  ],
  sampleOpening: 'IronHouse Services LLC provides custodial, landscaping, solid waste, and facilities support services. Owner Nana Badu brings 21+ years of Fairfax County Public Schools facilities operations experience. Crews are background-checked, OSHA-trained, and supervised on site for every shift.',
  sampleClosing: 'IronHouse accepts the scope of work as written. Equipment, materials, and labor are priced in the attached pricing schedule. We are ready to begin performance on the contract start date stated in the solicitation.',
}

export const BRAND_CONFIG: Record<'exousia' | 'vitalx' | 'ironhouse', EntityBrandConfig> = {
  exousia: {
    entityKey: 'exousia',
    legalName: 'Exousia Solutions LLC',
    displayName: 'Exousia Solutions',
    tagline: 'Trust. Honor. Execute.',
    primaryColor: '253A5E',
    accentColor: 'D4AF37',
    bodyFont: 'Arial',
    headingFont: 'Arial',
    logoPath: brandAsset('exousia', 'logo.png'),
    logoMonoPath: brandAsset('exousia', 'logo-mono.png'),
    signaturePath: brandAsset('exousia', 'signature.png'),
    voiceGuide: EXOUSIA_VOICE,
    capabilityTagline: 'WOSB + EDWOSB federal contractor specializing in facilities management, custodial and landscaping services, solid waste management, and compliance advisory.',
    samUei: 'XNZ2KYQYK566',
    samCage: '0ENQ3',
  },
  vitalx: {
    entityKey: 'vitalx',
    legalName: 'VitalX LLC',
    displayName: 'VitalX',
    tagline: 'Medical logistics, engineered for trust.',
    primaryColor: '064E3B',
    accentColor: '06A59A',
    bodyFont: 'Arial',
    headingFont: 'Arial',
    logoPath: brandAsset('vitalx', 'logo.png'),
    logoMonoPath: brandAsset('vitalx', 'logo-mono.png'),
    signaturePath: brandAsset('vitalx', 'signature.png'),
    voiceGuide: VITALX_VOICE,
    capabilityTagline: 'HIPAA-compliant medical courier, specimen transport, lab services support, pharmacy delivery, NEMT, and mobile diagnostics across the DMV.',
  },
  ironhouse: {
    entityKey: 'ironhouse',
    legalName: 'IronHouse Services LLC',
    displayName: 'IronHouse Services',
    tagline: 'Facilities done right.',
    primaryColor: '292524',
    accentColor: 'B45309',
    bodyFont: 'Arial',
    headingFont: 'Arial',
    logoPath: brandAsset('ironhouse', 'logo.png'),
    logoMonoPath: brandAsset('ironhouse', 'logo-mono.png'),
    signaturePath: brandAsset('ironhouse', 'signature.png'),
    voiceGuide: IRONHOUSE_VOICE,
    capabilityTagline: 'Federal custodial, landscaping, solid waste, and facilities support services. Owner-operated, 21+ years FCPS facilities experience.',
  },
}

export function getBrand(entity: string): EntityBrandConfig {
  const key = entity as 'exousia' | 'vitalx' | 'ironhouse'
  const cfg = BRAND_CONFIG[key]
  if (!cfg) throw new Error('Unknown entity: ' + entity)
  return cfg
}

export function hasLogo(entity: string): boolean {
  try {
    return fs.existsSync(getBrand(entity).logoPath)
  } catch {
    return false
  }
}
