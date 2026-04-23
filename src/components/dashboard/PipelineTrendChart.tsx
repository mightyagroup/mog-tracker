"use client"

// PipelineTrendChart: shows total pipeline value per day over the last 90 days,
// broken down by entity (Exousia, VitalX, IronHouse). Powered by Recharts.

import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase/client'

type Row = {
  id: string
  entity: string
  estimated_value: number | null
  status: string
  created_at: string
  archived_at: string | null
}

type DayPoint = { date: string; total: number; exousia: number; vitalx: number; ironhouse: number }

function fmtAxisCurrency(v: number): string {
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return '$' + (v / 1_000).toFixed(0) + 'K'
  return '$' + v
}

function fmtTooltipCurrency(v: number): string {
  return '$' + v.toLocaleString()
}

function shortDate(d: string): string {
  return d.slice(5)
}

export function PipelineTrendChart() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supa = createClient()
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
      const { data, error } = await supa.from('gov_leads')
        .select('id, entity, estimated_value, status, created_at, archived_at')
        .gte('created_at', ninetyDaysAgo)
        .in('status', ['new', 'reviewing', 'bid_no_bid', 'active_bid', 'submitted', 'awarded'])
      if (!cancelled) {
        if (error) setError(error.message)
        else setRows(data as Row[])
      }
    })()
    return () => { cancelled = true }
  }, [])

  const data: DayPoint[] = useMemo(() => {
    if (!rows) return []
    const byDay = new Map<string, DayPoint>()
    const now = new Date()
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000)
      const key = d.toISOString().slice(0, 10)
      byDay.set(key, { date: key, total: 0, exousia: 0, vitalx: 0, ironhouse: 0 })
    }
    for (const r of rows) {
      const value = r.estimated_value || 0
      if (value <= 0) continue
      const start = new Date(r.created_at)
      const end = r.archived_at ? new Date(r.archived_at) : now
      for (const [key, pt] of byDay) {
        const d = new Date(key + 'T12:00:00Z')
        if (d >= start && d <= end) {
          pt.total += value
          if (r.entity === 'exousia') pt.exousia += value
          else if (r.entity === 'vitalx') pt.vitalx += value
          else if (r.entity === 'ironhouse') pt.ironhouse += value
        }
      }
    }
    return Array.from(byDay.values())
  }, [rows])

  if (error) return <div className="text-red-400 text-sm">Pipeline chart error: {error}</div>
  if (!rows) return <div className="text-gray-400 text-sm">Loading pipeline…</div>
  if (rows.length === 0) return <div className="text-gray-400 text-sm">No pipeline data in last 90 days yet.</div>

  return (
    <div className="w-full h-80 bg-[#1F2937] rounded-xl border border-[#374151] p-4">
      <div className="text-white font-semibold mb-2">Pipeline value — last 90 days</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 30, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={shortDate} />
          <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={fmtAxisCurrency} />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff' }}
            formatter={(v: number) => fmtTooltipCurrency(v)}
          />
          <Legend wrapperStyle={{ paddingTop: 8, color: '#fff' }} />
          <Line type="monotone" dataKey="total"     stroke="#D4AF37" strokeWidth={2} dot={false} name="Total" />
          <Line type="monotone" dataKey="exousia"   stroke="#253A5E" strokeWidth={1.5} dot={false} name="Exousia" />
          <Line type="monotone" dataKey="vitalx"    stroke="#06A59A" strokeWidth={1.5} dot={false} name="VitalX" />
          <Line type="monotone" dataKey="ironhouse" stroke="#B45309" strokeWidth={1.5} dot={false} name="IronHouse" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
