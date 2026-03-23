interface CategoryBadgeProps {
  name: string
  color: string
}

export function CategoryBadge({ name, color }: CategoryBadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: color + '22', color }}
    >
      {name}
    </span>
  )
}
