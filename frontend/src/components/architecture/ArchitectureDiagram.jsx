import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'

// AWS service → color mapping
function getServiceColor(name = '') {
  const n = name.toLowerCase()
  if (n.includes('ec2') || n.includes('compute')) return { bg: '#f97316', text: '#fff7ed' }
  if (n.includes('rds') || n.includes('aurora') || n.includes('database')) return { bg: '#3b82f6', text: '#eff6ff' }
  if (n.includes('s3') || n.includes('storage')) return { bg: '#22c55e', text: '#f0fdf4' }
  if (n.includes('cloudfront') || n.includes('cdn')) return { bg: '#8b5cf6', text: '#f5f3ff' }
  if (n.includes('alb') || n.includes('load balancer') || n.includes('elb')) return { bg: '#ec4899', text: '#fdf4ff' }
  if (n.includes('ecs') || n.includes('eks') || n.includes('container')) return { bg: '#14b8a6', text: '#f0fdfa' }
  if (n.includes('lambda')) return { bg: '#f59e0b', text: '#fffbeb' }
  if (n.includes('elasticache') || n.includes('redis') || n.includes('cache')) return { bg: '#ef4444', text: '#fff1f2' }
  if (n.includes('route') || n.includes('dns')) return { bg: '#64748b', text: '#f8fafc' }
  if (n.includes('iam') || n.includes('security')) return { bg: '#dc2626', text: '#fff1f2' }
  if (n.includes('cloudwatch') || n.includes('monitor')) return { bg: '#0ea5e9', text: '#f0f9ff' }
  if (n.includes('api gateway')) return { bg: '#6366f1', text: '#eef2ff' }
  return { bg: '#4f46e5', text: '#eef2ff' }
}

// Custom AWS node
function AwsNode({ data }) {
  const color = getServiceColor(data.label)
  return (
    <div
      style={{ background: color.bg + '22', borderColor: color.bg + '60', color: color.text }}
      className="rounded-xl border-2 px-4 py-3 min-w-[140px] text-center shadow-lg backdrop-blur"
    >
      <div
        style={{ background: color.bg }}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs mx-auto mb-2"
      >
        {data.label.slice(0, 2).toUpperCase()}
      </div>
      <p className="text-xs font-semibold text-white leading-tight">{data.label}</p>
      {data.purpose && (
        <p className="text-[10px] text-surface-200 mt-1 leading-tight">{data.purpose}</p>
      )}
    </div>
  )
}

const nodeTypes = { aws: AwsNode }

function buildGraph(architecture) {
  if (!architecture || architecture.raw) return { nodes: [], edges: [] }

  const services = architecture.services || []
  const connections = architecture.connections || []

  // Layout nodes in a grid
  const cols = Math.ceil(Math.sqrt(services.length))
  const nodes = services.map((svc, i) => ({
    id: svc.name,
    type: 'aws',
    position: {
      x: (i % cols) * 220 + 50,
      y: Math.floor(i / cols) * 160 + 50,
    },
    data: { label: svc.name, purpose: svc.purpose },
  }))

  const edges = connections.map((conn, i) => ({
    id: `e-${i}`,
    source: conn.from,
    target: conn.to,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    style: { stroke: '#6366f1', strokeWidth: 2 },
    animated: true,
  }))

  return { nodes, edges }
}

export default function ArchitectureDiagram({ architecture }) {
  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildGraph(architecture),
    [architecture]
  )

  const [nodes, , onNodesChange] = useNodesState(initNodes)
  const [edges, , onEdgesChange] = useEdgesState(initEdges)

  if (!architecture || architecture.raw || !architecture.services?.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-surface-800 rounded-xl border border-surface-600">
        <p className="text-surface-300 text-sm">No diagram data available</p>
      </div>
    )
  }

  return (
    <div className="h-[480px] bg-surface-800 rounded-xl border border-surface-600 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        attributionPosition="bottom-right"
      >
        <Background color="#2d2d42" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(n) => getServiceColor(n.data?.label).bg}
          maskColor="rgba(10,10,15,0.8)"
          style={{ background: '#1a1a26', border: '1px solid #2d2d42' }}
        />
      </ReactFlow>
    </div>
  )
}
