import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'

interface AccessDeniedProps {
  resource?: string
  message?: string
}

export function AccessDenied({
  resource: _resource = 'this resource',
  message = "You don't have permission to access this resource.",
}: AccessDeniedProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Shield size={48} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-400 mb-8 max-w-md">{message}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-[#111827] rounded-lg font-medium hover:bg-[#E8C547] transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
