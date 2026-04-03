'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'

const ENTITY_COLORS: Record<string, string> = {
  exousia: '#D4AF37',
  vitalx:  '#06A59A',
  ironhouse: '#B45309',
}

export function DeadlineCalendar({
  year, month, today, allDeadlines,
}: {
  year: number
  month: number
  today: number
  allDeadlines: { day: number; month: number; year: number; entity: string; title: string; daysOut: number }[]
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [currentMonth, setCurrentMonth] = useState(month)
  const [currentYear, setCurrentYear] = useState(year)

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('en-US', { month: 'long' })
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay()
  const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Group deadlines by day for current month
  const byDay: Record<number, { entity: string; title: string; daysOut: number }[]> = {}
  const currentDeadlines = allDeadlines.filter(d => d.month === currentMonth && d.year === currentYear)
  for (const d of currentDeadlines) {
    byDay[d.day] = byDay[d.day] ?? []
    byDay[d.day].push({ entity: d.entity, title: d.title, daysOut: d.daysOut })
  }

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selectedLeads = selectedDay ? byDay[selectedDay] ?? [] : []

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-[#D4AF37]" />
          <h2 className="text-white font-semibold text-sm">Deadline Calendar</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="text-gray-400 hover:text-white">‹</button>
          <span className="text-gray-500 text-xs">{monthName} {currentYear}</span>
          <button onClick={nextMonth} className="text-gray-400 hover:text-white">›</button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-xs text-gray-600 py-1 font-medium">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="h-9" />
          const dl = byDay[day] ?? []
          const isToday = day === today && currentMonth === month && currentYear === year
          const hasOverdue = dl.some(d => d.daysOut < 0)
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`h-9 rounded-lg p-1 relative transition ${
                isToday
                  ? 'ring-1 ring-[#D4AF37] bg-[#D4AF3712]'
                  : dl.length > 0
                  ? hasOverdue ? 'bg-red-900/20' : 'bg-[#1A2B3C]'
                  : 'hover:bg-[#253347]'
              }`}
            >
              <div className={`text-xs leading-none ${isToday ? 'text-[#D4AF37] font-bold' : hasOverdue ? 'text-red-400' : 'text-gray-500'}`}>
                {day}
              </div>
              {dl.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dl.slice(0, 4).map((d, j) => (
                    <span
                      key={j}
                      className="w-1.5 h-1.5 rounded-full block"
                      style={{ backgroundColor: d.daysOut < 0 ? '#FCA5A5' : ENTITY_COLORS[d.entity] ?? '#6B7280' }}
                      title={`${d.entity}: ${d.title}`}
                    />
                  ))}
                  {dl.length > 4 && <span className="text-gray-600 text-[9px] leading-none">+{dl.length - 4}</span>}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#374151] flex-wrap">
        {Object.entries(ENTITY_COLORS).map(([entity, color]) => (
          <div key={entity} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full block" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-500 capitalize">{entity}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full block bg-red-400" />
          <span className="text-xs text-gray-500">Overdue</span>
        </div>
        {currentDeadlines.length === 0 && (
          <span className="text-gray-600 text-xs">No deadlines this month</span>
        )}
        {currentDeadlines.length > 0 && (
          <span className="text-gray-600 text-xs ml-auto">{currentDeadlines.length} deadline{currentDeadlines.length !== 1 ? 's' : ''} this month</span>
        )}
      </div>

      {/* Selected day details */}
      {selectedDay && selectedLeads.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#374151]">
          <h3 className="text-white text-sm font-medium mb-2">Due on {monthName} {selectedDay}</h3>
          <div className="space-y-1">
            {selectedLeads.map((lead, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lead.daysOut < 0 ? '#FCA5A5' : ENTITY_COLORS[lead.entity] ?? '#6B7280' }} />
                <span className="text-gray-300 capitalize">{lead.entity}</span>
                <span className="text-gray-400 truncate">{lead.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}