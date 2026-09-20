# agent/core.py
# Main agent logic for repository analysis
# Implements the RepoAgent class that orchestrates the scanning,
# decision-making, and summarization of a GitHub repository.

import os

from agents.RepoAgent.state import AgentState
from agents.RepoAgent.prompts import think_prompt
from agents.RepoAgent.tools import list_files, read_file_safe
from agents.RepoAgent.summarizer import generate_summary
from utils.llm import call_llm, BudgetExceeded
from agents.RepoAgent.decide import decide_action
from agents.RepoAgent.detector import detect_project_type


class RepoAgent:
    def __init__(self, repo_path: str, max_steps: int = 15):
        self.state = AgentState(repo_path)
        self.max_steps = max_steps

    def run(self) -> str:
        print("🔍 Scanning repository...")
        self.state.files = list_files(self.state.repo_path)

        # --- Project type detection ---
        self.state.project_type = detect_project_type(self.state.files)
        self.state.insights.append(
            f"Detected project type: {self.state.project_type}"
        )

        # --- Agent loop ---
        for step in range(self.max_steps):
            print(f"\n🤔 Step {step + 1}")

            # THINK
            prompt = think_prompt(self.state)

            try:
                thought = call_llm(prompt, self.state)
            except BudgetExceeded:
                print("💰 Token budget exceeded. Stopping agent.")
                break
            except Exception as e:
                print("⚠️ LLM error during THINK:", e)
                break

            print("THOUGHT:", thought)

            # DECIDE
            decision = decide_action(thought)
            print("DECISION:", decision)

            action = decision.get("action")

            # ACT
            if action == "read_file":
                if "index" in decision:
                    # Compute the same sorted list as in think_prompt
                    important_extensions = [".py", ".js", ".ts", ".md", ".rst", ".toml", ".txt", ".yml", ".yaml", ".json", ".ini"]
                    unread_files = [
                        f for f in self.state.files
                        if f not in self.state.read_files
                        and any(f.endswith(ext) for ext in important_extensions)
                    ]
                    def priority_key(f):
                        if "README" in f or f.endswith(".md") or f.endswith(".rst"):
                            return 0
                        if any(k in f for k in ["pyproject.toml", "package.json", "requirements.txt", "setup.py", "Cargo.toml", "go.mod"]):
                            return 1
                        if any(f.endswith(ext) for ext in [".py", ".js", ".ts", ".rs", ".go", ".java", ".cs"]):
                            return 2
                        return 3
                    unread_files_sorted = sorted(unread_files, key=priority_key)[:10]
                    index = decision["index"]
                    if 0 <= index < len(unread_files_sorted):
                        relative_path = unread_files_sorted[index]
                    else:
                        print("⚠️ Invalid index")
                        continue
                else:
                    relative_path = decision.get("path")

                if not relative_path:
                    print("⚠️ No file path provided.")
                    continue

                # Validate that the path is in the scanned files list
                if relative_path not in self.state.files:
                    print(f"⚠️ Invalid file path (not in repo): {relative_path}")
                    continue

                if relative_path in self.state.read_files:
                    print("ℹ️ File already read, skipping.")
                    continue

                if relative_path in self.state.failed_reads:
                    print("ℹ️ File previously failed, skipping.")
                    continue

                full_path = os.path.join(self.state.repo_path, relative_path)

                if not os.path.exists(full_path):
                    print("⚠️ File does not exist:", relative_path)
                    self.state.failed_reads.append(relative_path)
                    continue

                content = read_file_safe(full_path)

                if not content:
                    print("⚠️ File unreadable or unhelpful:", relative_path)
                    self.state.failed_reads.append(relative_path)
                    self.state.insights.append(
                        f"Skipped file (unhelpful): {relative_path}"
                    )
                    continue

                self.state.read_files[relative_path] = content
                self.state.insights.append(
                    f"Read file: {relative_path} ({len(content.splitlines())} lines)"
                )

                # Brief pacing delay to respect API rate limits
                import time
                time.sleep(1.5)

            elif action == "finish":
                print("✅ Agent decided it has enough information.")
                break

            else:
                print("⚠️ Unknown or no-op action, stopping agent.")
                break

        # --- Final summary ---
        print("\n📝 Generating README-style summary...")

        try:
            summary = generate_summary(self.state)
        except BudgetExceeded:
            summary = (
                "# Summary not generated\n\n"
                "Token budget was exceeded before the final summary could be created."
            )
        except Exception as e:
            summary = f"# Summary generation failed\n\nError: {e}"

        # --- Cost report ---
        print("\n💰 Cost summary")
        print("----------------------------")
        print(f"Prompt tokens:     {self.state.total_prompt_tokens}")
        print(f"Completion tokens: {self.state.total_completion_tokens}")
        print(f"Estimated cost (€): {self.state.total_cost_eur:.4f}")
        print("----------------------------")

        return summary
