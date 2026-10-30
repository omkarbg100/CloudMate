import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FolderGit2, Cpu, Rocket, Plus, ArrowRight, Bot, Sparkles, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import { CardSkeleton } from '../components/ui/Skeleton'
import ErrorBox from '../components/ui/ErrorBox'

function StatCard({ icon: Icon, label, value, sub, highlight = false }) {
  return (
    <div className={`card flex items-center gap-4 hover:-translate-y-0.5 hover:border-surface-500/90 ${
      highlight ? 'bg-gradient-to-br from-brand-600/10 via-surface-800 to-surface-800 border-brand-500/30' : ''
    }`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
        highlight 
          ? 'bg-brand-500/20 border border-brand-500/30 text-brand-300' 
          : 'bg-surface-700/80 border border-surface-600 text-surface-200'
      }`}>
        <Icon size={22} className={highlight ? 'text-brand-300' : 'text-brand-400'} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-white tracking-tight">{value}</p>
        <p className="text-sm text-surface-200 font-medium">{label}</p>
        {sub && <p className="text-xs text-surface-300 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ProjectRow({ project }) {
  return (
    <Link
      to={`/projects/${project._id}`}
      className="flex items-center gap-4 px-5 py-4 border-b border-surface-700/50 last:border-0 hover:bg-surface-700/30 transition-all duration-150 group"
    >
      <div className="w-10 h-10 rounded-xl bg-surface-700/80 border border-surface-600 flex items-center justify-center shrink-0 group-hover:border-brand-500/40 transition-colors">
        <FolderGit2 size={18} className="text-surface-200 group-hover:text-brand-300 transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate group-hover:text-brand-300 transition-colors">{project.name}</p>
        <p className="text-xs text-surface-300 font-mono truncate">{project.repoName || project.repoUrl}</p>
      </div>
      <StatusBadge status={project.status} />
      <ArrowRight size={15} className="text-surface-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
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
      {/* Header with Greeting & AI status pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Good {getTimeOfDay()}, {user?.name?.split(' ')[0] || 'Engineer'} 👋
            </h1>
          </div>
          <p className="text-surface-200 text-sm mt-1">Here is an overview of your AI cloud deployment workspaces.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-800 border border-surface-600 text-xs text-surface-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LiteLLM Engine: <strong className="text-white font-medium">Ollama + Gemini</strong></span>
          </div>
          <Link to="/projects/new">
            <Button size="sm">
              <Plus size={15} />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard 
          icon={FolderGit2} 
          label="Total Projects" 
          value={isLoading ? '—' : stats.total} 
          highlight={true}
        />
        <StatCard 
          icon={Cpu} 
          label="Repositories Analyzed" 
          value={isLoading ? '—' : stats.analyzed} 
        />
        <StatCard 
          icon={Rocket} 
          label="Cloud Deployments" 
          value="Ready" 
          sub="Phase 2 Orchestration" 
        />
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-white text-base">Recent Projects</h2>
            <span className="text-xs text-surface-300 font-mono">({projects.length})</span>
          </div>
          <Link to="/projects" className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 font-medium">
            View all
            <ArrowRight size={12} />
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
          <div className="card text-center py-14 space-y-4 border-dashed border-surface-600/80">
            <div className="w-16 h-16 rounded-2xl bg-surface-700/80 border border-surface-600 flex items-center justify-center mx-auto shadow-inner">
              <FolderGit2 size={24} className="text-surface-300" />
            </div>
            <div className="max-w-sm mx-auto">
              <p className="font-semibold text-white text-base">No projects yet</p>
              <p className="text-sm text-surface-200 mt-1">
                Connect your first GitHub repository to start multi-agent analysis and AWS architecture generation.
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
          <div className="card p-0 overflow-hidden divide-y divide-surface-700/40">
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
