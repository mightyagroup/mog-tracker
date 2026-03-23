import { LeadStatus } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/constants'

interface StatusBadgeProps {
  status: LeadStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const { bg, text } = STATUS_COLORS[status]
  const label = STATUS_LABELS[status]
  const padding = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-xs'

  return (
    <span
      className={`inline-flex items-center rounded font-medium whitespace-nowrap ${padding}`}
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  )
}
