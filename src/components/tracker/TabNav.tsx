'use client'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabNavProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
  accentColor?: string
}

export function TabNav({ tabs, activeTab, onChange, accentColor = '#D4AF37' }: TabNavProps) {
  return (
    <div className="flex border-b border-[#374151] overflow-x-auto scrollbar-none">
      {tabs.map(tab => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors
              ${active ? 'text-white' : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-600'}
            `}
            style={active ? { color: accentColor, borderColor: accentColor } : {}}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className="px-1.5 py-0.5 rounded-full text-xs bg-[#374151] text-gray-300"
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
