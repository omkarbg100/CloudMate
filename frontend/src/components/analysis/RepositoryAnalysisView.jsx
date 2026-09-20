import { useState } from 'react'
import {
  Sparkles,
  Layers,
  Cpu,
  Terminal,
  FileCode2,
  Copy,
  Check,
  Code2,
  Server,
  Globe,
  Bot,
  Box,
  KeyRound,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  FileText
} from 'lucide-react'

// Helper to render markdown inline elements (bold, code, links)
function renderInlineMarkdown(text) {
  if (!text) return null

  // Split by inline code `...`
  const codeParts = text.split(/(`[^`]+`)/g)

  return codeParts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      const code = part.slice(1, -1)
      return (
        <code
          key={idx}
          className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-600 border border-surface-500 text-brand-300 mx-0.5"
        >
          {code}
        </code>
      )
    }

    // Process bold **...**
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g)
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**')) {
        return (
          <strong key={`${idx}-${bIdx}`} className="font-semibold text-white">
            {bPart.slice(2, -2)}
          </strong>
        )
      }
      return bPart
    })
  })
}

// ── Section Card Container ───────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, badge, accentColor = 'brand', children }) {
  const colorMap = {
    brand: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  }

  return (
    <div className="bg-surface-700/60 border border-surface-600/80 rounded-xl p-4 sm:p-5 space-y-3.5 transition-all hover:border-surface-500/80">
      <div className="flex items-center justify-between gap-2 border-b border-surface-600/50 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${colorMap[accentColor] || colorMap.brand}`}>
            <Icon size={15} />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-white tracking-wide uppercase">
            {title}
          </h3>
        </div>
        {badge && (
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-surface-600/80 text-surface-200 border border-surface-500/40">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Code Block with Copy ─────────────────────────────────────────────────────
function CodeBlock({ code, language = 'bash' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg bg-surface-900 border border-surface-600/80 overflow-hidden shadow-inner my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-800/80 border-b border-surface-600/50 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="font-mono text-[10px] text-surface-400 uppercase tracking-wider ml-1">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-surface-300 hover:text-white px-2 py-0.5 rounded hover:bg-surface-700 transition-colors"
          title="Copy command"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 font-mono text-xs text-brand-200 overflow-x-auto selection:bg-brand-500/30 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ── Service Card for Architecture ───────────────────────────────────────────
function ServiceCard({ name, details, port }) {
  const getIcon = (title) => {
    const t = title.toLowerCase()
    if (t.includes('client') || t.includes('front') || t.includes('ui') || t.includes('web')) return Globe
    if (t.includes('ai') || t.includes('fastapi') || t.includes('rag') || t.includes('llm') || t.includes('model')) return Bot
    if (t.includes('server') || t.includes('back') || t.includes('api') || t.includes('node')) return Server
    return Box
  }

  const Icon = getIcon(name)

  return (
    <div className="bg-surface-800/80 border border-surface-600/70 rounded-lg p-3.5 space-y-1.5 hover:border-brand-500/40 transition-all">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-brand-500/15 text-brand-400 flex items-center justify-center">
            <Icon size={13} />
          </div>
          <span className="font-semibold text-xs sm:text-sm text-white">{name}</span>
        </div>
        {port && (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-700 text-brand-300 border border-surface-500/50">
            {port}
          </span>
        )}
      </div>
      <p className="text-xs text-surface-200 leading-relaxed pl-8">
        {renderInlineMarkdown(details)}
      </p>
    </div>
  )
}

// ── Parser for Structured Sections ──────────────────────────────────────────
function parseRepositorySummary(rawText) {
  if (!rawText) return null

  // Normalize line breaks
  const text = rawText.replace(/\r\n/g, '\n').trim()

  const sections = {
    overview: '',
    architecture: { text: '', services: [] },
    techStack: [],
    howToRun: { steps: [], notes: [] },
    keyFiles: [],
  }

  // Section splitting patterns
  // Matches:
  // - What this project does: ...
  // ### What this project does
  // ## What this project does
  const regex = /(?:^|\n)(?:[-*]\s+|\#{1,4}\s+)?(What this project does|Architecture|Tech stack|How to run(?:\s*\(best guess\))?|Key files(?:\s*to read first)?):?/gi

  let matches = []
  let match
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      title: match[1].toLowerCase(),
      index: match.index,
      fullMatch: match[0],
    })
  }

  if (matches.length === 0) {
    // If no explicit section headers found, treat entire text as overview or fallback
    return null
  }

  // Slice content for each found section
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const startIndex = current.index + current.fullMatch.length
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : text.length
    const content = text.slice(startIndex, endIndex).trim()

    if (current.title.includes('what this project does') || current.title.includes('purpose') || current.title.includes('overview')) {
      sections.overview = content
    } else if (current.title.includes('architecture')) {
      parseArchitecture(content, sections.architecture)
    } else if (current.title.includes('tech stack')) {
      sections.techStack = parseTechStack(content)
    } else if (current.title.includes('how to run')) {
      sections.howToRun = parseHowToRun(content)
    } else if (current.title.includes('key files')) {
      sections.keyFiles = parseKeyFiles(content)
    }
  }

  return sections
}

function parseArchitecture(content, archObj) {
  const lines = content.split('\n')
  const generalLines = []
  const services = []

  let currentService = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Detect service like: - **Client**: ... or - Client: ...
    const serviceMatch = trimmed.match(/^[-*]\s+(?:\*\*)?([A-Za-z0-9\s/_-]+?)(?:\*\*)?:\s*(.*)$/)

    if (serviceMatch && ['client', 'server', 'ai service', 'frontend', 'backend', 'database', 'api', 'worker'].some(k => serviceMatch[1].toLowerCase().includes(k))) {
      if (currentService) services.push(currentService)

      // Check for port in description
      const desc = serviceMatch[2]
      const portMatch = desc.match(/port\s+(\d+(?:\s*\/\s*proxied to\s*\d+)?)/i)

      currentService = {
        name: serviceMatch[1].trim(),
        details: desc,
        port: portMatch ? `Port ${portMatch[1]}` : null,
      }
    } else if (currentService && (line.startsWith('    ') || line.startsWith('\t'))) {
      currentService.details += ' ' + trimmed
    } else {
      generalLines.push(trimmed)
    }
  }

  if (currentService) services.push(currentService)

  archObj.text = generalLines.join(' ')
  archObj.services = services
}

function parseTechStack(content) {
  const lines = content.split('\n')
  const categories = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Detect line like: - **Languages**: JavaScript, Python
    const catMatch = trimmed.match(/^[-*]\s*(?:\*\*)?([A-Za-z0-9\s/&_-]+?)(?:\*\*)?:\s*(.*)$/)
    if (catMatch) {
      const categoryName = catMatch[1].trim()
      const itemsRaw = catMatch[2]
      // Split items by comma
      const items = itemsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      categories.push({
        category: categoryName,
        items,
      })
    } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      // Direct bullet point
      categories.push({
        category: 'General',
        items: [trimmed.replace(/^[-*]\s*/, '')],
      })
    }
  }

  return categories
}

