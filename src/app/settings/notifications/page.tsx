'use client'

import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'

export default function NotificationsSettingsPage() {
  return (
    <div className="min-h-screen bg-[#111827] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Notification Settings</h1>
          <p className="text-gray-400">Manage how you receive notifications about your bids and leads</p>
        </div>

        <NotificationPreferences />
      </div>
    </div>
  )
}
