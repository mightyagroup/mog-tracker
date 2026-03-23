import { differenceInDays, parseISO, format } from 'date-fns'

interface DeadlineCountdownProps {
  deadline: string | null | undefined
  showDate?: boolean // kept for API compat, now always shows date
}

export function DeadlineCountdown({ deadline }: DeadlineCountdownProps) {
  if (!deadline) return <span className="text-gray-500 text-xs">—</span>

  const days = differenceInDays(parseISO(deadline), new Date())
  const dateStr = format(parseISO(deadline), 'MMM d, yyyy')

  let color: string
  let badge: string

  if (days < 0) {
    color = '#78716c'
    badge = 'Overdue'
  } else if (days === 0) {
    color = '#fca5a5'
    badge = 'Today'
  } else if (days < 7) {
    color = '#fca5a5'
    badge = `${days}d`
  } else if (days < 14) {
    color = '#fcd34d'
    badge = `${days}d`
  } else {
    color = '#86efac'
    badge = `${days}d`
  }

  return (
    <div className="text-xs whitespace-nowrap">
      <span className="text-gray-300">{dateStr}</span>
      <span className="font-semibold ml-1" style={{ color }}>({badge})</span>
    </div>
  )
}
