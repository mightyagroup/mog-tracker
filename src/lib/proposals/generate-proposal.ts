/**
 * Government Proposal Document Generator
 *
 * Generates entity-branded, pre-filled Word documents (.docx) for government
 * bid proposals. Uses the docx npm package for server-side generation.
 *
 * Documents generated per bid:
 * 1. Cover Letter
 * 2. Technical Proposal (main proposal document)
 * 3. Past Performance
 * 4. Compliance Certifications
 * 5. Quality Control Plan
 * 6. Pricing Worksheet (placeholder)
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

export interface ProposalInput {
  entity: string
  title: string
  solicitationNumber: string | null
  agency: string | null
  subAgency: string | null
  naicsCode: string | null
  setAside: string | null
  estimatedValue: number | null
  responseDeadline: string | null
  placeOfPerformance: string | null
  description: string | null
  samGovUrl: string | null
}

interface GeneratedDoc {
  fileName: string
  buffer: Buffer
  description: string
}

// ── Shared styling ───────────────────────────────────────────────────────────

const LETTER_WIDTH = 12240
const LETTER_HEIGHT = 15840
const MARGIN = 1440 // 1 inch
const CONTENT_WIDTH = LETTER_WIDTH - (2 * MARGIN)

function createBorder(color: string = 'CCCCCC') {
  return { style: BorderStyle.SINGLE, size: 1, color }
}

function allBorders(color: string = 'CCCCCC') {
  const b = createBorder(color)
  return { top: b, bottom: b, left: b, right: b }
}

const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 }

function makeHeaderFooter(data: EntityProposalData, solNum: string | null) {
  return {
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: data.brandColors.primary.replace('#', ''), space: 1 } },
            spacing: { after: 120 },
            children: [
              new TextRun({ text: data.legalName, bold: true, font: 'Arial', size: 18, color: data.brandColors.primary.replace('#', '') }),
              new TextRun({ text: solNum ? `  |  ${solNum}` : '', font: 'Arial', size: 16, color: '666666' }),
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
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: data.brandColors.primary.replace('#', ''), space: 1 } },
            spacing: { before: 120 },
            children: [
              new TextRun({ text: `${data.legalName}  |  ${data.publicEmail}`, font: 'Arial', size: 14, color: '888888' }),
              new TextRun({ text: '  |  Page ', font: 'Arial', size: 14, color: '888888' }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 14, color: '888888' }),
            ],
          }),
        ],
      }),
    },
  }
}

function pageProps(data: EntityProposalData, solNum: string | null) {
  return {
    page: {
      size: { width: LETTER_WIDTH, height: LETTER_HEIGHT },
      margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
    },
    ...makeHeaderFooter(data, solNum),
  }
}

function numbering() {
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

function styles(data: EntityProposalData) {
  const primaryHex = data.brandColors.primary.replace('#', '')
  return {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: primaryHex },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: primaryHex },
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

// Utility: paragraph with text
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

// ── Info Table (used for company info blocks) ────────────────────────────────

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

// ── Document Generators ──────────────────────────────────────────────────────

function generateCoverLetter(input: ProposalInput, data: EntityProposalData): Document {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return new Document({
    styles: styles(data),
    numbering: numbering(),
    sections: [{
      properties: pageProps(data, input.solicitationNumber),
      children: [
        // Date
        p(today, { spacing: { after: 240 } }),

        // Recipient
        p(input.agency || '[Contracting Agency]', { bold: true }),
        p(input.subAgency || ''),
        p('[Contracting Officer Name]'),
        p('[Address]'),
        p(''),

        // Subject
        p(`Re: ${input.solicitationNumber || '[Solicitation Number]'} — ${input.title}`, { bold: true, spacing: { after: 240 } }),

        // Body
        p('Dear Contracting Officer,'),
        p(''),
        p(`${data.legalName} is pleased to submit this proposal in response to Solicitation ${input.solicitationNumber || '[Number]'} for ${input.title}. We are fully qualified to perform the required services and confirm the following:`),
        p(''),

        // Confirmations
        bullet(`${data.legalName} is registered and active in SAM.gov${data.uei ? ` (UEI: ${data.uei})` : ''}`),
        bullet(`${data.legalName} acknowledges receipt of all solicitation documents and amendments`),
        bullet(`This proposal is valid for 90 calendar days from the submission date`),
        bullet(`${data.legalName} accepts the terms and conditions of the solicitation`),
        ...(data.certifications.length > 0 ? [
          bullet(`Applicable certifications: ${data.certifications.join(', ')}`),
        ] : []),
        p(''),

        // Closing
        p('Our enclosed proposal includes our Technical Approach, Management Plan, Past Performance, Quality Control Plan, Compliance Certifications, and Pricing. We welcome the opportunity to discuss our qualifications further.'),
        p(''),
        p('Respectfully submitted,'),
        p(''),
        p(''),
        p(data.managingMember, { bold: true }),
        p(data.managingTitle),
        p(data.legalName),
        p(data.publicEmail),
        ...(data.phone ? [p(data.phone)] : []),

        // Company Info Table
        p(''),
        p(''),
        infoTable([
          ['Company', data.legalName],
          ...(data.uei ? [['UEI', data.uei] as [string, string]] : []),
          ...(data.cageCode ? [['CAGE Code', data.cageCode] as [string, string]] : []),
          ['NAICS', data.naicsCodes.filter(n => n.primary).map(n => `${n.code} — ${n.description}`).join('; ') || data.naicsCodes[0]?.code || ''],
          ['Certifications', data.certifications.join(', ')],
          ['Point of Contact', `${data.proposalLead}, ${data.proposalLeadTitle}`],
          ['Email', data.publicEmail],
        ], data.brandColors.primary),
      ],
    }],
  })
}

function generateTechnicalProposal(input: ProposalInput, data: EntityProposalData): Document {
  const primaryNaics = data.naicsCodes.find(n => n.primary) || data.naicsCodes[0]

  return new Document({
    styles: styles(data),
    numbering: numbering(),
    sections: [{
      properties: pageProps(data, input.solicitationNumber),
      children: [
        // Title Page
        p(''),
        p(''),
        p('TECHNICAL PROPOSAL', { bold: true, size: 40, color: data.brandColors.primary.replace('#', ''), alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
        p(''),
        p(input.title, { bold: true, size: 32, alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
        p(''),
        p(`Solicitation: ${input.solicitationNumber || '[Number]'}`, { size: 24, alignment: AlignmentType.CENTER }),
        p(`Agency: ${input.agency || '[Agency]'}`, { size: 24, alignment: AlignmentType.CENTER }),
        p(`NAICS: ${input.naicsCode || primaryNaics?.code || ''}`, { size: 24, alignment: AlignmentType.CENTER }),
        p(''),
        p(''),
        p(`Submitted by: ${data.legalName}`, { size: 24, alignment: AlignmentType.CENTER }),
        ...(data.tagline ? [p(data.tagline, { size: 22, color: data.brandColors.accent.replace('#', ''), alignment: AlignmentType.CENTER })] : []),
        p(''),

        infoTable([
          ['Company', data.legalName],
          ...(data.uei ? [['UEI', data.uei] as [string, string]] : []),
          ...(data.cageCode ? [['CAGE Code', data.cageCode] as [string, string]] : []),
          ['NAICS', input.naicsCode || primaryNaics?.code || ''],
          ['Set-Aside', input.setAside || 'N/A'],
          ['Response Deadline', input.responseDeadline || 'N/A'],
          ['Point of Contact', `${data.proposalLead}, ${data.proposalLeadTitle}`],
          ['Email', data.publicEmail],
        ], data.brandColors.primary),

        // Page break
        new Paragraph({ children: [new PageBreak()] }),

        // Section 1: Company Overview
        h1('1. Company Overview'),
        ...data.companyOverview.split('\n\n').map(para => p(para.trim())),
        p(''),

        // Section 2: Understanding of Requirements
        h1('2. Understanding of Requirements'),
        p(`${data.legalName} has thoroughly reviewed the solicitation requirements for ${input.title}${input.agency ? ` issued by ${input.agency}` : ''}. We understand the scope of work and confirm our ability to meet all specified requirements.`),
        p(''),
        p('[INSTRUCTION: Review the full solicitation and customize this section to restate the specific scope, requirements, deliverables, performance standards, and technical specifications from the SOW. Demonstrate comprehension of each requirement.]', { color: 'CC0000', size: 20 }),
        p(''),
        h2('2.1 Scope Summary'),
        p('[Restate the scope of work requirements here, referencing specific sections of the solicitation.]', { color: '888888' }),
        p(''),
        h2('2.2 Technical Requirements'),
        p('[List specific technical requirements, standards, and specifications from the SOW.]', { color: '888888' }),
        p(''),
        h2('2.3 Performance Standards'),
        p('[Address performance standards, service levels, and quality metrics specified in the solicitation.]', { color: '888888' }),
        p(''),

        // Section 3: Technical Approach
        new Paragraph({ children: [new PageBreak()] }),
        h1('3. Technical Approach'),
        p(`${data.legalName} will deliver all required services through a structured operational plan designed to meet or exceed contract requirements.`),
        p(''),
        h2('3.1 Operations Plan'),
        p('[INSTRUCTION: Describe the specific operational approach for this contract. Include: methods, equipment, staffing levels, schedules, and procedures that demonstrate how you will perform the work.]', { color: 'CC0000', size: 20 }),
        p(''),
        h2('3.2 Equipment and Resources'),
        p('[List equipment, vehicles, tools, and other resources that will be deployed for this contract.]', { color: '888888' }),
        p(''),
        h2('3.3 Transition Plan'),
        p(`${data.legalName} will execute a structured transition within the first [X] days of contract award, including: coordination meeting with the COR, site assessment, personnel deployment, equipment mobilization, and establishment of communication protocols.`),
        p(''),

        // Section 4: Management Approach
        new Paragraph({ children: [new PageBreak()] }),
        h1('4. Management Approach'),
        ...data.managementApproachBoilerplate.split('\n\n').map(para => p(para.trim())),
        p(''),
        h2('4.1 Key Personnel'),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [2500, 2500, CONTENT_WIDTH - 5000],
          rows: [
            new TableRow({
              children: ['Role', 'Name', 'Responsibility'].map(text =>
                new TableCell({
                  borders: allBorders('CCCCCC'),
                  width: { size: text === 'Responsibility' ? CONTENT_WIDTH - 5000 : 2500, type: WidthType.DXA },
                  margins: CELL_MARGINS,
                  shading: { fill: data.brandColors.primary.replace('#', ''), type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: 'Arial', size: 20, color: 'FFFFFF' })] })],
                })
              ),
            }),
            ...data.keyPersonnel.map(kp =>
              new TableRow({
                children: [kp.role, kp.name, kp.responsibility].map((text, i) =>
                  new TableCell({
                    borders: allBorders('DDDDDD'),
                    width: { size: i === 2 ? CONTENT_WIDTH - 5000 : 2500, type: WidthType.DXA },
                    margins: CELL_MARGINS,
                    children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 20 })] })],
                  })
                ),
              })
            ),
          ],
        }),
        p(''),

        // Section 5: Safety
        h1('5. Safety and Compliance'),
        ...data.safetyBoilerplate.split('\n\n').map(para => p(para.trim())),
        p(''),

        // Section 6: Quality Control
        h1('6. Quality Control'),
        ...data.qualityControlBoilerplate.split('\n\n').map(para => p(para.trim())),
        p(''),

        // Signature
        new Paragraph({ children: [new PageBreak()] }),
        h1('7. Authorization'),
        p(`This proposal is submitted by ${data.legalName} and is authorized by the undersigned.`),
        p(''),
        p(''),
        p('_____________________________________________'),
        p(data.managingMember, { bold: true }),
        p(data.managingTitle),
        p(data.legalName),
        p(`Date: ____________________`),
      ],
    }],
  })
}

function generatePastPerformance(input: ProposalInput, data: EntityProposalData): Document {
  return new Document({
    styles: styles(data),
    numbering: numbering(),
    sections: [{
      properties: pageProps(data, input.solicitationNumber),
      children: [
        h1('Past Performance'),
        p(`${data.legalName} provides the following past performance references demonstrating our capability and experience relevant to this requirement.`),
        p(''),

        ...data.pastPerformance.flatMap((pp, idx) => [
          h2(`Reference ${idx + 1}: ${pp.client}`),
          infoTable([
            ['Client', pp.client],
            ...(pp.prime ? [['Prime Contractor', pp.prime] as [string, string]] : []),
            ['Role', pp.role],
            ['Period of Performance', pp.period],
            ['Scope of Work', pp.scope],
            ['Performance Impact', pp.impact],
            ['Contact Name', pp.contactName],
            ['Contact Phone', pp.contactPhone],
            ['Contact Email', pp.contactEmail],
          ], data.brandColors.primary),
          p(''),
        ]),

        p('[INSTRUCTION: Add additional past performance references as available. Government evaluators typically want 3-5 relevant references. Include contract numbers, dollar values, and specific performance metrics where possible.]', { color: 'CC0000', size: 20 }),
      ],
    }],
  })
}

function generateComplianceCerts(input: ProposalInput, data: EntityProposalData): Document {
  return new Document({
    styles: styles(data),
    numbering: numbering(),
    sections: [{
      properties: pageProps(data, input.solicitationNumber),
      children: [
        h1('Representations and Certifications'),
        p(`The following representations and certifications are made by ${data.legalName} in connection with Solicitation ${input.solicitationNumber || '[Number]'}.`),
        p(''),

        ...data.complianceStatements.flatMap((stmt, idx) => [
          p(`${idx + 1}. ${stmt}`),
          p(''),
        ]),

        h2('Additional Required Certifications'),
        p('[INSTRUCTION: Review the solicitation for additional required representations and certifications (FAR 52.204-xx, FAR 52.209-xx, DFARS clauses, etc.) and include them here. Many solicitations require specific clause-by-clause acknowledgments.]', { color: 'CC0000', size: 20 }),
        p(''),
        p(''),

        h2('Authorization'),
        p(`I certify that the above representations and certifications are accurate and complete to the best of my knowledge.`),
        p(''),
        p(''),
        p('_____________________________________________'),
        p(data.managingMember, { bold: true }),
        p(data.managingTitle),
        p(data.legalName),
        p(`Date: ____________________`),
      ],
    }],
  })
}

function generateQualityControlPlan(input: ProposalInput, data: EntityProposalData): Document {
  return new Document({
    styles: styles(data),
    numbering: numbering(),
    sections: [{
      properties: pageProps(data, input.solicitationNumber),
      children: [
        h1('Quality Control Plan'),
        p(`${input.title}`, { bold: true, size: 24 }),
        p(`Solicitation: ${input.solicitationNumber || '[Number]'}`, { size: 20, color: '666666' }),
        p(''),

        h2('1. Purpose'),
        p(`This Quality Control Plan (QCP) establishes the procedures and standards ${data.legalName} will implement to ensure all contract services meet or exceed the requirements specified in Solicitation ${input.solicitationNumber || '[Number]'}.`),
        p(''),

        h2('2. Quality Control Organization'),
        ...data.qualityControlBoilerplate.split('\n\n').map(para => p(para.trim())),
        p(''),

        h2('3. Inspection Methods'),
        bullet('Pre-work inspections before each service period'),
        bullet('In-progress monitoring during all operations'),
        bullet('Post-completion inspections with photographic documentation'),
        bullet('100% Government inspection compliance'),
        p(''),

        h2('4. Documentation'),
        bullet('Daily contractor log documenting work completed, hours expended, equipment used'),
        bullet('Photographic before/after documentation of all service areas'),
        bullet('Weekly performance summary reports submitted to the COR'),
        bullet('Incident reports filed within 24 hours of any occurrence'),
        bullet('Monthly quality metrics report'),
        p(''),

        h2('5. Corrective Action Procedures'),
        p('Upon identification of any deficiency, the following corrective action process will be implemented:'),
        bullet('Immediate notification to the Quality Control Inspector'),
        bullet('Assessment of deficiency scope and root cause'),
        bullet('Implementation of corrective action within 24 hours (or as required by contract)'),
        bullet('Documentation of corrective action taken'),
        bullet('Follow-up inspection to verify corrective action effectiveness'),
        bullet('Preventive measures to avoid recurrence'),
        p(''),

        h2('6. Performance Standards'),
        p('[INSTRUCTION: List specific performance standards from the SOW/PWS here. Include measurable quality metrics, acceptable quality levels (AQLs), and performance thresholds.]', { color: 'CC0000', size: 20 }),
        p(''),

        h2('7. Safety Integration'),
        ...data.safetyBoilerplate.split('\n\n').slice(0, 1).map(para => p(para.trim())),
      ],
    }],
  })
}

function generatePricingWorksheet(input: ProposalInput, data: EntityProposalData): Document {
  return new Document({
    styles: styles(data),
    numbering: numbering(),
    sections: [{
      properties: pageProps(data, input.solicitationNumber),
      children: [
        h1('Pricing Worksheet'),
        p(`${input.title}`, { bold: true, size: 24 }),
        p(`Solicitation: ${input.solicitationNumber || '[Number]'}`, { size: 20, color: '666666' }),
        p(''),
        p('[INSTRUCTION: This is a placeholder pricing document. Use the MOG Tracker Pricing Calculator to build your actual pricing, then export and replace this document. Alternatively, complete the pricing schedule format specified in the solicitation.]', { color: 'CC0000', size: 20 }),
        p(''),
        h2('CLIN Structure'),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [1200, 3600, 1000, 1000, 1280, 1280],
          rows: [
            new TableRow({
              children: ['CLIN', 'Description', 'Qty', 'Unit', 'Unit Price', 'Extended'].map((text, i) =>
                new TableCell({
                  borders: allBorders('CCCCCC'),
                  width: { size: [1200, 3600, 1000, 1000, 1280, 1280][i], type: WidthType.DXA },
                  margins: CELL_MARGINS,
                  shading: { fill: data.brandColors.primary.replace('#', ''), type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: 'Arial', size: 18, color: 'FFFFFF' })] })],
                })
              ),
            }),
            ...[1, 2, 3].map(n =>
              new TableRow({
                children: [`000${n}`, '[Description]', '[Qty]', '[Unit]', '$0.00', '$0.00'].map((text, i) =>
                  new TableCell({
                    borders: allBorders('DDDDDD'),
                    width: { size: [1200, 3600, 1000, 1000, 1280, 1280][i], type: WidthType.DXA },
                    margins: CELL_MARGINS,
                    children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 18 })] })],
                  })
                ),
              })
            ),
          ],
        }),
        p(''),
        p('Total Proposed Price: $________________', { bold: true, size: 24 }),
        p(''),
        p(`Note: Use the Pricing Calculator in the MOG Tracker app (${data.companyName} > Pricing tab) for detailed CLIN-level pricing with cost breakdowns, margins, and export to CSV.`, { color: '666666', size: 20 }),
      ],
    }],
  })
}

// ── Main Generator ───────────────────────────────────────────────────────────

/**
 * Generate all proposal documents for a government bid.
 * Returns an array of { fileName, buffer, description } objects.
 */
