import { Link } from 'react-router-dom'
import {
  Zap, GitBranch, Cpu, Shield, Rocket, Activity,
  ArrowRight, CheckCircle2, ChevronRight, Terminal, Sparkles
} from 'lucide-react'
import Button from '../components/ui/Button'

const STEPS = [
  {
    icon: GitBranch,
    title: 'Repository Analysis',
    desc: 'AI scans your project structure, dependencies, frameworks, and configuration using LangGraph multi-agent loops.',
    live: true,
  },
  {
    icon: Cpu,
    title: 'AWS Architecture Design',
    desc: 'Generates a tailored AWS service architecture with schema-validated Pydantic models and connection topology.',
    live: true,
  },
  {
    icon: Shield,
    title: 'Security Review',
    desc: 'Identifies potential security issues, misconfigurations, and least-privilege policies prior to provisioning.',
    live: false,
  },
  {
    icon: Rocket,
    title: 'Deployment Plan',
    desc: 'Creates step-by-step infrastructure-as-code and one-click cloud deployment workflow.',
    live: false,
  },
  {
    icon: Activity,
    title: 'CloudWatch Monitoring',
    desc: 'Runtime health monitoring, telemetry alerts, and automated diagnostic traces.',
    live: false,
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-900 text-white selection:bg-brand-500/30 selection:text-brand-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-500/10 blur-[130px] rounded-full" />
      </div>

      {/* Nav */}
      <header className="relative border-b border-surface-700/80 bg-surface-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 via-indigo-600 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight">DeployMate Studio</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/20">
                v2.0
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">
                Get Started
                <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/25 text-brand-300 text-xs font-medium mb-8 backdrop-blur-md shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Local Ollama + Gemini Fallback • LangGraph Orchestration</span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6 max-w-4xl mx-auto">
          Deploy your code to AWS,{' '}
          <span className="gradient-text">without cloud complexity.</span>
        </h1>

        <p className="text-lg sm:text-xl text-surface-200 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          AI inspects your GitHub repository, architects optimal AWS services, and designs deployment workflows — so you can ship with confidence.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/register">
            <Button size="lg" className="min-w-[170px]">
              Start Free
              <ArrowRight size={17} />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="min-w-[170px]">
              <Sparkles size={16} />
              Analyze Repository
            </Button>
          </Link>
        </div>

        {/* Modern terminal preview */}
        <div className="mt-16 max-w-2xl mx-auto code-block text-left text-xs leading-relaxed animate-fade-in border border-surface-600/90 bg-surface-900/90 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-700/60">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/70" />
              <span className="w-3 h-3 rounded-full bg-amber-500/70" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
            </div>
            <div className="flex items-center gap-1.5 text-surface-300 text-[11px] font-sans">
              <Terminal size={12} />
              <span>deploymate-cli v2.0</span>
            </div>
          </div>
          <p className="text-surface-300">$ <span className="text-brand-300 font-semibold">deploymate analyze</span> https://github.com/org/saas-app</p>
          <p className="text-surface-200 mt-2">✓ Discovered repository (FastAPI • React • PostgreSQL • Redis)</p>
          <p className="text-surface-200">✓ Running RepoAgent StateGraph: 14 key files inspected</p>
          <p className="text-brand-400 mt-1.5">⚡ Designing AWS Architecture Plan (LiteLLM Router → Ollama qwen2.5-coder:7b)...</p>
          <p className="text-emerald-400 mt-1.5">✓ Architecture Plan Ready: ECS Fargate • RDS Postgres • ElastiCache • ALB • CloudFront</p>
        </div>
      </section>

      {/* Steps */}
      <section className="relative max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">From repository to AWS in minutes</h2>
          <p className="text-surface-200 text-base max-w-lg mx-auto">An end-to-end intelligent cloud pipeline powered by collaborative multi-agent orchestration.</p>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-brand-500 via-brand-500/30 to-transparent hidden sm:block" />

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div 
                key={i} 
                className="flex items-start gap-5 card bg-surface-800/80 hover:bg-surface-800 hover:border-surface-500/80 transition-all duration-200 group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105
                  ${step.live 
                    ? 'bg-brand-500/15 border border-brand-500/30 shadow-inner' 
                    : 'bg-surface-700/60 border border-surface-600'}`}>
                  <step.icon size={20} className={step.live ? 'text-brand-300' : 'text-surface-300'} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <h3 className="font-semibold text-white text-base">{step.title}</h3>
                    {step.live
                      ? <span className="badge bg-emerald-500/15 text-emerald-300 border-emerald-500/25 text-[10px]">
                          <CheckCircle2 size={10} /> Active
                        </span>
                      : <span className="badge bg-surface-700 text-surface-300 border-surface-600 text-[10px]">Coming soon</span>
                    }
                  </div>
                  <p className="text-sm text-surface-200 leading-relaxed">{step.desc}</p>
                </div>
                <ChevronRight size={18} className="text-surface-400 group-hover:text-brand-300 group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-700/80 py-8 text-center text-sm text-surface-300">
        <p>© 2026 DeployMate Studio • Built by Omkar Gaikwad</p>
      </footer>
    </div>
  )
}
