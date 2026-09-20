import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { User, Shield, Server, CheckCircle2, AlertCircle } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [statusMessage, setStatusMessage] = useState(null)
  const [defaultRegion, setDefaultRegion] = useState('ap-south-1')

  const handlePasswordUpdate = (e) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      setStatusMessage({ type: 'error', text: 'New password must be at least 8 characters long.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    // Simulation / future API integration
    setStatusMessage({ type: 'success', text: 'Password settings updated successfully.' })
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Account & Workspace Settings</h1>
        <p className="text-sm text-surface-300 mt-1">
          Manage your personal profile, security preferences, and cloud deployment defaults.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/40 border-red-500/30 text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* User Profile Card */}
      <div className="bg-surface-800 border border-surface-600 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5 border-b border-surface-600 pb-4">
          <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
            <User size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Profile Information</h2>
            <p className="text-xs text-surface-300">Basic identification details for this account</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={user?.name || ''}
            disabled
            className="bg-surface-900/50 cursor-not-allowed text-surface-300"
          />
          <Input
            label="Email Address"
            value={user?.email || ''}
            disabled
            className="bg-surface-900/50 cursor-not-allowed text-surface-300"
          />
        </div>
      </div>

      {/* Cloud & Region Preferences */}
      <div className="bg-surface-800 border border-surface-600 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5 border-b border-surface-600 pb-4">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
            <Server size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Cloud Environment Defaults</h2>
            <p className="text-xs text-surface-300">Default AWS configuration for newly created architectures</p>
          </div>
        </div>

        <div className="max-w-md space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-200 mb-1.5">
              Default Target Region
            </label>
            <select
              value={defaultRegion}
              onChange={(e) => {
                setDefaultRegion(e.target.value)
                setStatusMessage({ type: 'success', text: 'Default region updated.' })
              }}
              className="w-full bg-surface-900 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="ap-south-1">Asia Pacific (Mumbai) — ap-south-1</option>
              <option value="us-east-1">US East (N. Virginia) — us-east-1</option>
              <option value="us-west-2">US West (Oregon) — us-west-2</option>
              <option value="eu-west-1">Europe (Ireland) — eu-west-1</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore) — ap-southeast-1</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security & Password */}
      <div className="bg-surface-800 border border-surface-600 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5 border-b border-surface-600 pb-4">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Security & Password</h2>
            <p className="text-xs text-surface-300">Update your account authentication credentials</p>
          </div>
        </div>

        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
          <Input
            type="password"
            label="Current Password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            type="password"
            label="New Password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            label="Confirm New Password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <div className="pt-2">
            <Button type="submit" variant="primary" disabled={!newPassword || !confirmPassword}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
