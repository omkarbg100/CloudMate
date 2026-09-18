import Editor from "@monaco-editor/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderTree,
  GitBranch,
  Play,
  RefreshCw,
  Sparkles,
  SquareTerminal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { sampleFiles } from "../data/sampleFiles";
import { analyzeProject, getRepoFile, getRepoTree } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

function languageOf(name) {
  if (name.endsWith(".js") || name.endsWith(".jsx") || name.endsWith(".mjs")) return "javascript";
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return "typescript";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".yml") || name.endsWith(".yaml")) return "yaml";
  if (name.endsWith(".md")) return "markdown";
  if (name.endsWith(".py")) return "python";
  if (name.endsWith(".html")) return "html";
  if (name.endsWith(".css")) return "css";
  if (name.endsWith(".scss") || name.endsWith(".sass")) return "scss";
  if (name.endsWith(".sql")) return "sql";
  if (name.endsWith(".sh")) return "shell";
  if (name.endsWith(".dockerfile") || name === "Dockerfile") return "dockerfile";
  if (name.endsWith(".env") || name.endsWith(".env.example")) return "ini";
  if (name.endsWith(".toml")) return "ini";
  if (name.endsWith(".xml")) return "xml";
  return "plaintext";
}

/* Build a nested tree (dirs with nested subdirs + files) from flat paths. */
function buildTree(paths) {
  const root = { name: "", path: "", kind: "dir", dirs: [], files: [] };

  const byPath = new Map();
  byPath.set("", root);
  for (const entry of paths) {
    const parts = entry.path.split("/");
    let node = root;
    let prefix = "";
    for (let i = 0; i < parts.length - 1; i += 1) {
      prefix = prefix ? `${prefix}/${parts[i]}` : parts[i];
      let child = byPath.get(prefix);
      if (!child) {
        child = { name: parts[i], path: prefix, kind: "dir", dirs: [], files: [] };
        byPath.set(prefix, child);
        node.dirs.push(child);
      }
      node = child;
    }
    node.files.push({ name: parts.at(-1), path: entry.path, kind: entry.type });
  }

  const sortNode = (node) => {
    node.dirs.sort((a, b) => a.name.localeCompare(b.name));
    node.files.sort((a, b) => a.name.localeCompare(b.name));
    node.dirs.forEach(sortNode);
  };
  sortNode(root);
  return root;
}

