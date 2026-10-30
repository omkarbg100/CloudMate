import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  GitBranch, Globe, Cpu, Rocket, Trash2, ExternalLink,
  CheckCircle2, Loader2, AlertCircle, RefreshCw, Sparkles,
} from 'lucide-react'
import api from '../services/api'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import { PageSpinner } from '../components/ui/Skeleton'
import ErrorBox from '../components/ui/ErrorBox'
import ArchitectureDiagram from '../components/architecture/ArchitectureDiagram'
import ArchitecturePanel from '../components/architecture/ArchitecturePanel'
import RepositoryAnalysisView from '../components/analysis/RepositoryAnalysisView'

// ─── Workflow Step Indicator ──────────────────────────────────────────────────
function WorkflowStep({ number, label, done, active }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm
        ${done   ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-brand-500/25' : ''}
        ${active ? 'bg-surface-700 text-brand-300 border-2 border-brand-400 ring-4 ring-brand-500/10' : ''}
        ${!done && !active ? 'bg-surface-700/80 text-surface-300 border border-surface-600' : ''}
      `}>
        {done ? <CheckCircle2 size={14} /> : number}
      </div>
      <span className={`text-sm font-semibold tracking-tight ${done || active ? 'text-white' : 'text-surface-300'}`}>
        {label}
      </span>
    </div>
  )
}

// ─── Loading Steps Animation ──────────────────────────────────────────────────
function LoadingSteps({ steps, label }) {
  return (
    <div className="space-y-4 py-8 text-center bg-surface-800/40 rounded-xl border border-surface-700/50">
      <div className="flex justify-center mb-3">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center shadow-lg shadow-brand-500/10">
          <Loader2 size={24} className="text-brand-400 animate-spin" />
        </div>
      </div>
      <p className="font-semibold text-white text-base">{label}</p>
      <div className="space-y-2 max-w-xs mx-auto">
        {steps.map((step, i) => (
          <p key={i} className="text-xs text-surface-200 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            {step}
          </p>
        ))}
      </div>
    </div>
  )
}

// ─── Analysis Section ─────────────────────────────────────────────────────────
function AnalysisSection({ analysis, onAnalyze, isAnalyzing }) {
  const hasAnalysis = !!analysis?.summary

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white text-base flex items-center gap-2.5">
          <GitBranch size={18} className="text-brand-400" />
          Repository Analysis
        </h2>
        {hasAnalysis && (
          <Button variant="secondary" size="sm" onClick={onAnalyze} loading={isAnalyzing}>
            <RefreshCw size={13} />
            Re-analyze
          </Button>
        )}
      </div>

      {isAnalyzing ? (
        <LoadingSteps
          label="Running RepoAgent LangGraph..."
          steps={[
            'Cloning repository payload',
            'Discovering structure & project type',
            'Iterative agent think & act cycles',
            'Extracting key architectural modules',
            'Compiling comprehensive summary',
          ]}
        />
      ) : hasAnalysis ? (
        <RepositoryAnalysisView summary={analysis.summary} />
      ) : (
        <div className="text-center py-10 space-y-4 bg-surface-700/20 rounded-xl border border-surface-700/50">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto text-brand-400">
            <Sparkles size={22} />
          </div>
          <p className="text-surface-200 text-sm max-w-sm mx-auto">
            Analyze this repository with the LangGraph RepoAgent to parse framework, dependencies, and entry points.
          </p>
          <Button onClick={onAnalyze} loading={isAnalyzing}>
            <Sparkles size={15} />
            Analyze Repository
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Architecture Section ─────────────────────────────────────────────────────
function ArchitectureSection({ project, analysis, onGenerate, isGenerating }) {
  const [requirements, setRequirements] = useState(project?.requirements || '')
  const [region] = useState(project?.region || 'ap-south-1')
  const [showForm, setShowForm] = useState(false)
  const hasArch = !!analysis?.architecture

  if (!analysis?.summary) {
    return (
      <div className="card opacity-60">
        <h2 className="font-semibold text-white flex items-center gap-2 mb-2">
          <Cpu size={17} className="text-surface-300" />
          AWS Architecture
        </h2>
        <p className="text-sm text-surface-300">Analyze the repository first to unlock architecture generation.</p>
      </div>
    )
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white text-base flex items-center gap-2.5">
          <Cpu size={18} className="text-brand-400" />
          AWS Architecture Plan
        </h2>
        {hasArch && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(!showForm)}>
            <Sparkles size={13} />
            {showForm ? 'Cancel' : 'Regenerate'}
          </Button>
        )}
      </div>

      {isGenerating ? (
        <LoadingSteps
          label="Designing AWS Architecture with LiteLLM..."
          steps={[
            'Calling Primary LLM (Ollama / Gemini Fallback)',
            'Pydantic schema validation',
            'Mapping connection topologies & security',
            'Compiling architecture design',
          ]}
        />
      ) : (
        <>
          {(!hasArch || showForm) && (
            <div className="space-y-4 bg-surface-700/40 border border-surface-600/70 rounded-xl p-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-surface-200">Deployment & Scaling Requirements</label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="e.g. Scalable production workload with 10k concurrent users, high availability, PostgreSQL database, and Redis caching..."
                  rows={3}
                  className="input-base text-xs resize-none"
                />
              </div>
              <Button onClick={() => onGenerate({ requirements, region })} loading={isGenerating}>
                <Sparkles size={15} />
                Generate Architecture
              </Button>
            </div>
          )}

          {hasArch && !showForm && (
            <div className="space-y-5">
              <ArchitectureDiagram architecture={analysis.architecture} />
              <ArchitecturePanel architecture={analysis.architecture} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Deployment Section ───────────────────────────────────────────────────────
function DeploymentSection({ project }) {
  const canDeploy = ['architecture_generated', 'deployment_ready'].includes(project?.status)

  return (
    <div className={`card space-y-3 ${!canDeploy ? 'opacity-60' : ''}`}>
      <h2 className="font-semibold text-white text-base flex items-center gap-2.5">
        <Rocket size={18} className={canDeploy ? 'text-brand-400' : 'text-surface-300'} />
        Cloud Deployment
      </h2>
      <div className="bg-surface-700/30 border border-surface-600/50 rounded-xl p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-surface-700 border border-surface-600 flex items-center justify-center mx-auto text-surface-300 shadow-inner">
          <Rocket size={20} />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">
            {canDeploy ? 'Your architecture plan is verified and ready for provisioning.' : 'Generate an architecture plan to proceed.'}
          </p>
          <p className="text-xs text-surface-300 mt-1">
            Automated Terraform / CDK deployment is <span className="text-brand-400 font-semibold">in development</span>.
          </p>
        </div>
        {canDeploy && (
          <Button variant="secondary" size="sm" disabled>
            <Rocket size={13} />
            Deploy to AWS
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-surface-600 text-surface-200">Coming Soon</span>
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const {
    data: projectData,
    isLoading: projectLoading,
    isError: projectError,
    error: projectErr,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.projects.get(id),
  })

  const {
    data: analysisData,
    isLoading: analysisLoading,
    refetch: refetchAnalysis,
  } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => api.projects.getAnalysis(id),
    retry: false,
    enabled: !!projectData,
  })

  const analyzeMutation = useMutation({
    mutationFn: () => api.projects.analyze(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] })
      qc.invalidateQueries({ queryKey: ['analysis', id] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const archMutation = useMutation({
    mutationFn: (data) => api.projects.generateArchitecture(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] })
      qc.invalidateQueries({ queryKey: ['analysis', id] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.projects.delete(id),
    onSuccess: () => navigate('/projects'),
  })

  const project = projectData?.data?.project
  const analysis = analysisData?.data?.analysis

  const workflowStep = (() => {
    if (!project) return 0
    const s = project.status
    if (['architecture_generated', 'deployment_ready', 'deployed'].includes(s)) return 3
    if (['analyzed'].includes(s)) return 2
    return 1
  })()

  if (projectLoading) return <PageSpinner />
  if (projectError) return <ErrorBox message={projectErr?.response?.data?.error?.message} onRetry={refetchProject} />
  if (!project) return null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-surface-300 mb-2">
            <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <span>/</span>
            <Link to="/projects" className="hover:text-white transition-colors">Projects</Link>
            <span>/</span>
            <span className="text-white font-medium">{project.name}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{project.name}</h1>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <StatusBadge status={project.status} />
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-surface-200 hover:text-brand-300 transition-colors font-mono"
            >
              <ExternalLink size={12} />
              {project.repoName || project.repoUrl}
            </a>
            <span className="flex items-center gap-1.5 text-xs text-surface-300 font-mono">
              <Globe size={12} />
              {project.region}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-surface-300 font-mono">
              <GitBranch size={12} />
              {project.branch}
            </span>
          </div>
        </div>

        <Button
          variant="danger"
          size="sm"
          loading={deleteMutation.isPending}
          onClick={() => {
            if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
              deleteMutation.mutate()
            }
          }}
        >
          <Trash2 size={13} />
          Delete Project
        </Button>
      </div>

      {/* Workflow indicator */}
      <div className="card flex items-center justify-between gap-4 flex-wrap bg-surface-800/90">
        <WorkflowStep number={1} label="Repository" done={workflowStep >= 1} active={workflowStep === 0} />
        <div className="flex-1 h-px bg-surface-700 hidden md:block" />
        <WorkflowStep number={2} label="Analysis" done={workflowStep >= 2} active={workflowStep === 1} />
        <div className="flex-1 h-px bg-surface-700 hidden md:block" />
        <WorkflowStep number={3} label="Architecture" done={workflowStep >= 3} active={workflowStep === 2} />
        <div className="flex-1 h-px bg-surface-700 hidden md:block" />
        <WorkflowStep number={4} label="Deployment" done={false} active={workflowStep === 3} />
      </div>

      {/* Error from mutations */}
      {(analyzeMutation.isError || archMutation.isError) && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-300">Operation failed</p>
            <p className="text-xs text-rose-200 mt-0.5">
              {analyzeMutation.error?.response?.data?.error?.message ||
                archMutation.error?.response?.data?.error?.message ||
                'An unexpected error occurred. Please try again.'}
            </p>
          </div>
        </div>
      )}

      {/* Sections */}
      <AnalysisSection
        project={project}
        analysis={analysis}
        onAnalyze={() => analyzeMutation.mutate()}
        isAnalyzing={analyzeMutation.isPending || project.status === 'analyzing'}
      />

      <ArchitectureSection
        project={project}
        analysis={analysis}
        onGenerate={(data) => archMutation.mutate(data)}
        isGenerating={archMutation.isPending}
      />

      <DeploymentSection project={project} />
    </div>
  )
}
