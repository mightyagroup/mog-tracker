interface FitScoreBadgeProps {
  score: number
}

export function FitScoreBadge({ score }: FitScoreBadgeProps) {
  let bg: string
  let text: string

  if (score >= 70) {
    bg = '#052e16'
    text = '#4ade80'
  } else if (score >= 40) {
    bg = '#422006'
    text = '#fcd34d'
  } else {
    bg = '#450a0a'
    text = '#fca5a5'
  }

  return (
    <span
      className="inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold tabular-nums"
      style={{ backgroundColor: bg, color: text }}
    >
      {score}
    </span>
  )
}
