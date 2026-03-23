import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CommandCenterPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#111827] flex">
      {/* Sidebar placeholder — built fully in Phase 2 */}
      <aside className="w-64 bg-[#1F2937] border-r border-[#374151] flex flex-col">
        <div className="p-5 border-b border-[#374151]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#D4AF37] flex items-center justify-center">
              <span className="text-[#111827] font-black text-sm">M</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm">Mighty Oak Group</div>
              <div className="text-[#D4AF37] text-xs">Command Center</div>
            </div>
          </div>
        </div>
        <nav className="p-4 flex-1 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#374151] text-white text-sm font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            MOG Command
          </Link>
          <Link
            href="/exousia"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-[#374151] hover:text-white text-sm transition"
          >
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            Exousia Solutions
          </Link>
          <Link
            href="/vitalx"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-[#374151] hover:text-white text-sm transition"
          >
            <span className="w-2 h-2 rounded-full bg-[#06A59A]" />
            VitalX
          </Link>
          <Link
            href="/ironhouse"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-[#374151] hover:text-white text-sm transition"
          >
            <span className="w-2 h-2 rounded-full bg-[#B45309]" />
            IronHouse
          </Link>
        </nav>
        <div className="p-4 border-t border-[#374151]">
          <p className="text-gray-500 text-xs truncate">{user.email}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">MOG Command Center</h1>
          <p className="text-gray-400 text-sm mt-1">
            Pipeline overview across all Mighty Oak Group entities
          </p>
        </div>

        {/* Entity cards — data will be live in Phase 4 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <EntityCard
            name="Exousia Solutions"
            color="#D4AF37"
            description="Cybersecurity compliance, facilities management, government contracting"
            href="/exousia"
          />
          <EntityCard
            name="VitalX"
            color="#06A59A"
            description="HIPAA-compliant healthcare logistics, medical courier, DMV region"
            href="/vitalx"
          />
          <EntityCard
            name="IronHouse"
            color="#B45309"
            description="Janitorial, landscaping, facilities maintenance"
            href="/ironhouse"
          />
        </div>

        <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-6">
          <h2 className="text-white font-semibold mb-2">Phase 1 Complete</h2>
          <p className="text-gray-400 text-sm">
            Database schema, authentication, and project scaffold are ready. Entity trackers
            (Phase 2–3), Command Center dashboard (Phase 4), and pricing calculators (Phase 5)
            are coming next.
          </p>
        </div>
      </main>
    </div>
  )
}

function EntityCard({
  name,
  color,
  description,
  href,
}: {
  name: string
  color: string
  description: string
  href: string
}) {
  return (
    <Link href={href} className="block">
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-6 hover:border-gray-500 transition cursor-pointer">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-white font-semibold">{name}</h3>
        </div>
        <p className="text-gray-400 text-sm">{description}</p>
        <div className="mt-4 text-xs font-medium" style={{ color }}>
          Open tracker &rarr;
        </div>
      </div>
    </Link>
  )
}