export async function generateProposalPackage(input: ProposalInput): Promise<GeneratedDoc[]> {
  const data = getEntityData(input.entity)
  const prefix = input.solicitationNumber
    ? `${input.solicitationNumber}_${data.companyName.replace(/\s+/g, '_')}`
    : `${data.companyName.replace(/\s+/g, '_')}_Proposal`

  const docs: { name: string; doc: Document; desc: string }[] = [
    { name: `${prefix}_Cover_Letter.docx`, doc: generateCoverLetter(input, data), desc: 'Formal cover letter with company credentials and submission confirmations' },
    { name: `${prefix}_Technical_Proposal.docx`, doc: generateTechnicalProposal(input, data), desc: 'Main technical proposal with approach, management, safety, and QC sections' },
    { name: `${prefix}_Past_Performance.docx`, doc: generatePastPerformance(input, data), desc: 'Past performance references formatted per government evaluation criteria' },
    { name: `${prefix}_Compliance_Certifications.docx`, doc: generateComplianceCerts(input, data), desc: 'Representations and certifications (FAR/DFARS compliance statements)' },
    { name: `${prefix}_Quality_Control_Plan.docx`, doc: generateQualityControlPlan(input, data), desc: 'Quality control procedures, inspection methods, and corrective action processes' },
    { name: `${prefix}_Pricing_Worksheet.docx`, doc: generatePricingWorksheet(input, data), desc: 'CLIN-based pricing template (use MOG Tracker calculator for actual pricing)' },
  ]

  const results: GeneratedDoc[] = []
  for (const { name, doc, desc } of docs) {
    const buffer = await Packer.toBuffer(doc)
    results.push({ fileName: name, buffer: Buffer.from(buffer), description: desc })
  }

  return results
}

