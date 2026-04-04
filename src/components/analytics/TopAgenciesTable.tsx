'use client'

interface Agency {
  agency: string
  count: number
  value: number
  avgFitScore: number
}

interface TopAgenciesTableProps {
  data: Agency[]
}

export function TopAgenciesTable({ data }: TopAgenciesTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-[#1F2937] rounded-lg border border-gray-700 p-6 shadow-lg flex items-center justify-center h-80">
        <p className="text-gray-400">No agency data available</p>
      </div>
    )
  }

  return (
    <div className="bg-[#1F2937] rounded-lg border border-gray-700 p-6 shadow-lg">
      <h3 className="text-white text-lg font-bold mb-6">Top Agencies</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Agency</th>
              <th className="text-center py-3 px-4 text-gray-400 font-semibold">Lead Count</th>
              <th className="text-right py-3 px-4 text-gray-400 font-semibold">Total Value</th>
              <th className="text-center py-3 px-4 text-gray-400 font-semibold">Avg Fit Score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((agency, idx) => (
              <tr key={idx} className="border-b border-gray-700 hover:bg-[#111827] transition-colors">
                <td className="py-3 px-4 text-white font-medium">{agency.agency}</td>
                <td className="py-3 px-4 text-center text-gray-300">{agency.count}</td>
                <td className="py-3 px-4 text-right text-gray-300">
                  ${(agency.value / 1000000).toFixed(1)}M
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-white font-medium"
                    style={{
                      backgroundColor:
                        agency.avgFitScore >= 75
                          ? '#065F46'
                          : agency.avgFitScore >= 50
                            ? '#1F3A8A'
                            : agency.avgFitScore >= 25
                              ? '#7C2D12'
                              : '#4B5563',
                    }}
                  >
                    {agency.avgFitScore.toFixed(0)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
