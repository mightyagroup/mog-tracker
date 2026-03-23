interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

export function LoadingSpinner({ size = 'md', color = '#D4AF37' }: LoadingSpinnerProps) {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size]

  return (
    <div
      className={`${sizeClass} animate-spin rounded-full border-2 border-[#374151]`}
      style={{ borderTopColor: color }}
    />
  )
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" />
    </div>
  )
}
