import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FolderGit2, Cpu, Rocket, Plus, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import { CardSkeleton } from '../components/ui/Skeleton'
import ErrorBox from '../components/ui/ErrorBox'

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-brand-400" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-surface-200">{label}</p>
        {sub && <p className="text-xs text-surface-300 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ProjectRow({ project }) {
  return (
    <Link
      to={`/projects/${project._id}`}
      className="flex items-center gap-4 px-5 py-4 border-b border-surface-600 last:border-0 hover:bg-surface-700/40 transition-colors duration-100 group"
    >
      <div className="w-9 h-9 rounded-lg bg-surface-700 border border-surface-600 flex items-center justify-center shrink-0">
        <FolderGit2 size={16} className="text-surface-200" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm truncate">{project.name}</p>
        <p className="text-xs text-surface-300 font-mono truncate">{project.repoName || project.repoUrl}</p>
      </div>
      <StatusBadge status={project.status} />
      <ArrowRight size={14} className="text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  })

  const projects = data?.data?.projects || []

  const stats = {
    total: projects.length,
    analyzed: projects.filter((p) =>
      ['analyzed', 'architecture_generated', 'deployment_ready', 'deployed'].includes(p.status)
    ).length,
    architectures: projects.filter((p) =>
      ['architecture_generated', 'deployment_ready', 'deployed'].includes(p.status)
    ).length,
  }

  const recentProjects = projects.slice(0, 5)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Good {getTimeOfDay()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-surface-200 text-sm mt-1">Here's an overview of your deployment workspace.</p>
        </div>
        <Link to="/projects/new">
          <Button size="sm">
            <Plus size={15} />
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={FolderGit2} label="Total Projects" value={isLoading ? '—' : stats.total} />
        <StatCard icon={Cpu} label="Repositories Analyzed" value={isLoading ? '—' : stats.analyzed} />
        <StatCard icon={Rocket} label="Deployments" value="—" sub="Coming soon" />
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent Projects</h2>
          <Link to="/projects" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <ErrorBox
            message={error?.response?.data?.error?.message || 'Failed to load projects'}
            onRetry={refetch}
          />
        ) : recentProjects.length === 0 ? (
          <div className="card text-center py-12 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-700 border border-surface-600 flex items-center justify-center mx-auto">
              <FolderGit2 size={22} className="text-surface-300" />
            </div>
            <div>
              <p className="font-medium text-white">No projects yet</p>
              <p className="text-sm text-surface-200 mt-1">
                Connect your first GitHub repository to start analyzing your application.
              </p>
            </div>
            <Link to="/projects/new">
              <Button size="sm" className="mt-2">
                <Plus size={14} />
                Create Project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            {recentProjects.map((p) => <ProjectRow key={p._id} project={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