function parseHowToRun(content) {
  const steps = []
  const notes = []

  // Extract code blocks first
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const beforeText = content.slice(lastIndex, match.index).trim()
    const lang = match[1] || 'bash'
    const code = match[2].trim()

    if (beforeText) {
      // Find clean title
      const cleanedBefore = beforeText.replace(/^[-*]\s*/, '').trim()
      steps.push({
        title: cleanedBefore,
        code,
        lang,
      })
    } else {
      steps.push({
        title: 'Run Command',
        code,
        lang,
      })
    }
    lastIndex = match.index + match[0].length
  }

  const remaining = content.slice(lastIndex).trim()
  if (remaining) {
    const lines = remaining.split('\n')
    for (const l of lines) {
      const trimmed = l.trim()
      if (!trimmed) continue
      const cleaned = trimmed.replace(/^[-*]\s*/, '')
      if (cleaned.toLowerCase().includes('env') || cleaned.toLowerCase().includes('secret') || cleaned.toLowerCase().includes('config')) {
        notes.push({ type: 'env', text: cleaned })
      } else {
        notes.push({ type: 'info', text: cleaned })
      }
    }
  }

  return { steps, notes }
}

function parseKeyFiles(content) {
  const files = []
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Detect format: - `README.md`: description or - README.md: description
    const match = trimmed.match(/^[-*]\s*(?:`([^`]+)`|([a-zA-Z0-9_\-./]+))\s*:\s*(.*)$/)
    if (match) {
      const filename = match[1] || match[2]
      const reason = match[3]
      files.push({ file: filename.trim(), reason: reason.trim() })
    } else {
      files.push({ file: '', reason: trimmed.replace(/^[-*]\s*/, '') })
    }
  }

  return files
}

// ── Color styles for tech categories ─────────────────────────────────────────
const categoryStyles = {
  languages: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  frontend: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  backend: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
  'ai service': 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  'orchestration & devops': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  devops: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  default: 'border-surface-500 bg-surface-700/80 text-surface-200',
}

function getCategoryStyle(catName) {
  const name = catName.toLowerCase()
  for (const key in categoryStyles) {
    if (name.includes(key)) return categoryStyles[key]
  }
  return categoryStyles.default
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function RepositoryAnalysisView({ summary }) {
  const [viewMode, setViewMode] = useState('rich') // 'rich' | 'raw'
  const [copiedAll, setCopiedAll] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  if (!summary) return null

  const parsed = parseRepositorySummary(summary)

  const handleCopyAll = () => {
    navigator.clipboard.writeText(summary)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Action Bar Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-surface-800/80 border border-surface-600/70 px-4 py-2.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
          </span>
          <span className="text-xs font-medium text-surface-200">
            Intelligent Codebase Decomposition
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle View Mode */}
          <div className="flex items-center bg-surface-700 rounded-lg p-0.5 border border-surface-600 text-xs">
            <button
              onClick={() => setViewMode('rich')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === 'rich'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-surface-300 hover:text-white'
              }`}
            >
              Visual Cards
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === 'raw'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-surface-300 hover:text-white'
              }`}
            >
              Raw Markdown
            </button>
          </div>

          {/* Copy Full Analysis */}
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 text-xs text-surface-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 border border-surface-600 transition-all"
            title="Copy entire analysis as markdown"
          >
            {copiedAll ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* RAW MODE */}
      {viewMode === 'raw' && (
        <div className="relative">
          <pre className="code-block text-surface-200 text-xs whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
            {summary}
          </pre>
        </div>
      )}

      {/* RICH VISUAL MODE */}
      {viewMode === 'rich' && (
        <>
          {parsed ? (
            <div className="space-y-4">
              {/* 1. What This Project Does */}
              {parsed.overview && (
                <SectionCard
                  title="What This Project Does"
                  icon={Sparkles}
                  badge="Overview"
                  accentColor="brand"
                >
                  <p className="text-xs sm:text-sm text-surface-100 leading-relaxed font-normal">
                    {renderInlineMarkdown(parsed.overview)}
                  </p>
                </SectionCard>
              )}

              {/* 2. Architecture */}
              {(parsed.architecture.text || parsed.architecture.services.length > 0) && (
                <SectionCard
                  title="Architecture"
                  icon={Layers}
                  badge={parsed.architecture.services.length ? `${parsed.architecture.services.length} Services` : 'Overview'}
                  accentColor="cyan"
                >
                  {parsed.architecture.text && (
                    <p className="text-xs sm:text-sm text-surface-200 leading-relaxed">
                      {renderInlineMarkdown(parsed.architecture.text)}
                    </p>
                  )}

                  {parsed.architecture.services.length > 0 && (
                    <div className="grid grid-cols-1 gap-2.5 pt-1">
                      {parsed.architecture.services.map((svc, idx) => (
                        <ServiceCard
                          key={idx}
                          name={svc.name}
                          details={svc.details}
                          port={svc.port}
                        />
                      ))}
                    </div>
                  )}
                </SectionCard>
              )}

              {/* 3. Tech Stack */}
              {parsed.techStack.length > 0 && (
                <SectionCard
                  title="Tech Stack"
                  icon={Cpu}
                  badge={`${parsed.techStack.reduce((sum, c) => sum + c.items.length, 0)} Technologies`}
                  accentColor="violet"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parsed.techStack.map((cat, idx) => {
                      const style = getCategoryStyle(cat.category)
                      return (
                        <div
                          key={idx}
                          className="bg-surface-800/70 border border-surface-600/70 rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-surface-200">
                              {cat.category}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {cat.items.map((tech, tIdx) => (
                              <span
                                key={tIdx}
                                className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${style} transition-all hover:scale-105`}
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </SectionCard>
              )}

              {/* 4. How To Run */}
              {(parsed.howToRun.steps.length > 0 || parsed.howToRun.notes.length > 0) && (
                <SectionCard
                  title="How to Run (Best Guess)"
                  icon={Terminal}
                  badge="Execution"
                  accentColor="emerald"
                >
                  <div className="space-y-3">
                    {parsed.howToRun.steps.map((step, idx) => (
                      <div key={idx} className="space-y-1.5">
                        {step.title && (
                          <p className="text-xs font-medium text-surface-200 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded bg-surface-600 text-[10px] font-mono flex items-center justify-center text-brand-300">
                              {idx + 1}
                            </span>
                            {renderInlineMarkdown(step.title)}
                          </p>
                        )}
                        <CodeBlock code={step.code} language={step.lang} />
                      </div>
                    ))}

                    {parsed.howToRun.notes.map((note, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs leading-relaxed ${
                          note.type === 'env'
                            ? 'bg-amber-500/10 border-amber-500/25 text-amber-200'
                            : 'bg-surface-800 border-surface-600 text-surface-200'
                        }`}
                      >
                        {note.type === 'env' ? (
                          <KeyRound size={14} className="text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <Sparkles size={14} className="text-brand-400 shrink-0 mt-0.5" />
                        )}
                        <div>{renderInlineMarkdown(note.text)}</div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* 5. Key Files to Read First */}
              {parsed.keyFiles.length > 0 && (
                <SectionCard
                  title="Key Files to Read First"
                  icon={FileCode2}
                  badge={`${parsed.keyFiles.length} Key Files`}
                  accentColor="amber"
                >
                  <div className="grid grid-cols-1 gap-2">
                    {parsed.keyFiles.map((fileObj, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-surface-800/80 border border-surface-600/70 hover:border-surface-500 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={14} className="text-brand-400 shrink-0" />
                          {fileObj.file ? (
                            <code className="font-mono text-xs font-medium text-brand-300 bg-surface-700/80 px-2 py-0.5 rounded border border-surface-600/60 truncate">
                              {fileObj.file}
                            </code>
                          ) : null}
                          <span className="text-xs text-surface-200 truncate">
                            {renderInlineMarkdown(fileObj.reason)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>
          ) : (
            /* Graceful Fallback if arbitrary markdown without known sections */
            <div className="bg-surface-700/60 border border-surface-600/80 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-brand-400 font-medium text-xs border-b border-surface-600 pb-2">
                <Sparkles size={14} />
                <span>Repository Intelligence Report</span>
              </div>
              <div className="prose prose-invert max-w-none text-xs text-surface-200 leading-relaxed whitespace-pre-wrap">
                {renderInlineMarkdown(summary)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
