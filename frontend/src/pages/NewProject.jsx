import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FolderGit2, ArrowLeft } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import api from '../services/api'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const AWS_REGIONS = [
  { value: 'ap-south-1',     label: 'Asia Pacific (Mumbai)' },
  { value: 'us-east-1',      label: 'US East (N. Virginia)' },
  { value: 'us-west-2',      label: 'US West (Oregon)' },
  { value: 'eu-west-1',      label: 'Europe (Ireland)' },
  { value: 'eu-central-1',   label: 'Europe (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
]

export default function NewProject() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    repoUrl: '',
    branch: 'main',
    region: 'ap-south-1',
    requirements: '',
  })
  const [errors, setErrors] = useState({})

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Project name is required'
    if (!form.repoUrl.trim()) e.repoUrl = 'Repository URL is required'
    else if (!/^https?:\/\/.+/.test(form.repoUrl)) e.repoUrl = 'Must be a valid URL starting with https://'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const mutation = useMutation({
    mutationFn: (data) => api.projects.create(data),
    onSuccess: (res) => {
      navigate(`/projects/${res.data.project._id}`)
    },
  })

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    mutation.mutate(form)
  }

  return (
    <div className="max-w-xl animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-surface-300 mb-6">
        <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-white">New Project</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center">
          <FolderGit2 size={19} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">New Project</h1>
          <p className="text-sm text-surface-200">Connect a GitHub repository to get started.</p>
        </div>
      </div>

      <div className="card space-y-6">
        {mutation.isError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
            {mutation.error?.response?.data?.error?.message || 'Failed to create project. Please try again.'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Project Name"
            type="text"
            placeholder="My E-Commerce App"
            value={form.name}
            onChange={set('name')}
            error={errors.name}
          />

          <Input
            label="GitHub Repository URL"
            type="url"
            placeholder="https://github.com/username/repository"
            value={form.repoUrl}
            onChange={set('repoUrl')}
            error={errors.repoUrl}
          />

          <Input
            label="Branch"
            type="text"
            placeholder="main"
            value={form.branch}
            onChange={set('branch')}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-surface-100">AWS Region</label>
            <select
              value={form.region}
              onChange={set('region')}
              className="input-base"
            >
              {AWS_REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.value} — {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-surface-100">
              Deployment Requirements{' '}
              <span className="text-surface-300 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.requirements}
              onChange={set('requirements')}
              placeholder="e.g. Deploy a scalable production application with zero downtime, support 10k concurrent users..."
              rows={4}
              className="input-base resize-none"
            />
            <p className="text-xs text-surface-300">
              Describe your scalability, performance, or compliance needs. The AI will use this to design your architecture.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={15} />
              Cancel
            </Button>
            <Button
              type="submit"
              size="md"
              loading={mutation.isPending}
              className="flex-1"
            >
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
