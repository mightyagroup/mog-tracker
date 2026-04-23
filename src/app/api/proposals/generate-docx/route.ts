import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, PageBreak, TextRun } from 'docx'
import { addressFor } from '@/lib/address-protocol'

// POST /api/proposals/generate-docx
// Body: { proposal_id: string }
// Returns: DOCX file stream (application/vnd.openxmlformats-officedocument.wordprocessingml.document)

export const runtime = 'nodejs'
export const maxDuration = 60

type Bag = Record<string, unknown>

function s(v: unknown): string { return typeof v === 'string' ? v : '' }
function n(v: unknown): number { return typeof v === 'number' ? v : 0 }

function heading(text: string, level: typeof HeadingLevel.HEADING_1 = HeadingLevel.HEADING_1): Paragraph {
  return new Paragraph({ text, heading: level, spacing: { before: 200, after: 100 } })
}

function bodyPara(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, size: 22 })], spacing: { after: 120 } })
}

function kv(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: label + ': ', bold: true, size: 22 }),
      new TextRun({ text: value || '—', size: 22 }),
    ],
    spacing: { after: 80 },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const proposalId = body.proposal_id as string
    if (!proposalId) return NextResponse.json({ error: 'proposal_id required' }, { status: 400 })

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    const { data: prop, error: propErr } = await supa.from('proposals')
      .select('*, gov_leads(title, agency, solicitation_number, response_deadline, estimated_value)')
      .eq('id', proposalId)
      .single()
    if (propErr || !prop) {
      return NextResponse.json({ error: propErr?.message || 'proposal not found' }, { status: 404 })
    }
    const p = prop as Bag
    const gl = (p.gov_leads as Bag) || {}
    const entity = s(p.entity)
    const contactAddress = addressFor('federal_proposal')

    const { data: compItems } = await supa.from('proposal_compliance_items')
      .select('section, requirement, status, source_reference')
      .eq('proposal_id', proposalId)
      .order('sort_order', { ascending: true })

    // Cover page
    const coverChildren: Paragraph[] = [
      new Paragraph({
        text: entity.toUpperCase(),
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: 'Proposal Response',
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: s(gl.title) || 'Untitled Solicitation',
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 600 },
      }),
      kv('Solicitation Number', s(gl.solicitation_number) || s(p.solicitation_number)),
      kv('Agency', s(gl.agency) || s(p.agency)),
      kv('Submission Deadline', s(gl.response_deadline) || s(p.submission_deadline)),
      kv('NAICS Code', s(p.naics_code)),
      kv('Set-Aside', s(p.set_aside) || 'none'),
      kv('Place of Performance', s(p.place_of_performance)),
      new Paragraph({ children: [new PageBreak()] }),
    ]

    // Executive summary section
    const exec: Paragraph[] = [
      heading('1. Executive Summary'),
      bodyPara(
        entity.toUpperCase() +
        ' respectfully submits this proposal for ' +
        (s(gl.title) || 'the referenced opportunity') +
        ' issued by ' +
        (s(gl.agency) || 'the agency') +
        '. Our team is committed to delivering compliant, on-time performance at fair and reasonable prices.'
      ),
    ]

    // Technical volume
    const narr = s(p.narrative_draft)
    const tech: Paragraph[] = [
      new Paragraph({ children: [new PageBreak()] }),
      heading('2. Technical Approach'),
    ]
    if (narr) {
      for (const para of narr.split('\n\n')) {
        const clean = para.trim()
        if (clean) tech.push(bodyPara(clean))
      }
    } else {
      tech.push(bodyPara('[Technical narrative not yet drafted. Edit on the Validate page before regenerating.]'))
    }

    // Compliance matrix as a table
    const compliance: Paragraph[] = [
      new Paragraph({ children: [new PageBreak()] }),
      heading('3. Compliance Matrix'),
    ]
    const compTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Section', bold: true, size: 20 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Requirement', bold: true, size: 20 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, size: 20 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Source', bold: true, size: 20 })] })] }),
          ],
        }),
        ...((compItems || []).map(ci => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: s((ci as Bag).section), size: 20 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: s((ci as Bag).requirement), size: 20 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: s((ci as Bag).status), size: 20 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: s((ci as Bag).source_reference), size: 20 })] })] }),
          ],
        }))),
      ],
    })

    // Pricing summary
    const pricing: Paragraph[] = [
      new Paragraph({ children: [new PageBreak()] }),
      heading('4. Pricing Summary'),
    ]
    const pd = (p.pricing_data as Bag) || {}
    const clins = (pd.clins as Bag[]) || []
    let pricingTable: Table | null = null
    if (clins.length > 0) {
      pricing.push(bodyPara('Total evaluated price: $' + n(p.pricing_total).toLocaleString()))
      pricingTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'CLIN', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Qty', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Unit Cost', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Margin %', bold: true, size: 20 })] })] }),
            ],
          }),
          ...clins.map(c => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: s(c.clin), size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: s(c.description), size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(n(c.qty)), size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '$' + n(c.unit_cost).toLocaleString(), size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: n(c.margin_pct).toFixed(1) + '%', size: 20 })] })] }),
            ],
          })),
        ],
      })
    } else {
      pricing.push(bodyPara('[Pricing not yet saved. Edit on the Pricing page before regenerating.]'))
    }

    // Signature / address block
    const signature: Paragraph[] = [
      new Paragraph({ children: [new PageBreak()] }),
      heading('5. Signature and Authorized Representative'),
      bodyPara('This proposal is submitted on behalf of ' + entity.toUpperCase() + '.'),
      new Paragraph({ children: [new TextRun({ text: ' ' })] }),
      kv('Address', contactAddress.line1),
      kv('City, State ZIP', contactAddress.city + ', ' + contactAddress.state + ' ' + contactAddress.zip),
      kv('Contact Email', s(p.contracting_officer_email) || 'proposals@mightyoakgroup.com'),
    ]

    const sectionChildren: (Paragraph | Table)[] = [
      ...coverChildren, ...exec, ...tech,
      ...compliance, compTable,
      ...pricing,
      ...(pricingTable ? [pricingTable] : []),
      ...signature,
    ]

    const doc = new Document({
      creator: 'MOG Tracker',
      title: 'Proposal — ' + (s(gl.title) || entity),
      sections: [{ children: sectionChildren }],
    })

    const buffer = await Packer.toBuffer(doc)

    const filename = (entity + '_' + (s(gl.solicitation_number) || proposalId.slice(0, 8)) + '_proposal.docx').replace(/[^a-zA-Z0-9_.-]/g, '_')

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
      },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'error' }, { status: 500 })
  }
}
