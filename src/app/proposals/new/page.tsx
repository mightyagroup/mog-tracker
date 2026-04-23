'use client'

// /proposals/new?lead_id=X&entity=Y — creates (or finds) a proposal and redirects to intake.
// This is the bridge from gov_leads to the proposal platform.

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

function Bridge() {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string>('Preparing proposal…')

  useEffect(() => {
    const leadId = params?.get('lead_id')
    const entity = params?.get('entity')
    if (!leadId || !entity) {
      setError('lead_id and entity are required')
      return
    }
    ;(async () => {
      try {
        setMsg('Creating proposal from gov lead…')
        const r = await fetch('/api/proposals/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gov_lead_id: leadId, entity }),
        })
        const j = await r.json()
        if (!r.ok || !j.proposal_id) throw new Error(j.error || 'create failed')
        router.replace('/proposals/' + entity + '/' + j.proposal_id + '/intake')
      } catch (e: unknown) {
        setError((e as Error).message)
      }
    })()
  }, [params, router])

  return (
    <div className="px-8 py-12 min-h-screen bg-[#111827] text-white flex items-center justify-center">
      <div className="bg-[#1F2937] border border-[#374151] rounded-xl p-8 max-w-md text-center">
        {error ? (
          <>
            <div className="text-red-400 font-semibold mb-2">Could not create proposal</div>
            <div className="text-sm text-gray-300">{error}</div>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold mb-2">{msg}</div>
            <div className="text-xs text-gray-400">You&apos;ll be redirected to intake in a moment.</div>
          </>
        )}
      </div>
    </div>
  )
}

export default function NewProposalBridge() {
  return (
    <Suspense fallback={<div className="px-8 py-12 min-h-screen bg-[#111827] text-white">Loading…</div>}>
      <Bridge />
    </Suspense>
  )
}
