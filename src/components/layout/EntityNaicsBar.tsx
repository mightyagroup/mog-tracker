'use client'

import { ENTITY_NAICS, ENTITY_PRIMARY_NAICS, ENTITY_PSC } from '@/lib/constants'
import { EntityType } from '@/lib/types'

const NAICS_DESCRIPTIONS: Record<string, string> = {
  '561210': 'Facilities Support Services',
  '561720': 'Janitorial Services',
  '561730': 'Landscaping Services',
  '562111': 'Solid Waste Collection',
  '541614': 'Process/Logistics Consulting',
  '492110': 'Couriers & Express Delivery',
  '492210': 'Local Messengers & Delivery',
  '621511': 'Medical Laboratories',
  '621610': 'Home Health Care Services',
  '485991': 'Special Needs Transportation',
  '485999': 'All Other Transit & Ground Passenger',
  '561990': 'All Other Support Services',
}

const PSC_DESCRIPTIONS: Record<string, string> = {
  'S201': 'Housekeeping - Custodial/Janitorial',
  'S208': 'Landscaping/Groundskeeping',
  'S216': 'Facilities Operations Support',
  'S205': 'Trash/Garbage Collection',
  'R706': 'Logistics Support Services',
  'V119': 'Patient Transport (Ground Ambulance)',
  'V225': 'Non-Emergency Medical Transport',
  'Q301': 'Medical Laboratory Testing',
  'Q999': 'Other Medical Services',
}

interface EntityNaicsBarProps {
  entity: EntityType
  accentColor: string
}

export function EntityNaicsBar({ entity, accentColor }: EntityNaicsBarProps) {
  const naicsCodes = ENTITY_NAICS[entity]
  const primaryNaics = ENTITY_PRIMARY_NAICS[entity]
  const pscCodes = ENTITY_PSC[entity]

  return (
    <div className="px-6 py-2.5 border-b border-[#374151] bg-[#111827]/80 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
      <span className="text-gray-500 font-medium uppercase tracking-wider mr-1">NAICS</span>
      {naicsCodes.map(code => (
        <span
          key={code}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded"
          style={{
            backgroundColor: code === primaryNaics ? accentColor + '22' : '#374151',
            color: code === primaryNaics ? accentColor : '#9CA3AF',
            border: code === primaryNaics ? `1px solid ${accentColor}44` : '1px solid transparent',
          }}
          title={NAICS_DESCRIPTIONS[code] ?? code}
        >
          <span className="font-mono font-medium">{code}</span>
          {code === primaryNaics && (
            <span className="text-[10px] font-semibold opacity-80">PRIMARY</span>
          )}
        </span>
      ))}

      <span className="text-gray-600 mx-1">|</span>

      <span className="text-gray-500 font-medium uppercase tracking-wider mr-1">PSC</span>
      {pscCodes.map(code => (
        <span
          key={code}
          className="inline-flex items-center px-2 py-0.5 rounded bg-[#374151] text-gray-400 font-mono"
          title={PSC_DESCRIPTIONS[code] ?? code}
        >
          {code}
        </span>
      ))}
    </div>
  )
}
