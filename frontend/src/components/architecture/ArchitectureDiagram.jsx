import { useState } from "react";
import { ArrowDown, Server, Boxes, Database, Globe, ShieldCheck, Network, Container } from "lucide-react";
import { DecisionBadge } from "../ui/StatusBadge";
import { Dot } from "../ui/Badge";

const SERVICE_ICONS = {
  ecr: Boxes,
  ecs: Container,
  fargate: Container,
  alb: Network,
  vpc: Network,
  s3: Server,
  rds: Database,
  lambda: Server,
  elasticache: Network,
  mongodb: Database,
  github: Boxes,
  ssm: Server,
  secrets: ShieldCheck,
  cloudfront: Globe,
};

function iconFor(service = "") {
  const key = Object.keys(SERVICE_ICONS).find((k) => service.toLowerCase().includes(k));
  return SERVICE_ICONS[key] ?? Server;
}

export function ArchitectureNode({ node, selected, onSelect }) {
  const Icon = iconFor(node.service);
  const isCreate = node.decision === "create";
  const isModify = node.decision === "modify";

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      className={`group w-full rounded-lg border bg-studio-panel text-left transition-colors ${
        selected
          ? "border-studio-accent shadow-[0_0_0_1px_rgba(79,124,255,0.4)]"
          : "border-studio-line hover:border-studio-line2"
      } ${isModify ? "border-l-2 border-l-amber-400" : ""} ${isCreate ? "border-l-2 border-l-sky-400" : ""}`}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
            isCreate
              ? "border-sky-400/30 bg-sky-400/10 text-sky-400"
              : isModify
                ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                : "border-studio-line2 bg-studio-panel2 text-studio-muted"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-medium text-studio-text">{node.label}</p>
            <DecisionBadge decision={node.decision} />
          </div>
          <p className="flex items-center gap-1.5 truncate text-[11px] text-studio-faint">
            <span className="uppercase">{node.service}</span>
            {node.existingResourceId ? (
              <>
                <Dot tone="muted" className="h-1 w-1" />
                <span className="font-mono">{node.existingResourceId}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>
      {node.purpose ? (
        <p className="border-t border-studio-line px-3 py-1.5 text-[11px] leading-5 text-studio-muted">
          {node.purpose}
        </p>
      ) : null}
    </button>
  );
}

export function ArchitectureDiagram({ nodes = [], edges = [], onNodeSelect, selectedId }) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edgesList = edges.length > 0 ? edges : [];
  // Fallback: chain nodes in declaration order so the diagram is never empty.
  const ordered = edgesList.length
    ? edgesList.map((edge) => edge.from).filter((id) => byId.has(id))
    : nodes.map((node) => node.id);
  const tail = edgesList.find((edge) => !byId.has(edge.to))
    ? null
    : edgesList.length
      ? edgesList.at(-1).to
      : nodes.length
        ? nodes.at(-1).id
        : null;

  const chain = edgesList.length
    ? [...ordered, tail].filter(Boolean)
    : nodes.map((node) => node.id);

  return (
    <div className="flex w-full flex-col items-center gap-0 py-2">
      {chain.map((id, index) => {
        const node = byId.get(id);
        if (!node) return null;
        return (
          <div key={id} className="flex w-full max-w-md flex-col items-center">
            <ArchitectureNode node={node} selected={selectedId === id} onSelect={onNodeSelect} />
            {index < chain.length - 1 ? (
              <div className="flex h-5 items-center justify-center text-studio-faint">
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </div>
            ) : null}
          </div>
        );
      })}
      {chain.length === 0 ? (
        <p className="py-8 text-sm text-studio-muted">Architecture has no nodes yet.</p>
      ) : null}
    </div>
  );
}