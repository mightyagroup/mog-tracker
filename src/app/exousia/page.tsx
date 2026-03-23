'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TabNav } from '@/components/tracker/TabNav'
import { LeadsTable } from '@/components/tracker/LeadsTable'
import { SubcontractorsTable } from '@/components/tracker/SubcontractorsTable'
import { GovPricingCalculator } from '@/components/pricing/GovPricingCalculator'
import { EntityContactsTab } from '@/components/contacts/EntityContactsTab'
import { Shield } from 'lucide-react'

const ACCENT = '#D4AF37'

const TABS = [
  { id: 'leads',           label: 'Leads' },
  { id: 'subcontractors',  label: 'Subcontractors' },
  { id: 'active_bids',     label: 'Active Bids' },
  { id: 'awards',          label: 'Awards' },
  { id: 'pricing',         label: 'Pricing Calculator' },
  { id: 'contacts',        label: 'Contacts' },
]

export default function ExousiaPage() {
  const [activeTab, setActiveTab] = useState('leads')

  return (
    <div className="flex min-h-screen bg-[#111827]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-0 pt-14 lg:pt-0">
        {/* Page header */}
        <header className="flex items-center gap-4 px-6 py-5 border-b border-[#374151] bg-[#1A2233] flex-shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: ACCENT + '22' }}
          >
            <Shield size={20} style={{ color: ACCENT }} />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">Exousia Solutions</h1>
            <p className="text-gray-400 text-sm">Facilities management · Procurement · Government contracting support</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="text-xs text-gray-500 text-right">
              <div style={{ color: ACCENT }} className="font-semibold text-xs">WOSB · EDWOSB</div>
              <div>UEI: XNZ2KYQYK566</div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <TabNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} accentColor={ACCENT} />

        {/* Tab content */}
        <main className="flex-1 p-6 overflow-auto">
          {activeTab === 'leads' && (
            <LeadsTable entity="exousia" title="Leads" accentColor={ACCENT} />
          )}
          {activeTab === 'subcontractors' && (
            <SubcontractorsTable entity="exousia" />
          )}
          {activeTab === 'active_bids' && (
            <LeadsTable
              entity="exousia"
              presetStatuses={['active_bid']}
              title="Active Bids"
              accentColor={ACCENT}
            />
          )}
          {activeTab === 'awards' && (
            <LeadsTable
              entity="exousia"
              presetStatuses={['awarded']}
              title="Awards"
              accentColor={ACCENT}
            />
          )}
          {activeTab === 'pricing' && (
            <GovPricingCalculator entity="exousia" accentColor={ACCENT} />
          )}
          {activeTab === 'contacts' && (
            <EntityContactsTab entity="exousia" accentColor={ACCENT} />
          )}
        </main>
      </div>
    </div>
  )
}
