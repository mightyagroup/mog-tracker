import { LucideIcon, FileSearch } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon = FileSearch, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-[#374151] flex items-center justify-center mb-4">
        <Icon className="text-gray-400" size={28} />
      </div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm max-w-sm mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[#374151] hover:bg-[#4B5563] text-white text-sm rounded-lg transition"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
