import { Link } from 'react-router-dom'
import {
  Zap, GitBranch, Cpu, Shield, Rocket, Activity,
  ArrowRight, CheckCircle2, ChevronRight,
} from 'lucide-react'
import Button from '../components/ui/Button'

const STEPS = [
  {
    icon: GitBranch,
    title: 'Repository Analysis',
    desc: 'AI scans your project structure, dependencies, frameworks, and configuration.',
    live: true,
  },
  {
    icon: Cpu,
    title: 'AWS Architecture Design',
    desc: 'Generates a tailored AWS service architecture with rationale and connection map.',
    live: true,
  },
  {
    icon: Shield,
    title: 'Security Review',
    desc: 'Identifies potential security issues and misconfigurations before deployment.',
    live: false,
  },
  {
    icon: Rocket,
    title: 'Deployment Plan',
    desc: 'Creates step-by-step infrastructure-as-code and deployment workflow.',
    live: false,
  },
  {
    icon: Activity,
    title: 'CloudWatch Monitoring',
    desc: 'Runtime monitoring, AI-powered alerting and diagnosis.',
    live: false,
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-900 text-white">
      {/* Nav */}
      <header className="border-b border-surface-700">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-white">DeployMate Studio</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-600/10 border border-brand-600/25 text-brand-400 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          AI-powered AWS deployment workspace
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6">
          Deploy your code to AWS,{' '}
          <span className="gradient-text">without the cloud complexity.</span>
        </h1>

        <p className="text-lg text-surface-200 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI analyzes your GitHub repository, designs your AWS architecture,
          and prepares your deployment workflow — so you can focus on building.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/register">
            <Button size="lg" className="min-w-[160px]">
              Get Started
              <ArrowRight size={17} />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">
              Analyze a Repository
            </Button>
          </Link>
        </div>

        {/* Fake terminal preview */}
        <div className="mt-16 max-w-2xl mx-auto code-block text-left text-xs leading-relaxed animate-fade-in">
          <div className="flex gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <p className="text-surface-300">$ <span className="text-brand-400">deploymate analyze</span> github.com/user/ecommerce</p>
          <p className="text-surface-200 mt-1">✓ Cloning repository...</p>
          <p className="text-surface-200">✓ Detecting: Node.js · Express · PostgreSQL · Redis</p>
          <p className="text-surface-200">✓ Analyzing 847 files across 23 directories</p>
          <p className="text-brand-400 mt-1">→ Designing AWS architecture for ap-south-1...</p>
          <p className="text-green-400 mt-1">✓ Architecture ready: EC2 · RDS · ElastiCache · ALB · CloudFront</p>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">From repository to AWS in minutes</h2>
          <p className="text-surface-200">An end-to-end deployment pipeline powered by AI.</p>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-brand-600 via-brand-600/40 to-transparent hidden sm:block" />

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-5 card hover:border-surface-500 transition-colors duration-150">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                  ${step.live ? 'bg-brand-600/20 border border-brand-600/30' : 'bg-surface-700 border border-surface-500'}`}>
                  <step.icon size={20} className={step.live ? 'text-brand-400' : 'text-surface-300'} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{step.title}</h3>
                    {step.live
                      ? <span className="badge bg-brand-600/15 text-brand-400 text-[10px]">
                          <CheckCircle2 size={10} /> Live
                        </span>
                      : <span className="badge bg-surface-600 text-surface-300 text-[10px]">Coming soon</span>
                    }
                  </div>
                  <p className="text-sm text-surface-200">{step.desc}</p>
                </div>
                <ChevronRight size={16} className="text-surface-400 mt-1 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-700 py-8 text-center text-sm text-surface-300">
        <p>© 2026 DeployMate Studio · Built by Omkar Gaikwad</p>
      </footer>
    </div>
  )
}
