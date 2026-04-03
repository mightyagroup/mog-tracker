'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TabNav } from '@/components/tracker/TabNav'
import { LeadsTable } from '@/components/tracker/LeadsTable'
import { SubcontractorsTable } from '@/components/tracker/SubcontractorsTable'
import { GovPricingCalculator } from '@/components/pricing/GovPricingCalculator'
import { EntityContactsTab } from '@/components/contacts/EntityContactsTab'
import { Building2 } from 'lucide-react'

const ACCENT = '#B45309'

const TABS = [
  { id: 'leads',          label: 'Leads' },
  { id: 'subcontractors', label: 'Subcontractors' },
  { id: 'active_bids',    label: 'Active Bids' },
  { id: 'awards',         label: 'Awards' },
  { id: 'pricing',        label: 'Pricing Calculator' },
  { id: 'contacts',       label: 'Contacts' },
]

export default function IronHousePage() {
  const [activeTab, setActiveTab] = useState('leads')

  return (
    <div className="flex min-h-screen bg-[#111827]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-0 pt-14 lg:pt-0">
        {/* Page header */}
        <header className="flex items-center gap-4 px-6 py-5 border-b border-[#374151] bg-[#1C1410] flex-shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: ACCENT + '33' }}
          >
            <Building2 size={20} style={{ color: ACCENT }} />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">IronHouse Janitorial & Landscaping</h1>
            <p className="text-gray-400 text-sm">Janitorial · Landscaping · Facilities maintenance</p>
          </div>
          <div className="ml-auto">
            <div className="text-xs text-right">
              <div style={{ color: ACCENT }} className="font-semibold">Proposal Lead: Nana Badu</div>
              <div className="text-gray-500">21+ yrs facilities experience</div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <TabNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} accentColor={ACCENT} />

        {/* Tab content */}
        <main className="flex-1 p-6 overflow-auto">
          {activeTab === 'leads' && (
            <LeadsTable
              entity="ironhouse"
              title="Leads"
              accentColor={ACCENT}
              defaultProposalLead="Nana Badu"
            />
          )}
          {activeTab === 'subcontractors' && (
            <SubcontractorsTable entity="ironhouse" />
          )}
          {activeTab === 'active_bids' && (
            <LeadsTable
              entity="ironhouse"
              presetStatuses={['active_bid']}
              title="Active Bids"
              accentColor={ACCENT}
              defaultProposalLead="Nana Badu"
            />
          )}
          {activeTab === 'awards' && (
            <LeadsTable
              entity="ironhouse"
              presetStatuses={['awarded']}
              title="Awards"
              accentColor={ACCENT}
              defaultProposalLead="Nana Badu"
            />
          )}
          {activeTab === 'pricing' && (
            <GovPricingCalculator />
          )}
          {activeTab === 'contacts' && (
            <EntityContactsTab entity="ironhouse" accentColor={ACCENT} />
          )}
        </main>
      </div>
    </div>
  )
}
