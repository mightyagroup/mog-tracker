'use client'

import { AlertTriangle, Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'

interface DeadlineTimelineProps {
  overdue: number
  sevenDays: number
  fourteenDays: number
  thirtyDays: number
  sixtyPlus: number
}

export function DeadlineTimeline({
  overdue,
  sevenDays,
  fourteenDays,
  thirtyDays,
  sixtyPlus,
}: DeadlineTimelineProps) {
  const milestones = [
    {
      label: 'Overdue',
      count: overdue,
      icon: AlertTriangle,
      color: '#DC2626',
      bgColor: '#7F1D1D',
    },
    {
      label: 'This Week',
      count: sevenDays,
      icon: Clock,
      color: '#F97316',
      bgColor: '#7C2D12',
    },
    {
      label: 'Next 14 Days',
      count: fourteenDays,
      icon: AlertCircle,
      color: '#EAB308',
      bgColor: '#713F12',
    },
    {
      label: 'This Month',
      count: thirtyDays,
      icon: Calendar,
      color: '#06B6D4',
      bgColor: '#164E63',
    },
    {
      label: '60+ Days',
      count: sixtyPlus,
      icon: CheckCircle2,
      color: '#10B981',
      bgColor: '#064E3B',
    },
  ]

  return (
    <div className="bg-[#1F2937] rounded-lg border border-gray-700 p-6 shadow-lg">
      <h3 className="text-white text-lg font-bold mb-6">Deadline Proximity</h3>
      <div className="space-y-3">
        {milestones.map((milestone, idx) => {
          const Icon = milestone.icon
          return (
            <div key={idx} className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: milestone.bgColor }}
              >
                <Icon size={18} color={milestone.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-sm">{milestone.label}</p>
                <div className="mt-1 bg-gray-700 rounded-full h-2 w-full">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (milestone.count / Math.max(overdue, sevenDays, fourteenDays, thirtyDays, sixtyPlus, 1)) * 100)}%`,
                      backgroundColor: milestone.color,
                    }}
                  />
                </div>
              </div>
              <div className="flex-shrink-0">
                <p className="text-white font-bold text-lg">{milestone.count}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
