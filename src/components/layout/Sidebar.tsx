'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { LayoutDashboard, Shield, Activity, Building2, LogOut, Menu, X, Users, CalendarCheck, BarChart3, Settings, FileText, HardDrive } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const NAV_ITEMS = [
  { href: '/',           label: 'MOG Command',      dot: '#D4AF37', icon: LayoutDashboard },
  { href: '/exousia',    label: 'Exousia Solutions', dot: '#D4AF37', icon: Shield },
  { href: '/vitalx',     label: 'VitalX',            dot: '#06A59A', icon: Activity },
  { href: '/ironhouse',  label: 'IronHouse',         dot: '#B45309', icon: Building2 },
  { href: '/proposals',  label: 'Proposals',         dot: '#D4AF37', icon: FileText },
  { href: '/contacts',   label: 'Contacts',          dot: '#6B7280', icon: Users },
  { href: '/compliance', label: 'Compliance',        dot: '#6B7280', icon: CalendarCheck },
  { href: '/analytics',  label: 'Analytics',         dot: '#6B7280', icon: BarChart3 },
  { href: '/settings/drive', label: 'Drive Settings',   dot: '#4285F4', icon: HardDrive },
]

const ADMIN_NAV_ITEMS = [
  { href: '/admin',                label: 'Admin',         dot: '#EF4444', icon: Settings },
  { href: '/admin/feed-health',    label: 'Feed Health',   dot: '#10B981', icon: Activity },
  { href: '/admin/entity-drives',  label: 'Entity Drives', dot: '#6366F1', icon: HardDrive },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAdmin } = useAuth()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = isAdmin() ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#1F2937] border border-[#374151] text-white"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-[#1F2937] border-r border-[#374151] flex flex-col flex-shrink-0
          transform transition-transform duration-200 lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="h-16 px-5 border-b border-[#374151] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded bg-[#D4AF37] flex items-center justify-center flex-shrink-0">
              <span className="text-[#111827] font-black text-sm leading-none">M</span>
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">Mighty Oak Group</div>
              <div className="text-[#D4AF37] text-[10px] tracking-wider uppercase">Command Center</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white flex-shrink-0"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, dot, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${isActive(href)
                  ? 'bg-[#374151] text-white font-medium'
                  : 'text-gray-400 hover:bg-[#2D3748] hover:text-white'}
              `}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: isActive(href) ? dot : '#4B5563' }}
              />
              <Icon size={15} className="flex-shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-[#374151] flex-shrink-0">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-[#2D3748] hover:text-white transition-colors"
          >
            <LogOut size={15} className="flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
