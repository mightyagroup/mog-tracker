'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Check, Trash2, Settings } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Notification } from '@/lib/types'

interface NotificationPanelProps {
  notifications: Notification[]
  isLoading: boolean
  onClose: () => void
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onMarkAllAsRead: () => void
}

const NOTIFICATION_ICONS: Record<string, string> = {
  deadline_reminder: '⏰',
  new_lead: '✨',
  status_change: '🔄',
  amendment_detected: '📝',
  daily_digest: '📊',
  system: 'ℹ️',
}

export function NotificationPanel({
  notifications,
  isLoading,
  onClose,
  onMarkAsRead,
  onDelete,
  onMarkAllAsRead,
}: NotificationPanelProps) {
  const router = useRouter()

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      onMarkAsRead(notification.id)
    }

    // Navigate to the linked item
    if (notification.link) {
      router.push(notification.link)
      onClose()
    }
  }

  // Group notifications by date
  const groupedNotifications: Record<string, Notification[]> = {}
  notifications.forEach((notif) => {
    const date = new Date(notif.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    if (!groupedNotifications[date]) {
      groupedNotifications[date] = []
    }
    groupedNotifications[date].push(notif)
  })

  const sortedDates = Object.keys(groupedNotifications).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime()
  })

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#1F2937] border-l border-[#374151] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#374151]">
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action buttons */}
        {notifications.some((n) => !n.is_read) && (
          <div className="px-4 py-3 bg-[#111827] border-b border-[#374151] flex items-center gap-2">
            <button
              onClick={onMarkAllAsRead}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-300 bg-[#2D3748] hover:bg-[#3D4758] rounded transition-colors"
            >
              <Check size={14} />
              Mark all as read
            </button>
            <Link
              href="/settings/notifications"
              className="p-2 text-gray-400 hover:text-white transition-colors hover:bg-[#2D3748] rounded"
              onClick={onClose}
              aria-label="Notification settings"
            >
              <Settings size={16} />
            </Link>
          </div>
        )}

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <span>Loading...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <div className="text-sm">No notifications yet</div>
            </div>
          ) : (
            <div className="divide-y divide-[#374151]">
              {sortedDates.map((date) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="sticky top-0 px-4 py-2 bg-[#111827] border-b border-[#374151]">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{date}</p>
                  </div>

                  {/* Notifications for this date */}
                  {groupedNotifications[date].map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-[#2D3748] cursor-pointer transition-colors ${
                        notification.is_read ? 'bg-[#1F2937] hover:bg-[#2D3748]' : 'bg-[#253545] hover:bg-[#2D3748]'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="text-lg flex-shrink-0 mt-1">
                          {NOTIFICATION_ICONS[notification.notification_type] || '📌'}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              notification.is_read ? 'text-gray-300' : 'text-white'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>

                        {/* Read indicator and delete */}
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(notification.id)
                            }}
                            className="p-1 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            aria-label="Delete notification"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
