/**
 * VitalX Commercial Proposal Document Generator
 *
 * Generates branded proposal documents for VitalX commercial healthcare
 * prospects (hospitals, labs, pharmacies, etc.). These differ from
 * government proposals in tone, structure, and compliance requirements.
 *
 * Documents generated per prospect:
 * 1. Service Proposal (main sales document)
 * 2. Capability Statement (marketing one-pager)
 * 3. Service Level Agreement (SLA template)
 * 4. Pricing Summary (commercial pricing template)
 *
 * Server-side only.
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, PageNumber, LevelFormat,
} from 'docx'
import { getEntityData, type EntityProposalData } from './entity-data'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CommercialProposalInput {
  organizationName: string
  contactName: string | null
  contactTitle: string | null
  serviceCategory: string | null
  estimatedAnnualValue: number | null
  notes: string | null
}

interface GeneratedDoc {
  fileName: string
  buffer: Buffer
  description: string
}

// ── Shared styling ───────────────────────────────────────────────────────────

const LETTER_WIDTH = 12240
const LETTER_HEIGHT = 15840
const MARGIN = 1440
const CONTENT_WIDTH = LETTER_WIDTH - (2 * MARGIN)

function createBorder(color: string = 'CCCCCC') {
  return { style: BorderStyle.SINGLE, size: 1, color }
}

function allBorders(color: string = 'CCCCCC') {
  const b = createBorder(color)
  return { top: b, bottom: b, left: b, right: b }
}

const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 }

// VitalX brand colors
const TEAL = '06A59A'
const DARK_GREEN = '064E3B'

function makeHeaderFooter(orgName: string) {
  return {
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL, space: 1 } },
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'VitalX LLC', bold: true, font: 'Arial', size: 18, color: DARK_GREEN }),
              new TextRun({ text: `  |  Proposal for ${orgName}`, font: 'Arial', size: 16, color: '666666' }),
            ],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 1 } },
            spacing: { before: 120 },
            children: [
              new TextRun({ text: 'VitalX LLC  |  info@thevitalx.com  |  (571) 622-9133', font: 'Arial', size: 14, color: '888888' }),
              new TextRun({ text: '  |  Page ', font: 'Arial', size: 14, color: '888888' }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 14, color: '888888' }),
            ],
          }),
        ],
      }),
    },
  }
}

function pageProps(orgName: string) {
  return {
    page: {
      size: { width: LETTER_WIDTH, height: LETTER_HEIGHT },
      margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
    },
    ...makeHeaderFooter(orgName),
  }
}

function docStyles() {
  return {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: DARK_GREEN },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: TEAL },
        paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: '333333' },
        paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 2 },
      },
    ],
  }
}

function docNumbering() {
  return {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
      {
        reference: 'numbers',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  }
}

function p(text: string, opts?: { bold?: boolean; size?: number; color?: string; spacing?: { before?: number; after?: number }; alignment?: typeof AlignmentType[keyof typeof AlignmentType] }) {
  return new Paragraph({
    alignment: opts?.alignment,
    spacing: opts?.spacing || { after: 120 },
    children: [new TextRun({ text, bold: opts?.bold, size: opts?.size, color: opts?.color, font: 'Arial' })],
  })
}

function bullet(text: string) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: 'Arial', size: 22 })],
  })
}

function h1(text: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] })
}

function h2(text: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] })
}

function infoTable(rows: [string, string][], headerColor: string) {
  const headerHex = headerColor.replace('#', '')
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [3000, CONTENT_WIDTH - 3000],
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            borders: allBorders('DDDDDD'),
            width: { size: 3000, type: WidthType.DXA },
            margins: CELL_MARGINS,
            shading: { fill: headerHex + '15', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: 'Arial', size: 20 })] })],
          }),
          new TableCell({
            borders: allBorders('DDDDDD'),
            width: { size: CONTENT_WIDTH - 3000, type: WidthType.DXA },
            margins: CELL_MARGINS,
            children: [new Paragraph({ children: [new TextRun({ text: value, font: 'Arial', size: 20 })] })],
          }),
        ],
      })
    ),
  })
}

// ── Service Description Data ─────────────────────────────────────────────────

const SERVICE_DESCRIPTIONS: Record<string, { overview: string; services: string[]; value: string[] }> = {
  'Hospital Systems': {
    overview: 'VitalX provides HIPAA-compliant medical courier and specimen transport services designed for hospital system operations. Our services integrate with existing laboratory, pharmacy, and clinical workflows to ensure timely, secure, and compliant delivery of medical materials.',
    services: [
      'Stat and routine specimen pickup and delivery between hospital campuses, reference labs, and satellite locations',
      'Pharmacy medication delivery between hospital pharmacies and patient care units',
      'Medical records and document courier services',
      'Blood product and tissue transport with temperature-controlled chain of custody',
      'On-demand emergency courier services available 24/7/365',
      'Route optimization and real-time tracking with electronic proof of delivery',
    ],
    value: [
      'Reduce specimen rejection rates through proper handling and transport protocols',
      'Improve lab turnaround times by eliminating transport delays',
      'Ensure regulatory compliance with HIPAA, OSHA, DOT, and CLIA standards',
      'Lower total logistics costs compared to in-house courier operations',
      'Free clinical staff from non-clinical transport responsibilities',
    ],
  },
  'Reference Labs': {
    overview: 'VitalX specializes in high-volume specimen transport for reference and clinical laboratories. Our courier network connects healthcare facilities with laboratory operations, maintaining specimen integrity through temperature-controlled, time-sensitive logistics.',
    services: [
      'Scheduled route-based specimen pickups from physician offices, clinics, and hospitals',
      'Stat/priority specimen delivery with guaranteed turnaround times',
      'Temperature-controlled transport (ambient, refrigerated, frozen)',
      'Chain of custody documentation and electronic tracking',
      'Customized pickup schedules aligned with lab processing windows',
      'Return delivery of results, supplies, and collection kits',
    ],
    value: [
      'Expand geographic collection coverage without capital investment',
      'Reduce specimen integrity issues through trained handlers and validated packaging',
      'Improve client satisfaction with reliable, trackable pickup services',
      'Scale volume capacity on-demand without fixed staffing commitments',
    ],
  },
  'Clinical Research/Biotech': {
    overview: 'VitalX provides protocol-driven specimen logistics for clinical research organizations and biotech companies. Our services are designed to meet the strict chain of custody, temperature control, and documentation requirements of clinical trials and research protocols.',
    services: [
      'Protocol-specific specimen collection and transport logistics',
      'Temperature-validated shipping with continuous monitoring',
      'Time-critical delivery to central labs, biorepositories, and CRO facilities',
      'Investigational product (IP) delivery to clinical trial sites',
      'Kit building and distribution for multi-site studies',
      'Regulatory-compliant documentation and audit trail maintenance',
    ],
    value: [
      'Reduce protocol deviations related to specimen handling and transport',
      'Ensure data integrity through validated chain of custody procedures',
      'Accelerate study timelines with reliable logistics infrastructure',
      'Maintain compliance with FDA, GCP, and sponsor-specific requirements',
    ],
  },
  'Pharmacy/Specialty': {
    overview: 'VitalX provides secure, HIPAA-compliant pharmaceutical delivery services for retail pharmacies, specialty pharmacies, and compounding pharmacies. Our trained couriers handle controlled substances, specialty medications, and time-sensitive pharmaceutical products.',
    services: [
      'Same-day and next-day prescription delivery to patients',
      'Controlled substance delivery with chain of custody tracking',
      'Specialty medication delivery with temperature control and signature verification',
      'Inter-pharmacy transfers and restocking logistics',
      'Long-term care facility medication delivery routes',
      'Returns management and pharmaceutical waste transport',
    ],
    value: [
      'Improve patient adherence through convenient home delivery',
      'Extend service area without additional storefront locations',
      'Maintain compliance with DEA, Board of Pharmacy, and HIPAA requirements',
      'Reduce delivery-related liability with trained, insured couriers',
    ],
  },
  'Home Health': {
    overview: 'VitalX supports home health agencies with reliable medical courier services for specimen collection, medical supply delivery, and documentation transport. Our services help home health providers maintain continuity of care across distributed patient populations.',
    services: [
      'Home specimen collection pickup and delivery to reference labs',
      'Medical supply and equipment delivery to patient homes',
      'Document and medical record transport between offices and care locations',
      'DME (durable medical equipment) delivery and pickup',
      'After-hours and weekend courier support for urgent care needs',
    ],
    value: [
      'Enable lab services for home-based patients without clinic visits',
      'Reduce clinician drive time by handling non-clinical transport',
      'Improve care coordination with reliable supply chain logistics',
    ],
  },
  'NEMT Brokers': {
    overview: 'VitalX provides non-emergency medical transportation (NEMT) brokerage support and medical courier services that complement NEMT operations. Our logistics capabilities extend transport offerings beyond patient rides to include medical materials, specimens, and supplies.',
    services: [
      'Medical specimen transport as complementary service to patient transport',
      'Pharmacy prescription delivery coordinated with patient appointments',
      'Medical record and document courier between providers',
      'On-demand courier services for urgent medical material transport',
    ],
    value: [
      'Add revenue streams through expanded medical logistics services',
      'Improve network utilization with coordinated transport routes',
      'Meet healthcare client demand for integrated logistics solutions',
    ],
  },
}

const DEFAULT_SERVICES = SERVICE_DESCRIPTIONS['Hospital Systems']

function getServiceInfo(category: string | null) {
  if (!category) return DEFAULT_SERVICES
  return SERVICE_DESCRIPTIONS[category] || DEFAULT_SERVICES
}

// ── Document Generators ──────────────────────────────────────────────────────

function generateServiceProposal(input: CommercialProposalInput): Document {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const serviceInfo = getServiceInfo(input.serviceCategory)

  return new Document({
    styles: docStyles(),
    numbering: docNumbering(),
    sections: [{
      properties: pageProps(input.organizationName),
      children: [
        // Title Page
        p(''),
        p(''),
        p('SERVICE PROPOSAL', { bold: true, size: 40, color: DARK_GREEN, alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
        p(''),
        p('Medical Courier and Specimen Transport Services', { bold: true, size: 28, color: TEAL, alignment: AlignmentType.CENTER }),
        p(''),
        p(''),
        p(`Prepared for: ${input.organizationName}`, { size: 26, alignment: AlignmentType.CENTER }),
        ...(input.contactName ? [p(`Attention: ${input.contactName}${input.contactTitle ? `, ${input.contactTitle}` : ''}`, { size: 22, alignment: AlignmentType.CENTER })] : []),
        p(''),
        p(`Date: ${today}`, { size: 22, color: '666666', alignment: AlignmentType.CENTER }),
        p(''),
        p(''),

        infoTable([
          ['Prepared by', 'VitalX LLC'],
          ['Website', 'www.thevitalx.com'],
          ['Email', 'info@thevitalx.com'],
          ['Phone', '(571) 622-9133'],
          ['Service Area', 'DMV Metro Area (DC, MD, VA)'],
        ], TEAL),

        // Page break
        new Paragraph({ children: [new PageBreak()] }),

        // Executive Summary
        h1('Executive Summary'),
        p(`VitalX LLC is pleased to present this proposal for medical courier and logistics services to ${input.organizationName}. As a HIPAA-compliant healthcare logistics company serving the DMV metropolitan area, VitalX specializes in secure specimen transport, pharmacy delivery, and medical courier services designed specifically for healthcare organizations.`),
        p(''),
        p(serviceInfo.overview),
        p(''),
        p('[INSTRUCTION: Customize this executive summary to reference specific conversations, pain points, or requirements discussed with the prospect. Include any details about their current logistics setup and how VitalX would improve upon it.]', { color: 'CC0000', size: 20 }),
        p(''),

        // Services Offered
        new Paragraph({ children: [new PageBreak()] }),
        h1('Proposed Services'),
        p(`Based on our understanding of ${input.organizationName}'s operations, VitalX proposes the following service portfolio:`),
        p(''),
        ...serviceInfo.services.map(s => bullet(s)),
        p(''),
        p('[INSTRUCTION: Review and customize this service list based on the specific needs discussed with the prospect. Remove services not applicable and add any custom service requirements.]', { color: 'CC0000', size: 20 }),
        p(''),

        // Value Proposition
        h2('Value to Your Organization'),
        p(`Partnering with VitalX delivers measurable benefits to ${input.organizationName}:`),
        p(''),
        ...serviceInfo.value.map(v => bullet(v)),
        p(''),

        // Operations Overview
        new Paragraph({ children: [new PageBreak()] }),
        h1('Operational Approach'),

        h2('Service Hours'),
        p('[INSTRUCTION: Define proposed service hours based on prospect needs. Options include:]', { color: 'CC0000', size: 20 }),
        bullet('Standard business hours: Monday-Friday, 7:00 AM - 6:00 PM'),
        bullet('Extended hours: Monday-Saturday, 6:00 AM - 10:00 PM'),
        bullet('24/7/365 on-call availability for STAT requests'),
        p(''),

        h2('Coverage Area'),
        p('VitalX operates throughout the DMV metropolitan area, including Washington DC, Northern Virginia (Fairfax, Arlington, Loudoun, Prince William counties), and Maryland (Montgomery, Prince George\'s, Anne Arundel, Howard, Baltimore counties). Service extends to all major healthcare facilities, reference laboratories, and medical offices within this footprint.'),
        p(''),

        h2('Equipment and Vehicles'),
        bullet('Temperature-controlled transport containers (ambient, 2-8C, frozen)'),
        bullet('GPS-tracked delivery vehicles'),
        bullet('OSHA-compliant specimen packaging and biohazard containers'),
        bullet('Electronic proof of delivery with barcode scanning'),
        bullet('Real-time tracking dashboard access for clients'),
        p(''),

        h2('Staff Qualifications'),
        bullet('HIPAA-trained and certified couriers'),
        bullet('OSHA bloodborne pathogen training'),
        bullet('DOT hazardous materials awareness training (where applicable)'),
        bullet('Background-checked and drug-screened personnel'),
        bullet('Ongoing competency assessments and quality training'),
        p(''),

        // Compliance
        new Paragraph({ children: [new PageBreak()] }),
        h1('Compliance and Quality Assurance'),

        h2('Regulatory Compliance'),
        p('VitalX maintains full compliance with all applicable federal, state, and local regulations governing medical courier and specimen transport operations:'),
        p(''),
        bullet('HIPAA Privacy and Security Rule compliance (PHI handling, BAA execution)'),
        bullet('OSHA Bloodborne Pathogen Standard (29 CFR 1910.1030)'),
        bullet('DOT Hazardous Materials Regulations (49 CFR Parts 171-180)'),
        bullet('CLIA specimen handling requirements'),
        bullet('State licensure and permitting as required'),
        p(''),

        h2('Quality Control'),
        bullet('100% electronic chain of custody documentation'),
        bullet('Temperature monitoring with excursion alerts'),
        bullet('On-time delivery tracking and performance reporting'),
        bullet('Incident reporting and corrective action process'),
        bullet('Monthly performance dashboards provided to clients'),
        bullet('Annual compliance audits and policy review'),
        p(''),

        h2('Insurance Coverage'),
        bullet('General liability insurance'),
        bullet('Professional liability / errors and omissions'),
        bullet('Commercial auto insurance'),
        bullet('Workers compensation coverage'),
        bullet('Umbrella/excess liability coverage'),
        p('[INSTRUCTION: Add specific coverage amounts once finalized with insurance provider.]', { color: 'CC0000', size: 20 }),
        p(''),

        // Next Steps
        new Paragraph({ children: [new PageBreak()] }),
        h1('Implementation Timeline'),
        p('VitalX is prepared to begin service within [X] business days of contract execution. Our standard implementation process includes:'),
        p(''),

        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [1500, 2500, CONTENT_WIDTH - 4000],
          rows: [
            new TableRow({
              children: ['Phase', 'Timeline', 'Activities'].map((text, i) =>
                new TableCell({
                  borders: allBorders('CCCCCC'),
                  width: { size: [1500, 2500, CONTENT_WIDTH - 4000][i], type: WidthType.DXA },
                  margins: CELL_MARGINS,
                  shading: { fill: DARK_GREEN, type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: 'Arial', size: 18, color: 'FFFFFF' })] })],
                })
              ),
            }),
            ...([
              ['Week 1', 'Discovery', 'Site assessment, route planning, key contact identification, BAA execution'],
              ['Week 2', 'Setup', 'System configuration, credential provisioning, equipment staging'],
              ['Week 3', 'Training', 'Staff onboarding, route familiarization, process validation'],
              ['Week 4', 'Go-Live', 'Service launch with dedicated oversight and daily check-ins'],
              ['Week 5+', 'Optimization', 'Performance monitoring, route optimization, SLA reporting'],
            ] as [string, string, string][]).map(([phase, timeline, activities]) =>
              new TableRow({
                children: [phase, timeline, activities].map((text, i) =>
                  new TableCell({
                    borders: allBorders('DDDDDD'),
                    width: { size: [1500, 2500, CONTENT_WIDTH - 4000][i], type: WidthType.DXA },
                    margins: CELL_MARGINS,
                    children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 18 })] })],
                  })
                ),
              })
            ),
          ],
        }),
        p(''),

        // Contact and Closing
        h1('Next Steps'),
        p(`We welcome the opportunity to discuss this proposal in detail and customize our service offering to meet ${input.organizationName}'s specific requirements. To schedule a consultation or site visit, please contact:`),
        p(''),
        p('Emmanuela Wireko-Brobbey', { bold: true }),
        p('Managing Member, VitalX LLC'),
        p('Email: info@thevitalx.com'),
        p('Phone: (571) 622-9133'),
        p('Web: www.thevitalx.com'),
      ],
    }],
  })
}

function generateCommercialSLA(input: CommercialProposalInput): Document {
  const serviceInfo = getServiceInfo(input.serviceCategory)

  return new Document({
    styles: docStyles(),
    numbering: docNumbering(),
    sections: [{
      properties: pageProps(input.organizationName),
      children: [
        h1('Service Level Agreement'),
        p(`Between VitalX LLC ("Provider") and ${input.organizationName} ("Client")`, { size: 24, spacing: { after: 240 } }),
        p(''),

        h2('1. Service Description'),
        p(`VitalX LLC will provide medical courier and logistics services to ${input.organizationName} as outlined in the associated Service Proposal. This SLA defines the performance standards, metrics, and remedies applicable to those services.`),
        p(''),

        h2('2. Service Hours'),
        p('[INSTRUCTION: Define the agreed service hours here]', { color: 'CC0000', size: 20 }),
        bullet('Standard Service Hours: [e.g., Monday-Friday, 7:00 AM - 6:00 PM]'),
        bullet('STAT/Emergency Availability: [e.g., 24/7/365 with 60-minute response]'),
        bullet('Holiday Schedule: [define observed holidays and coverage]'),
        p(''),

        h2('3. Performance Metrics'),

        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [3000, 2400, 1980, 1980],
          rows: [
            new TableRow({
              children: ['Metric', 'Target', 'Measurement', 'Reporting'].map((text, i) =>
                new TableCell({
                  borders: allBorders('CCCCCC'),
                  width: { size: [3000, 2400, 1980, 1980][i], type: WidthType.DXA },
                  margins: CELL_MARGINS,
                  shading: { fill: DARK_GREEN, type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: 'Arial', size: 18, color: 'FFFFFF' })] })],
                })
              ),
            }),
            ...([
              ['On-Time Delivery Rate', '>= 98%', 'Monthly', 'Dashboard'],
              ['STAT Response Time', '<= 60 minutes', 'Per request', 'Real-time'],
              ['Specimen Integrity Rate', '>= 99.5%', 'Monthly', 'Monthly report'],
              ['Chain of Custody Compliance', '100%', 'Per delivery', 'Audit log'],
              ['Temperature Excursion Rate', '<= 0.5%', 'Monthly', 'Monthly report'],
              ['Customer Complaint Resolution', '<= 24 hours', 'Per incident', 'Incident log'],
            ] as [string, string, string, string][]).map(row =>
              new TableRow({
                children: row.map((text, i) =>
                  new TableCell({
                    borders: allBorders('DDDDDD'),
                    width: { size: [3000, 2400, 1980, 1980][i], type: WidthType.DXA },
                    margins: CELL_MARGINS,
                    children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 18 })] })],
                  })
                ),
              })
            ),
          ],
        }),
        p(''),

        h2('4. Reporting'),
        bullet('Real-time tracking dashboard access provided to Client'),
        bullet('Monthly performance summary report delivered by the 5th business day'),
        bullet('Quarterly business review meetings to discuss performance, trends, and optimization'),
        bullet('Annual service review with contract renewal assessment'),
        p(''),

        h2('5. Escalation Procedures'),
        p('Level 1 (Operational): Driver/dispatcher resolves within 30 minutes'),
        p('Level 2 (Supervisory): Operations manager responds within 2 hours'),
        p('Level 3 (Management): Account manager responds within 4 hours'),
        p('Level 4 (Executive): Managing Member responds within 1 business day'),
        p(''),

        h2('6. Remedies'),
        p('[INSTRUCTION: Define credit or remedy terms if SLA targets are missed. Examples: service credits for missed on-time rates, expedited re-delivery at no cost for specimen integrity failures, etc.]', { color: 'CC0000', size: 20 }),
        p(''),

        h2('7. Term and Termination'),
        p('[INSTRUCTION: Define contract term, renewal terms, and termination notice requirements.]', { color: 'CC0000', size: 20 }),
        p(''),

        h2('8. Signatures'),
        p(''),
        p(''),
        p('_____________________________________________'),
        p('VitalX LLC', { bold: true }),
        p('Emmanuela Wireko-Brobbey, Managing Member'),
        p('Date: ____________________'),
        p(''),
        p(''),
        p('_____________________________________________'),
        p(input.organizationName, { bold: true }),
        p(`${input.contactName || '[Authorized Representative]'}${input.contactTitle ? `, ${input.contactTitle}` : ''}`),
        p('Date: ____________________'),
      ],
    }],
  })
}

function generateCommercialPricing(input: CommercialProposalInput): Document {
  return new Document({
    styles: docStyles(),
    numbering: docNumbering(),
    sections: [{
      properties: pageProps(input.organizationName),
      children: [
        h1('Pricing Summary'),
        p(`Prepared for: ${input.organizationName}`, { size: 24, spacing: { after: 240 } }),
        p(''),

        p('[INSTRUCTION: This is a pricing template. Use the MOG Tracker Commercial Pricing Calculator to build actual pricing, then export and update this document. Customize pricing structure based on the prospect\'s volume and service requirements.]', { color: 'CC0000', size: 20 }),
        p(''),

        h2('Pricing Structure Options'),
        p('VitalX offers flexible pricing models to match your organization\'s logistics needs:'),
        p(''),

        h2('Option A: Per-Trip Pricing'),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [3500, 1800, 1800, 2260],
          rows: [
            new TableRow({
              children: ['Service', 'Base Rate', 'STAT Rate', 'Notes'].map((text, i) =>
                new TableCell({
                  borders: allBorders('CCCCCC'),
                  width: { size: [3500, 1800, 1800, 2260][i], type: WidthType.DXA },
                  margins: CELL_MARGINS,
                  shading: { fill: DARK_GREEN, type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: 'Arial', size: 18, color: 'FFFFFF' })] })],
                })
              ),
            }),
            ...([
              ['Routine Specimen Pickup', '$[X.XX]', '$[X.XX]', 'Per stop'],
              ['STAT Specimen Pickup', '$[X.XX]', 'N/A', '60-min response'],
              ['Pharmacy Delivery', '$[X.XX]', '$[X.XX]', 'Per delivery'],
              ['Medical Records Transport', '$[X.XX]', '$[X.XX]', 'Per trip'],
              ['After-Hours Service', '$[X.XX]', '$[X.XX]', 'Premium rate'],
              ['Weekend/Holiday', '$[X.XX]', '$[X.XX]', 'Premium rate'],
            ] as [string, string, string, string][]).map(row =>
              new TableRow({
                children: row.map((text, i) =>
                  new TableCell({
                    borders: allBorders('DDDDDD'),
                    width: { size: [3500, 1800, 1800, 2260][i], type: WidthType.DXA },
                    margins: CELL_MARGINS,
                    children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 18 })] })],
                  })
                ),
              })
            ),
          ],
        }),
        p(''),

        h2('Option B: Monthly Flat Rate'),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [
            new TableRow({
              children: ['Package', 'Monthly Rate'].map((text, i) =>
                new TableCell({
                  borders: allBorders('CCCCCC'),
                  width: { size: 4680, type: WidthType.DXA },
                  margins: CELL_MARGINS,
                  shading: { fill: DARK_GREEN, type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: 'Arial', size: 18, color: 'FFFFFF' })] })],
                })
              ),
            }),
            ...([
              ['Basic (up to [X] trips/month)', '$[X,XXX]/month'],
              ['Standard (up to [X] trips/month)', '$[X,XXX]/month'],
              ['Premium (unlimited routine + [X] STAT)', '$[X,XXX]/month'],
            ] as [string, string][]).map(([pkg, rate]) =>
              new TableRow({
                children: [pkg, rate].map((text, i) =>
                  new TableCell({
                    borders: allBorders('DDDDDD'),
                    width: { size: 4680, type: WidthType.DXA },
                    margins: CELL_MARGINS,
                    children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 18 })] })],
                  })
                ),
              })
            ),
          ],
        }),
        p(''),

        h2('Additional Fees'),
        bullet('Mileage surcharge beyond [X]-mile radius: $[X.XX]/mile'),
        bullet('Wait time beyond 15 minutes: $[X.XX]/15-minute increment'),
        bullet('Dry ice / specialized packaging: at cost + 15%'),
        bullet('Custom reporting / integration setup: one-time $[X,XXX]'),
        p(''),

        h2('Volume Discounts'),
        bullet('50+ trips/month: 5% discount on per-trip rates'),
        bullet('100+ trips/month: 10% discount on per-trip rates'),
        bullet('200+ trips/month: 15% discount on per-trip rates'),
        bullet('Multi-year contract (2+ years): additional 5% discount'),
        p(''),

        h2('Payment Terms'),
        p('Net 30 from invoice date. Invoices submitted monthly on the 1st business day for the prior month\'s services.'),
        p(''),

        p(`Note: Use the Pricing Calculator in the MOG Tracker app (VitalX > Commercial > Pricing tab) for detailed pricing models with cost breakdowns and margin analysis.`, { color: '666666', size: 20 }),
      ],
    }],
  })
}

// ── Main Generator ───────────────────────────────────────────────────────────

/**
 * Generate all commercial proposal documents for a VitalX prospect.
 * Returns an array of { fileName, buffer, description } objects.
 */
export async function generateCommercialProposalPackage(input: CommercialProposalInput): Promise<GeneratedDoc[]> {
  const orgPrefix = input.organizationName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 40)

  const docs: { name: string; doc: Document; desc: string }[] = [
    {
      name: `VitalX_Proposal_${orgPrefix}.docx`,
      doc: generateServiceProposal(input),
      desc: `Service proposal for ${input.organizationName} with tailored service descriptions, operations plan, and compliance overview`,
    },
    {
      name: `VitalX_SLA_${orgPrefix}.docx`,
      doc: generateCommercialSLA(input),
      desc: `Service Level Agreement template with performance metrics, escalation procedures, and remedy terms`,
    },
    {
      name: `VitalX_Pricing_${orgPrefix}.docx`,
      doc: generateCommercialPricing(input),
      desc: `Pricing summary with per-trip and flat-rate options, volume discounts, and payment terms`,
    },
  ]

  // Also generate VitalX capability statement using the shared generator
  // (imported at API route level since it needs gov proposal module)

  const results: GeneratedDoc[] = []
  for (const { name, doc, desc } of docs) {
    const buffer = await Packer.toBuffer(doc)
    results.push({ fileName: name, buffer: Buffer.from(buffer), description: desc })
  }

  return results
}
