"use client"

// BulkActionBar: floating toolbar that appears when rows are selected.
// Supports change-status, assign-lead, archive, delete, export-CSV.
// Parent provides selected ids + handlers; this component owns the UI only.

import { useState } from 'react'

export type BulkAction =
  | { type: 'change_status'; status: string }
  | { type: 'assign_lead'; assignee: string }
  | { type: 'archive' }
  | { type: 'delete' }
  | { type: 'export_csv' }

export type BulkActionBarProps = {
  selectedCount: number
  onClear: () => void
  onApply: (action: BulkAction) => Promise<void>
  statusOptions?: Array<{ value: string; label: string }>
  showAssignLead?: boolean
}

export function BulkActionBar({ selectedCount, onClear, onApply, statusOptions, showAssignLead }: BulkActionBarProps) {
  const [applying, setApplying] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [assignee, setAssignee] = useState('')

  if (selectedCount === 0) return null

  async function fire(action: BulkAction, key: string) {
    if (applying) return
    setApplying(key)
    try { await onApply(action) } finally { setApplying(null) }
  }

  function confirmDelete() {
    const noun = selectedCount === 1 ? 'record' : 'records'
    const msg = 'Delete ' + selectedCount + ' ' + noun + '? They will be recoverable for 7 days.'
    if (!confirm(msg)) return
    fire({ type: 'delete' }, 'delete')
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 bg-[#1F2937] text-white rounded-xl shadow-2xl border border-[#374151]">
      <div className="text-sm pr-2">
        <span className="font-bold text-[#D4AF37]">{selectedCount}</span> selected
      </div>

      {statusOptions && statusOptions.length > 0 && (
        <div className="flex items-center gap-1 pl-2 border-l border-[#374151]">
          <select
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
            disabled={!!applying}
            className="bg-[#111827] text-white text-sm rounded px-2 py-1 border border-[#374151]"
          >
            <option value="">Change status…</option>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            type="button"
            disabled={!newStatus || !!applying}
            onClick={() => fire({ type: 'change_status', status: newStatus }, 'status')}
            className="bg-[#D4AF37] text-[#111827] font-medium text-sm px-3 py-1 rounded disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      )}

      {showAssignLead && (
        <div className="flex items-center gap-1 pl-2 border-l border-[#374151]">
          <input
            type="text"
            placeholder="Assign to…"
            value={assignee}
            onChange={e => setAssignee(e.target.value)}
            disabled={!!applying}
            className="bg-[#111827] text-white text-sm rounded px-2 py-1 border border-[#374151] w-32"
          />
          <button
            type="button"
            disabled={!assignee.trim() || !!applying}
            onClick={() => fire({ type: 'assign_lead', assignee: assignee.trim() }, 'assign')}
            className="bg-[#D4AF37] text-[#111827] font-medium text-sm px-3 py-1 rounded disabled:opacity-40"
          >
            Set
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 pl-2 border-l border-[#374151]">
        <button
          type="button"
          disabled={!!applying}
          onClick={() => fire({ type: 'export_csv' }, 'export')}
          className="bg-[#374151] text-white text-sm px-3 py-1 rounded hover:bg-[#4B5563] disabled:opacity-40"
        >
          {applying === 'export' ? 'Exporting…' : 'Export CSV'}
        </button>
        <button
          type="button"
          disabled={!!applying}
          onClick={() => fire({ type: 'archive' }, 'archive')}
          className="bg-[#374151] text-white text-sm px-3 py-1 rounded hover:bg-[#D97706] disabled:opacity-40"
        >
          {applying === 'archive' ? 'Archiving…' : 'Archive'}
        </button>
        <button
          type="button"
          disabled={!!applying}
          onClick={confirmDelete}
          className="bg-[#7F1D1D] text-white text-sm px-3 py-1 rounded hover:bg-[#991B1B] disabled:opacity-40"
        >
          {applying === 'delete' ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      <button
        type="button"
        onClick={onClear}
        disabled={!!applying}
        className="text-gray-400 hover:text-white text-sm ml-2 px-2 py-1"
        title="Clear selection"
      >
        Clear
      </button>
    </div>
  )
}
