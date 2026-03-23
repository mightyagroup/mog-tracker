import { differenceInDays, parseISO, format } from 'date-fns'

interface DeadlineCountdownProps {
  deadline: string | null | undefined
  showDate?: boolean
}

export function DeadlineCountdown({ deadline, showDate = false }: DeadlineCountdownProps) {
  if (!deadline) return <span className="text-gray-500 text-xs">—</span>

  const days = differenceInDays(parseISO(deadline), new Date())
  const dateStr = showDate ? format(parseISO(deadline), 'MMM d, yyyy') : null

  let bg: string
  let text: string
  let label: string

  if (days < 0) {
    bg = '#1c1917'
    text = '#78716c'
    label = 'Overdue'
  } else if (days === 0) {
    bg = '#450a0a'
    text = '#fca5a5'
    label = 'Today'
  } else if (days < 7) {
    bg = '#450a0a'
    text = '#fca5a5'
    label = `${days}d`
  } else if (days < 14) {
    bg = '#422006'
    text = '#fcd34d'
    label = `${days}d`
  } else {
    bg = '#052e16'
    text = '#86efac'
    label = `${days}d`
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
        style={{ backgroundColor: bg, color: text }}
      >
        {label}
      </span>
      {showDate && dateStr && (
        <span className="text-gray-500 text-xs">{dateStr}</span>
      )}
    </div>
  )
}