/**
 * Generate a single capability statement document.
 */
export async function generateCapabilityStatement(entity: string): Promise<GeneratedDoc> {
  const data = getEntityData(entity)

  const doc = new Document({
    styles: styles(data),
    numbering: numbering(),
    sections: [{
      properties: pageProps(data, null),
      children: [
        // Title
        p(data.legalName, { bold: true, size: 36, color: data.brandColors.primary.replace('#', ''), alignment: AlignmentType.CENTER }),
        ...(data.tagline ? [p(data.tagline, { size: 22, color: data.brandColors.accent.replace('#', ''), alignment: AlignmentType.CENTER })] : []),
        p('CAPABILITY STATEMENT', { bold: true, size: 28, alignment: AlignmentType.CENTER, spacing: { after: 240 } }),

        // Company Overview
        h2('Company Overview'),
        ...data.companyOverview.split('\n\n').map(para => p(para.trim())),
        p(''),

        // Core Capabilities
        h2('Core Capabilities'),
        ...data.naicsCodes.map(n => bullet(`${n.code} — ${n.description}`)),
        p(''),

        // Certifications
        h2('Certifications and Registrations'),
        ...data.certifications.map(c => bullet(c)),
        p(''),

        // Past Performance
        h2('Past Performance'),
        ...data.pastPerformance.flatMap(pp => [
          p(pp.client, { bold: true }),
          p(`${pp.role} | ${pp.period}`, { size: 20, color: '666666' }),
          p(pp.scope),
          p(''),
        ]),

        // Differentiators
        h2('Differentiators'),
        bullet('Compliance-first operational framework'),
        bullet('Established teaming partnerships for full-scope delivery'),
        bullet(`${data.certifications.join(', ')}`),
        bullet('DMV-based with regional operational capabilities'),
        p(''),

        // Contact
        h2('Contact Information'),
        infoTable([
          ['Company', data.legalName],
          ...(data.uei ? [['UEI', data.uei] as [string, string]] : []),
          ...(data.cageCode ? [['CAGE Code', data.cageCode] as [string, string]] : []),
          ['Point of Contact', `${data.proposalLead}, ${data.proposalLeadTitle}`],
          ['Email', data.publicEmail],
          ...(data.phone ? [['Phone', data.phone] as [string, string]] : []),
          ...(data.website ? [['Website', data.website] as [string, string]] : []),
        ], data.brandColors.primary),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  return {
    fileName: `${data.companyName.replace(/\s+/g, '_')}_Capability_Statement.docx`,
    buffer: Buffer.from(buffer),
    description: `${data.companyName} capability statement with overview, NAICS codes, certifications, and past performance`,
  }
}
