'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TabNav } from '@/components/tracker/TabNav'
import { LeadsTable } from '@/components/tracker/LeadsTable'
import { SubcontractorsTable } from '@/components/tracker/SubcontractorsTable'
import { CommercialLeadsTable } from '@/components/tracker/CommercialLeadsTable'
import { GovPricingCalculator } from '@/components/pricing/GovPricingCalculator'
import { CommercialPricingCalculator } from '@/components/pricing/CommercialPricingCalculator'
import { EntityContactsTab } from '@/components/contacts/EntityContactsTab'
import { EntityNaicsBar } from '@/components/layout/EntityNaicsBar'
import { Activity } from 'lucide-react'

const ACCENT = '#06A59A'

const GOV_TABS = [
  { id: 'leads',          label: 'Leads' },
  { id: 'subcontractors', label: 'Subcontractors' },
  { id: 'active_bids',    label: 'Active Bids' },
  { id: 'awards',         label: 'Awards' },
  { id: 'pricing',        label: 'Pricing Calculator' },
  { id: 'contacts',       label: 'Contacts' },
]

const COMMERCIAL_TABS = [
  { id: 'prospects',       label: 'Prospects' },
  { id: 'active_outreach', label: 'Active Outreach' },
  { id: 'contracts',       label: 'Contracts' },
  { id: 'pricing',         label: 'Pricing Calculator' },
]

export default function VitalXPage() {
  const [section, setSection] = useState<'government' | 'commercial'>('government')
  const [govTab, setGovTab] = useState('leads')
  const [commercialTab, setCommercialTab] = useState('prospects')

  return (
    <div className="flex min-h-screen bg-[#111827]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-0 pt-14 lg:pt-0">
        {/* Page header */}
        <header className="flex items-center gap-4 px-6 py-5 border-b border-[#374151] bg-[#0D2B22] flex-shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: ACCENT + '33' }}
          >
            <Activity size={20} style={{ color: ACCENT }} />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">VitalX</h1>
            <p className="text-gray-400 text-sm">HIPAA-compliant healthcare logistics · Medical courier · DMV region</p>
          </div>
          <div className="ml-auto">
            <div className="text-xs text-right">
              <div style={{ color: ACCENT }} className="font-semibold">Healthcare Logistics</div>
              <div className="text-gray-500">info@thevitalx.com</div>
            </div>
          </div>
        </header>

        {/* NAICS / PSC codes bar */}
        <EntityNaicsBar entity="vitalx" accentColor={ACCENT} />

        {/* Section switcher */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#374151] bg-[#111827]">
          <button
            onClick={() => setSection('government')}
            className="px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all"
            style={
              section === 'government'
                ? { color: ACCENT, borderBottom: `2px solid ${ACCENT}`, backgroundColor: ACCENT + '11' }
                : { color: '#6B7280', borderBottom: '2px solid transparent' }
            }
          >
            Government
          </button>
          <button
            onClick={() => setSection('commercial')}
            className="px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all"
            style={
              section === 'commercial'
                ? { color: ACCENT, borderBottom: `2px solid ${ACCENT}`, backgroundColor: ACCENT + '11' }
                : { color: '#6B7280', borderBottom: '2px solid transparent' }
            }
          >
            Commercial
          </button>
        </div>

        {section === 'government' && (
          <>
            <TabNav tabs={GOV_TABS} activeTab={govTab} onChange={setGovTab} accentColor={ACCENT} />
            <main className="flex-1 p-6 overflow-auto">
              {govTab === 'leads' && (
                <LeadsTable entity="vitalx" title="Leads" accentColor={ACCENT} />
              )}
              {govTab === 'subcontractors' && (
                <SubcontractorsTable entity="vitalx" />
              )}
              {govTab === 'active_bids' && (
                <LeadsTable
                  entity="vitalx"
                  presetStatuses={['active_bid']}
                  title="Active Bids"
                  accentColor={ACCENT}
                />
              )}
              {govTab === 'awards' && (
                <LeadsTable
                  entity="vitalx"
                  presetStatuses={['awarded']}
                  title="Awards"
                  accentColor={ACCENT}
                />
              )}
              {govTab === 'pricing' && (
                <GovPricingCalculator />
              )}
              {govTab === 'contacts' && (
                <EntityContactsTab entity="vitalx" accentColor={ACCENT} />
              )}
            </main>
          </>
        )}

        {section === 'commercial' && (
          <>
            <TabNav tabs={COMMERCIAL_TABS} activeTab={commercialTab} onChange={setCommercialTab} accentColor={ACCENT} />
            <main className="flex-1 p-6 overflow-auto">
              {commercialTab === 'prospects' && (
                <CommercialLeadsTable
                  presetStatuses={['prospect']}
                  title="Prospects"
                  accentColor={ACCENT}
                />
              )}
              {commercialTab === 'active_outreach' && (
                <CommercialLeadsTable
                  presetStatuses={['outreach', 'proposal', 'negotiation']}
                  title="Active Outreach"
                  accentColor={ACCENT}
                />
              )}
              {commercialTab === 'contracts' && (
                <CommercialLeadsTable
                  presetStatuses={['contract']}
                  title="Contracts"
                  accentColor={ACCENT}
                />
              )}
              {commercialTab === 'pricing' && (
                <CommercialPricingCalculator />
              )}
            </main>
          </>
        )}
      </div>
    </div>
  )
}
