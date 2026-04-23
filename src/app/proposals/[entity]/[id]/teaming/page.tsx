'use client'

// Teaming — track subcontractor/prime-teaming partners for this proposal.
// Pull from subcontractors master list; record LOI status + capability allocation.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Sub = {
  id: string
  company_name: string
  contact_name: string | null
  contact_email: string | null
  certifications: string[]
  loi_signed_at: string | null
  loi_url: string | null
  rate_card: Record<string, unknown> | null
  insurance: string | null
  teaming_agreement_status: string | null
}

type ProposalTeaming = {
  teaming_partners: { sub_id: string; role: string; scope: string }[] | null
}

export default function TeamingPage() {
  const params = useParams<{ entity: string; id: string }>()
  const entity = params?.entity as string
  const proposalId = params?.id as string

  const [allSubs, setAllSubs] = useState<Sub[]>([])
  const [selected, setSelected] = useState<{ sub_id: string; role: string; scope: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supa = createClient()
      const { data: subs } = await supa.from('subcontractors').select('*').order('company_name')
      const { data: prop } = await supa.from('proposals').select('teaming_partners').eq('id', proposalId).single()
      if (cancelled) return
      setAllSubs((subs as Sub[]) || [])
      const t = ((prop as unknown) as ProposalTeaming)?.teaming_partners
      setSelected(t || [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [proposalId])

  function addSub(subId: string) {
    if (selected.some(s => s.sub_id === subId)) return
    setSelected([...selected, { sub_id: subId, role: 'subcontractor', scope: '' }])
  }
  function updateSelected(i: number, patch: Partial<{ role: string; scope: string }>) {
    setSelected(selected.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }
  function removeSelected(i: number) {
    setSelected(selected.filter((_, idx) => idx !== i))
  }

  async function save() {
    setSaving(true); setError(null); setMsg(null)
    const supa = createClient()
    const { error } = await supa.from('proposals').update({ teaming_partners: selected }).eq('id', proposalId)
    setSaving(false)
    if (error) { setError(error.message); return }
    setMsg('Teaming saved.')
  }

  if (loading) return <div className="px-8 py-6 text-white">Loading teaming…</div>

  return (
    <div className="px-8 py-6 min-h-screen bg-[#111827] text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Teaming — {entity}</h1>
          <p className="text-sm text-gray-400 mt-1">Attach subcontractors or prime-teaming partners to this proposal.</p>
        </div>
        <div className="flex gap-3">
          <Link href={'/proposals/' + entity + '/' + proposalId + '/compliance'} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">Compliance</Link>
          <Link href={'/proposals/' + entity + '/' + proposalId + '/pricing'} className="px-3 py-2 rounded bg-[#1F2937] text-sm border border-[#374151]">Pricing</Link>
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded mb-4">{error}</div>}
      {msg && <div className="bg-blue-900/30 border border-blue-700 text-blue-200 p-3 rounded mb-4">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5">
          <div className="text-sm font-semibold mb-3">Attached to this proposal ({selected.length})</div>
          {selected.length === 0 && <div className="text-gray-400 text-sm">None yet. Pick from the list on the right.</div>}
          <div className="space-y-3">
            {selected.map((s, i) => {
              const sub = allSubs.find(x => x.id === s.sub_id)
              return (
                <div key={s.sub_id} className="bg-[#111827] border border-[#374151] rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-white">{sub?.company_name || s.sub_id}</div>
                    <button onClick={() => removeSelected(i)} className="text-red-400 text-xs">✕</button>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <select className="bg-[#1F2937] border border-[#374151] rounded text-xs px-2 py-1 text-white" value={s.role} onChange={e => updateSelected(i, { role: e.target.value })}>
                      <option value="subcontractor">Subcontractor</option>
                      <option value="prime_partner">Prime partner</option>
                      <option value="consultant">Consultant</option>
                      <option value="supplier">Supplier</option>
                    </select>
                    <div className="text-xs text-gray-400">
                      LOI: {sub?.loi_signed_at ? new Date(sub.loi_signed_at).toLocaleDateString() : 'none'}
                    </div>
                  </div>
                  <textarea className="w-full bg-[#1F2937] border border-[#374151] rounded text-xs p-2 text-white" rows={2} placeholder="Scope allocation" value={s.scope} onChange={e => updateSelected(i, { scope: e.target.value })} />
                </div>
              )
            })}
          </div>
          <button onClick={save} disabled={saving} className="mt-4 px-4 py-2 rounded bg-[#D4AF37] text-[#111827] text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save teaming'}
          </button>
        </div>

        <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-5">
          <div className="text-sm font-semibold mb-3">Available subcontractors</div>
          <div className="space-y-2">
            {allSubs.map(sub => {
              const taken = selected.some(s => s.sub_id === sub.id)
              return (
                <div key={sub.id} className="flex items-center justify-between bg-[#111827] border border-[#374151] rounded p-2">
                  <div>
                    <div className="text-sm text-white">{sub.company_name}</div>
                    <div className="text-xs text-gray-400">{(sub.certifications || []).join(', ') || '—'}</div>
                  </div>
                  <button onClick={() => addSub(sub.id)} disabled={taken} className="px-2 py-1 rounded bg-[#374151] text-xs text-white disabled:opacity-50">
                    {taken ? 'Added' : '+ Add'}
                  </button>
                </div>
              )
            })}
            {allSubs.length === 0 && <div className="text-gray-400 text-sm">No subcontractors yet. Add them from the main Subcontractors screen.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
