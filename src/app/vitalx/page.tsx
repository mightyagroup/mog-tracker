import { Sidebar } from '@/components/layout/Sidebar'
import { Activity } from 'lucide-react'

export default function VitalXPage() {
  return (
    <div className="flex min-h-screen bg-[#111827]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
        <header className="flex items-center gap-4 px-6 py-5 border-b border-[#374151] bg-[#1A2233]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#06A59A22]">
            <Activity size={20} className="text-[#06A59A]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">VitalX</h1>
            <p className="text-gray-400 text-sm">Healthcare logistics · Medical courier · DMV region</p>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-white font-semibold mb-2">VitalX Tracker</h2>
            <p className="text-gray-400 text-sm">Government + Commercial tracker — coming in Phase 3.</p>
          </div>
        </main>
      </div>
    </div>
  )
}