export default function RepositoryView({ project, projectId, analysis }) {
  const queryClient = useQueryClient();
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const activeFile = useDeployMateStore((state) => state.activeFile);
  const setActiveFile = useDeployMateStore((state) => state.setActiveFile);

  const treeQuery = useQuery({
    queryKey: ["repo-tree", projectId],
    queryFn: () => getRepoTree(projectId),
    enabled: Boolean(projectId),
    retry: false,
  });

  const fileQuery = useQuery({
    queryKey: ["repo-file", projectId, activeFile],
    queryFn: () => getRepoFile(projectId, activeFile),
    enabled: Boolean(projectId) && Boolean(activeFile),
    retry: false,
  });

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["analysis", projectId] }), 4000);
    },
  });

  const { tree, source } = useMemo(() => {
    const paths = treeQuery.data?.paths ?? [];
    if (paths.length > 0) {
      return { tree: buildTree(paths), source: "github" };
    }
    const raw = Object.entries(analysis?.rawFiles ?? {}).filter(([, c]) => typeof c === "string");
    const files = raw.length > 0 ? raw.map(([path]) => ({ path, type: "blob" })) : Object.keys(sampleFiles).map((path) => ({ path, type: "blob" }));
    return { tree: buildTree(files), source: "fallback" };
  }, [treeQuery.data, analysis]);

  const githubAvailable = source === "github";

  if (!projectId) {
    return (
      <EmptyState
        title="No repository linked"
        description="Create a project with your GitHub repository to inspect it here."
        actionLabel="Create project"
        onAction={() => setActiveView("projects")}
      />
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
      {/* Explorer */}
      <aside className="studio-scrollbar hidden min-h-0 flex-col border-r border-studio-line bg-studio-panel md:flex">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-studio-line px-3 text-[11px] font-medium text-studio-faint">
          <FolderTree className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="uppercase">Explorer</span>
          {!githubAvailable ? (
            <span className="ml-auto text-[10px] normal-case text-studio-faint">key files</span>
          ) : null}
          <button
            type="button"
            aria-label="Refresh tree"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["repo-tree", projectId] })}
            className="ml-auto text-studio-faint hover:text-studio-text"
            title="Refresh repository tree"
          >
            <RefreshCw className={`h-3 w-3 ${treeQuery.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
        </div>

        {treeQuery.isPending ? (
          <p className="px-3 py-8 text-center text-xs text-studio-faint">Loading files…</p>
        ) : (
          <TreeExplorer
            key={githubAvailable ? "github" : "fallback"}
            root={tree}
            activeFile={activeFile}
            defaultOpen={githubAvailable ? tree.dirs.map((d) => d.path) : tree.dirs.map((d) => d.path)}
            onSelect={(path) => setActiveFile(path)}
          />
        )}
      </aside>

      {/* File list strip for small screens */}
      <nav className="studio-scrollbar flex gap-1 overflow-x-auto border-b border-studio-line bg-studio-panel px-2 py-1 md:hidden">
        <LeafList root={tree} onSelect={(path) => setActiveFile(path)} activeFile={activeFile} />
      </nav>

      {/* Main split */}
      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid min-h-0 grid-rows-[40px_minmax(0,1fr)]">
          <div className="flex items-center justify-between border-b border-studio-line bg-studio-panel px-3">
            <div className="flex min-w-0 items-center gap-2">
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-studio-faint" aria-hidden="true" />
              <span className="truncate font-mono text-xs text-studio-muted">{activeFile}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["repo-tree", projectId] });
                  if (activeFile) queryClient.invalidateQueries({ queryKey: ["repo-file", projectId, activeFile] });
                }}
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                Refresh
              </Button>
              <Button
                size="xs"
                variant="primary"
                disabled={analyzeMutation.isPending}
                isLoading={analyzeMutation.isPending}
                loadingLabel="Analyzing…"
                onClick={() => analyzeMutation.mutate()}
              >
                {analyzeMutation.isPending ? null : (
                  <>
                    <Play className="h-3 w-3" aria-hidden="true" />
                    Analyze repository
                  </>
                )}
              </Button>
            </div>
          </div>

          <EditorPane activeFile={activeFile} file={fileQuery.data} loading={fileQuery.isPending} analysisLoading={analyzeMutation.isPending && !analysis} />
        </div>

        {/* AI insight */}
        <aside className="hidden min-h-0 flex-col border-l border-studio-line lg:flex">
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-studio-line px-3 text-[11px] font-medium text-studio-faint">
            <Sparkles className="h-3.5 w-3.5 text-studio-accent" aria-hidden="true" />
            AI INSIGHT
          </div>
          <div className="studio-scrollbar min-h-0 flex-1 space-y-3 overflow-auto p-3">
            {!analysis ? (
              <p className="text-xs leading-5 text-studio-muted">
                No analysis yet. Run{" "}
                <span className="font-medium text-studio-text">Analyze repository</span> and I’ll explain what this
                file does and what needs your attention.
              </p>
            ) : (
              <>
                <InsightBlock
                  title="Stack detected"
                  lines={[
                    analysis.database ? `Database: ${analysis.database}` : null,
                    analysis.backend?.framework ? `Backend: ${analysis.backend.framework}` : null,
                    analysis.docker ? "Docker: detected" : "Docker: not detected",
                    analysis.packageManager ? `Pkg manager: ${analysis.packageManager}` : null,
                  ].filter(Boolean)}
                />
                {analysis.environmentVariables?.length ? (
                  <InsightBlock title="Environment variables" lines={analysis.environmentVariables.map((e) => e)} mono />
                ) : null}
                <div className="rounded-lg border border-studio-line bg-studio-panel p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-studio-faint">
                    <Boxes className="h-3 w-3" aria-hidden="true" />
                    NEXT STEP
                  </p>
                  <Button variant="secondary" size="xs" className="mt-2 w-full" onClick={() => setActiveView("architecture")}>
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    Design AWS architecture
                  </Button>
                  <Button size="xs" variant="ghost" className="mt-1.5 w-full" onClick={() => setActiveView("changes")}>
                    <SquareTerminal className="h-3 w-3" aria-hidden="true" />
                    Propose fixes
                  </Button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function EditorPane({ activeFile, file, loading, analysisLoading }) {
  let body;
  if (analysisLoading) {
    body = (
      <LoadingState
        title="Analyzing repository…"
        steps={[
          "Scanning package files",
          "Detecting framework",
          "Detecting database",
          "Analyzing Docker configuration",
          "Generating deployment requirements",
        ]}
      />
    );
  } else if (loading) {
    body = <LoadingState title={`Opening ${activeFile}…`} />;
  } else if (file?.content == null) {
    body = (
      <EmptyState
        title={file?.reason === "not_found" ? "File not found" : "Can't preview this file"}
        description={
          file?.reason === "not_found"
            ? "It may have been removed from the branch. Refresh the explorer to resync."
            : "Binary or too large to render inline."
        }
      />
    );
  } else {
    body = (
      <Editor
        height="100%"
        language={languageOf(activeFile)}
        theme="vs-dark"
        value={file.content}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          readOnly: true,
          fontFamily: '"JetBrains Mono", monospace',
        }}
      />
    );
  }
  return <div className="min-h-0">{body}</div>;
}

function TreeExplorer({ root, activeFile, defaultOpen, onSelect }) {
  const [openDirs, setOpenDirs] = useState(() => new Set(defaultOpen));

  function toggle(path) {
    setOpenDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <div className="min-h-0 flex-1 p-1.5">
      {treeRows(root, openDirs, toggle, activeFile, onSelect)}
    </div>
  );
}

function treeRows(node, openDirs, toggle, activeFile, onSelect, depth = 0) {
  const rows = [];
  for (const dir of node.dirs) {
    const isOpen = openDirs.has(dir.path);
    rows.push(
      <button
        key={`dir-${dir.path}`}
        type="button"
        onClick={() => toggle(dir.path)}
        className="flex w-full items-center gap-1.5 rounded px-2 py-[3px] text-left text-xs text-studio-muted hover:bg-studio-panel2 hover:text-studio-text"
        style={{ paddingLeft: `${4 + depth * 14}px` }}
        title={dir.path}
      >
        <ChevronRight
          className={`h-3 w-3 shrink-0 text-studio-faint transition-transform ${isOpen ? "rotate-90" : ""}`}
          aria-hidden="true"
        />
        {isOpen ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
        )}
        <span className="truncate">{dir.name}</span>
      </button>
    );
    if (isOpen) rows.push(...treeRows(dir, openDirs, toggle, activeFile, onSelect, depth + 1));
  }
  for (const file of node.files) {
    const active = file.path === activeFile;
    rows.push(
      <button
        key={`file-${file.path}`}
        type="button"
        onClick={() => onSelect(file.path)}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-[3px] text-left text-xs ${
          active ? "bg-studio-accent/10 text-studio-text" : "text-studio-muted hover:bg-studio-panel2 hover:text-studio-text"
        }`}
        style={{ paddingLeft: `${4 + (depth + 1) * 14}px` }}
        title={file.path}
      >
        <span className="w-3 shrink-0" />
        <FileText className="h-3.5 w-3.5 shrink-0 text-studio-faint" aria-hidden="true" />
        <span className="truncate">{file.name}</span>
      </button>
    );
  }
  return rows;
}

function LeafList({ root, onSelect, activeFile }) {
  const leaves = [];
  const walk = (node) => {
    for (const dir of node.dirs) walk(dir);
    leaves.push(...node.files);
  };
  walk(root);
  return (
    <>
      {leaves.map((file) => (
        <button
          key={file.path}
          type="button"
          onClick={() => onSelect(file.path)}
          className={`whitespace-nowrap rounded px-2 py-1 text-[11px] ${activeFile === file.path ? "bg-studio-panel2 text-studio-text" : "text-studio-muted"}`}
        >
          {file.name}
        </button>
      ))}
    </>
  );
}

function InsightBlock({ title, lines, mono }) {
  return (
    <div className="rounded-lg border border-studio-line bg-studio-panel p-3">
      <p className="text-[11px] font-medium text-studio-faint">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {lines.map((line) => (
          <li key={line} className={`text-xs leading-5 text-studio-muted ${mono ? "font-mono" : ""}`}>
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}