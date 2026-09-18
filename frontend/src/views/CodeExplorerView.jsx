import Editor from "@monaco-editor/react";
import { useMutation } from "@tanstack/react-query";
import { FileText, Sparkles } from "lucide-react";
import { sampleFiles } from "../data/sampleFiles";
import { generateCode } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

export default function CodeExplorerView({ projectId }) {
  const activeFile = useDeployMateStore((state) => state.activeFile);
  const setActiveFile = useDeployMateStore((state) => state.setActiveFile);
  const file = sampleFiles[activeFile] ?? { language: "plaintext", content: "" };

  const codeMutation = useMutation({
    mutationFn: () => generateCode(projectId, { message: "Fix the highest severity deployment blockers." }),
  });

  return (
    <div className="grid h-full min-h-0 grid-cols-[240px_minmax(0,1fr)] bg-white">
      <aside className="studio-scrollbar min-h-0 overflow-auto border-r border-studio-line bg-studio-panel p-2">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase text-neutral-500">Explorer</p>
        {Object.keys(sampleFiles).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setActiveFile(name)}
            className={`block w-full truncate px-2 py-1.5 text-left text-xs ${
              activeFile === name ? "bg-studio-ink text-white" : "hover:bg-white"
            }`}
          >
            {name}
          </button>
        ))}
      </aside>

      <div className="grid min-h-0 grid-rows-[40px_minmax(0,1fr)_auto]">
        <div className="flex items-center justify-between border-b border-studio-line px-3">
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <FileText className="h-4 w-4 text-studio-teal" aria-hidden="true" />
            <span className="truncate font-medium">{activeFile}</span>
          </div>
          <button
            type="button"
            onClick={() => codeMutation.mutate()}
            disabled={!projectId || codeMutation.isPending}
            className="flex h-7 items-center gap-1 border border-studio-line px-2 text-xs hover:border-studio-teal disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {codeMutation.isPending ? "Generating…" : "Generate fix"}
          </button>
        </div>

        <div className="min-h-0">
          <Editor
            height="100%"
            language={file.language}
            theme="vs-light"
            value={file.content}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbersMinChars: 3,
              scrollBeyondLastLine: false,
              wordWrap: "on",
              automaticLayout: true,
              readOnly: true,
            }}
          />
        </div>

        <div className="studio-scrollbar max-h-48 overflow-auto border-t border-studio-line bg-studio-panel p-3 text-xs">
          {codeMutation.data ? (
            <div className="space-y-2">
              <p className="text-neutral-600">{codeMutation.data.explanation}</p>
              {(codeMutation.data.changes ?? []).map((change) => (
                <div key={change.file} className="border border-studio-line bg-white p-2">
                  <p className="font-medium">
                    {change.action} · {change.file}
                  </p>
                  <p className="text-neutral-500">{change.description}</p>
                  {change.diff ? (
                    <pre className="studio-scrollbar mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[11px] text-neutral-700">
                      {change.diff}
                    </pre>
                  ) : null}
                </div>
              ))}
              {(codeMutation.data.changes ?? []).length === 0 ? (
                <p className="text-neutral-500">No changes proposed.</p>
              ) : null}
            </div>
          ) : (
            <p className="text-neutral-500">
              Generated code changes appear here as reviewable proposals — nothing is applied automatically.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
