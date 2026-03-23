import { Sidebar } from '@/components/layout/Sidebar'
import { Building2 } from 'lucide-react'

export default function IronHousePage() {
  return (
    <div className="flex min-h-screen bg-[#111827]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
        <header className="flex items-center gap-4 px-6 py-5 border-b border-[#374151] bg-[#1A2233]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#B4530922]">
            <Building2 size={20} className="text-[#B45309]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">IronHouse</h1>
            <p className="text-gray-400 text-sm">Janitorial · Landscaping · Facilities maintenance</p>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-white font-semibold mb-2">IronHouse Tracker</h2>
            <p className="text-gray-400 text-sm">Government tracker — coming in Phase 3.</p>
          </div>
        </main>
      </div>
    </div>
  )
}
