import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  GitBranch, Globe, Cpu, Rocket, Trash2, ExternalLink,
  CheckCircle2, Circle, Loader2, AlertCircle, RefreshCw,
  ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react'
import api from '../services/api'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import { PageSpinner, Skeleton } from '../components/ui/Skeleton'
import ErrorBox from '../components/ui/ErrorBox'
import ArchitectureDiagram from '../components/architecture/ArchitectureDiagram'
import ArchitecturePanel from '../components/architecture/ArchitecturePanel'

// ── Workflow step indicator ────────────────────────────────────────────────────
function WorkflowStep({ number, label, done, active }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
        ${done   ? 'bg-brand-600 text-white'         : ''}
        ${active ? 'bg-surface-600 text-white border-2 border-brand-500' : ''}
        ${!done && !active ? 'bg-surface-700 text-surface-300' : ''}
      `}>
        {done ? <CheckCircle2 size={13} /> : number}
      </div>
      <span className={`text-sm font-medium ${done || active ? 'text-white' : 'text-surface-300'}`}>
        {label}
      </span>
    </div>
  )
}

// ── Loading steps animation ───────────────────────────────────────────────────
function LoadingSteps({ steps, label }) {
  return (
    <div className="space-y-3 py-6 text-center">
      <div className="flex justify-center mb-4">
        <Loader2 size={32} className="text-brand-400 animate-spin" />
      </div>
      <p className="font-medium text-white">{label}</p>
      <div className="space-y-2 max-w-xs mx-auto">
        {steps.map((step, i) => (
          <p key={i} className="text-xs text-surface-300 flex items-center justify-center gap-2">
            <span className="w-1 h-1 rounded-full bg-brand-400" />
            {step}
          </p>
        ))}
      </div>
    </div>
  )
}

// ── Analysis section ──────────────────────────────────────────────────────────
function AnalysisSection({ project, analysis, onAnalyze, isAnalyzing }) {
  const [expanded, setExpanded] = useState(false)
  const hasAnalysis = !!analysis?.summary

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <GitBranch size={17} className="text-brand-400" />
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
          label="Analyzing repository..."
          steps={[
            'Cloning repository',
            'Scanning project structure',
            'Understanding dependencies',
            'Identifying entry points',
            'Generating summary',
          ]}
        />
      ) : hasAnalysis ? (
        <div className="space-y-3">
          <div className={`relative overflow-hidden transition-all duration-300 ${!expanded ? 'max-h-48' : 'max-h-none'}`}>
            <pre className="code-block text-surface-200 text-xs whitespace-pre-wrap leading-relaxed">
              {analysis.summary}
            </pre>
            {!expanded && (
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface-800 to-transparent" />
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            {expanded ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Show full analysis</>}
          </button>
        </div>
      ) : (
        <div className="text-center py-8 space-y-4">
          <p className="text-surface-200 text-sm">
            Analyze this repository to understand its structure, dependencies, and entry points.
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

// ── Architecture section ──────────────────────────────────────────────────────
function ArchitectureSection({ project, analysis, onGenerate, isGenerating }) {
  const [requirements, setRequirements] = useState(project?.requirements || '')
  const [region, setRegion] = useState(project?.region || 'ap-south-1')
  const [showForm, setShowForm] = useState(false)
  const hasArch = !!analysis?.architecture

  if (!analysis?.summary) {
    return (
      <div className="card opacity-50">
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
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Cpu size={17} className="text-brand-400" />
          AWS Architecture
        </h2>
        {hasArch && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(!showForm)}>
            <Sparkles size={13} />
            Regenerate
          </Button>
        )}
      </div>

      {isGenerating ? (
        <LoadingSteps
          label="Designing AWS architecture..."
          steps={[
            'Analyzing application requirements',
            'Selecting AWS services',
            'Designing service connections',
            'Generating rationale',
          ]}
        />
      ) : (
        <>
          {(!hasArch || showForm) && (
            <div className="space-y-3 bg-surface-700 rounded-xl p-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-surface-200">Deployment Requirements</label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="e.g. Scalable production app with 10k concurrent users..."
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

// ── Deployment section ────────────────────────────────────────────────────────
function DeploymentSection({ project }) {
  const canDeploy = ['architecture_generated', 'deployment_ready'].includes(project?.status)

  return (
    <div className={`card space-y-3 ${!canDeploy ? 'opacity-50' : ''}`}>
      <h2 className="font-semibold text-white flex items-center gap-2">
        <Rocket size={17} className={canDeploy ? 'text-brand-400' : 'text-surface-300'} />
        Deployment
      </h2>
      <div className="bg-surface-700 rounded-xl p-5 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-surface-600 flex items-center justify-center mx-auto">
          <Rocket size={20} className="text-surface-300" />
        </div>
        <div>
          <p className="font-medium text-white text-sm">
            {canDeploy ? 'Your infrastructure plan is ready.' : 'Generate an architecture to proceed.'}
          </p>
          <p className="text-sm text-surface-300 mt-1">
            AWS deployment automation is <span className="text-brand-400 font-medium">coming soon</span>.
          </p>
        </div>
        {canDeploy && (
          <Button variant="secondary" size="sm" disabled>
            <Rocket size={13} />
            Deploy to AWS
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-surface-600 text-surface-200">Soon</span>
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-surface-300 mb-2">
            <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <span>/</span>
            <Link to="/projects" className="hover:text-white transition-colors">Projects</Link>
            <span>/</span>
            <span className="text-white">{project.name}</span>
          </div>

          <h1 className="text-2xl font-bold text-white">{project.name}</h1>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <StatusBadge status={project.status} />
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-surface-200 hover:text-brand-400 transition-colors"
            >
              <ExternalLink size={11} />
              {project.repoName || project.repoUrl}
            </a>
            <span className="flex items-center gap-1 text-xs text-surface-300">
              <Globe size={11} />
              {project.region}
            </span>
            <span className="flex items-center gap-1 text-xs text-surface-300">
              <GitBranch size={11} />
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
          Delete
        </Button>
      </div>

      {/* Workflow indicator */}
      <div className="card flex items-center gap-6 flex-wrap">
        <WorkflowStep number={1} label="Repository" done={workflowStep >= 1} active={workflowStep === 0} />
        <div className="flex-1 h-px bg-surface-600 hidden sm:block" />
        <WorkflowStep number={2} label="Analysis" done={workflowStep >= 2} active={workflowStep === 1} />
        <div className="flex-1 h-px bg-surface-600 hidden sm:block" />
        <WorkflowStep number={3} label="Architecture" done={workflowStep >= 3} active={workflowStep === 2} />
        <div className="flex-1 h-px bg-surface-600 hidden sm:block" />
        <WorkflowStep number={4} label="Deployment" done={false} active={workflowStep === 3} />
      </div>

      {/* Error from mutations */}
      {(analyzeMutation.isError || archMutation.isError) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Operation failed</p>
            <p className="text-xs text-red-300 mt-0.5">
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
