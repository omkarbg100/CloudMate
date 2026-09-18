# Workflows

All workflows are LangGraph `StateGraph` subgraphs sharing the typed
`DeploymateState` (see `utils/state.py`). The orchestrator (`graphs/graph.py`)
routes HTTP actions to the matching subgraph or single-agent chain. The full
end-to-end pipeline is built in `graphs/workflows.py`.

## Full Pipeline (end-to-end)

```text
Repository Analysis
→ AWS Discovery
→ Architecture Planning
→ Security Validation
→ Code/Infrastructure Generation
→ Validation
→ Deployment Plan
→ Policy Validation
→ Human Approval (LangGraph interrupt, pause/resume)
→ Deployment Execution (scoped tool actions only)
→ Monitoring
→ Diagnosis
→ Repair
```

- The approval gate pauses via LangGraph `interrupt`. Resume is done with
  `Command(resume={"approved": bool})` under the same `thread_id`
  (`POST /workflow/{thread_id}/approve`).
- Risky nodes carry a `RetryPolicy` (max attempts `MAX_RETRIES`) for transient
  tool failures.
- Every node appends its name to `history` for a full audit trail.

## Analyze Repository

1. User selects repository.
2. Node creates analysis job.
3. Python Repository Agent scans files.
4. Agent returns structured analysis.
5. Node stores analysis and emits WebSocket completion event.
6. Frontend renders stack, commands, ports, env vars, Docker, tests.

## Generate Architecture

1. Architecture Agent reads analysis.
2. Agent chooses AWS services.
3. Agent emits architecture JSON.
4. Frontend renders architecture graph and reasoning.

## Security Scan

1. Security Agent scans repository content and dependency manifests.
2. Findings are severity-ranked.
3. Secret values are redacted.
4. Frontend displays critical/high/medium/low findings.

## Code Fix

1. User asks for a fix.
2. Code Agent generates patch.
3. Node stores change set.
4. Frontend shows diff.
5. User accepts or rejects.
6. Accepted change is applied through controlled filesystem/GitHub tool.

## Deploy (pipeline tail)

1. Validation runs.
2. Deployment plan is generated.
3. Policy node validates actions; approval gate interrupts for a human decision.
4. Deployment Agent executes typed AWS actions through `tools/aws`.
5. WebSocket streams progress.
6. Monitoring Agent verifies health.

## Diagnose / Repair

1. Monitoring Agent reads CloudWatch logs/metrics.
2. Agent identifies symptoms and likely cause.
3. Agent suggests a fix (repair node, LangChain-generated when enabled).
4. User approves generated patch or configuration change.