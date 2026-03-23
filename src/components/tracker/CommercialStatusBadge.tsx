import { CommercialStatus } from '@/lib/types'
import { COMMERCIAL_STATUS_LABELS, COMMERCIAL_STATUS_COLORS } from '@/lib/constants'

export function CommercialStatusBadge({ status }: { status: CommercialStatus }) {
  const { bg, text } = COMMERCIAL_STATUS_COLORS[status]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: bg, color: text }}
    >
      {COMMERCIAL_STATUS_LABELS[status]}
    </span>
  )
}
