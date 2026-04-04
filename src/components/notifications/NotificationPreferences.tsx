'use client'

import { useState, useEffect } from 'react'
import { Save, AlertCircle } from 'lucide-react'
import { NotificationPreference } from '@/lib/types'

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications/preferences')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data)
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
      setSaveStatus('error')
      setSaveMessage('Failed to load preferences')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!preferences) return

    try {
      setIsSaving(true)
      setSaveStatus('saving')

      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (response.ok) {
        setSaveStatus('success')
        setSaveMessage('Preferences saved successfully')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
        setSaveMessage('Failed to save preferences')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      setSaveStatus('error')
      setSaveMessage('An error occurred while saving')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400">Loading preferences...</div>
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-400 flex items-center gap-2">
          <AlertCircle size={16} />
          Failed to load preferences
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#111827] rounded-lg border border-[#374151]">
      <h2 className="text-xl font-bold text-white mb-6">Notification Preferences</h2>

      <div className="space-y-6">
        {/* Deadline Reminders */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="deadline_reminders"
              checked={preferences.deadline_reminders}
              onChange={(e) =>
                setPreferences({ ...preferences, deadline_reminders: e.target.checked })
              }
              className="rounded border-gray-400 text-blue-600"
            />
            <label htmlFor="deadline_reminders" className="text-white font-medium">
              Deadline Reminders
            </label>
          </div>

          {preferences.deadline_reminders && (
            <div className="ml-7 mb-4 p-4 bg-[#1F2937] rounded border border-[#374151]">
              <p className="text-sm text-gray-300 mb-3">Send me reminders:</p>
              <div className="space-y-2">
                {[1, 3, 7, 14].map((day) => (
                  <label key={day} className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={(preferences.deadline_days_before || []).includes(day)}
                      onChange={(e) => {
                        const days = preferences.deadline_days_before || []
                        setPreferences({
                          ...preferences,
                          deadline_days_before: e.target.checked
                            ? [...days, day].sort((a, b) => a - b)
                            : days.filter((d) => d !== day),
                        })
                      }}
                      className="rounded border-gray-400 text-blue-600"
                    />
                    <span className="text-sm">{day} day{day !== 1 ? 's' : ''} before deadline</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* New Leads */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="new_leads"
            checked={preferences.new_leads}
            onChange={(e) => setPreferences({ ...preferences, new_leads: e.target.checked })}
            className="rounded border-gray-400 text-blue-600"
          />
          <label htmlFor="new_leads" className="text-white font-medium">
            New Lead Notifications
          </label>
        </div>

        {/* Status Changes */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="status_changes"
            checked={preferences.status_changes}
            onChange={(e) => setPreferences({ ...preferences, status_changes: e.target.checked })}
            className="rounded border-gray-400 text-blue-600"
          />
          <label htmlFor="status_changes" className="text-white font-medium">
            Lead Status Changes
          </label>
        </div>

        {/* Amendment Alerts */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="amendment_alerts"
            checked={preferences.amendment_alerts}
            onChange={(e) => setPreferences({ ...preferences, amendment_alerts: e.target.checked })}
            className="rounded border-gray-400 text-blue-600"
          />
          <label htmlFor="amendment_alerts" className="text-white font-medium">
            Amendment Alerts
          </label>
        </div>

        {/* Daily Digest */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="daily_digest"
            checked={preferences.daily_digest}
            onChange={(e) => setPreferences({ ...preferences, daily_digest: e.target.checked })}
            className="rounded border-gray-400 text-blue-600"
          />
          <label htmlFor="daily_digest" className="text-white font-medium">
            Daily Digest (7 AM EST)
          </label>
        </div>
      </div>

      {/* Save button */}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded transition-colors"
        >
          <Save size={16} />
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>

        {saveStatus !== 'idle' && (
          <div
            className={`text-sm font-medium ${
              saveStatus === 'success' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {saveMessage}
          </div>
        )}
      </div>
    </div>
  )
}
