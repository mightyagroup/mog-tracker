'use client'

interface CommercialPipelineData {
  prospect: number
  outreach: number
  proposal: number
  negotiation: number
  contract: number
  lost: number
  inactive: number
  totalValue: number
}

interface CommercialPipelineProps {
  data: CommercialPipelineData
}

export function CommercialPipeline({ data }: CommercialPipelineProps) {
  const stages = [
    { label: 'Prospect', value: data.prospect, color: '#3B82F6' },
    { label: 'Outreach', value: data.outreach, color: '#F59E0B' },
    { label: 'Proposal', value: data.proposal, color: '#8B5CF6' },
    { label: 'Negotiation', value: data.negotiation, color: '#F97316' },
    { label: 'Contract', value: data.contract, color: '#10B981' },
    { label: 'Lost', value: data.lost, color: '#DC2626' },
    { label: 'Inactive', value: data.inactive, color: '#6B7280' },
  ]

  const total = Object.values(data).slice(0, 7).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-[#1F2937] rounded-lg border border-gray-700 p-6 shadow-lg">
      <h3 className="text-white text-lg font-bold mb-6">VitalX Commercial Pipeline</h3>
      <div className="space-y-4">
        {stages.map((stage, idx) => {
          const percentage = total > 0 ? (stage.value / total) * 100 : 0
          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-300 font-medium text-sm">{stage.label}</p>
                <span className="text-white font-bold">{stage.value}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: stage.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-8 pt-6 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 font-medium">Total Pipeline Value</span>
          <span className="text-white text-2xl font-bold">${(data.totalValue / 1000000).toFixed(1)}M</span>
        </div>
      </div>
    </div>
  )
}
