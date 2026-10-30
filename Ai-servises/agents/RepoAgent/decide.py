# agent/decide.py
# Decision parser for agent actions.
# The LLM returns a short command that is parsed into an action dict.
#
# Supported responses:
#   READ_FILE: <number>      — read the Nth file from the priority list
#   SEARCH_CODE: <pattern>   — grep-style search across repo files
#   FINISH                   — enough info collected, produce summary

from __future__ import annotations


def decide_action(thought: str) -> dict:
    """Parse the raw LLM response into a structured action dict.

    Returns a dict with at least an 'action' key.
    """
    thought = thought.strip()

    # Strip markdown code fences if the model wrapped its answer
    if thought.startswith("```"):
        lines = thought.splitlines()
        thought = "\n".join(lines[1:]).rstrip("`").strip()

    if thought.startswith("READ_FILE:"):
        raw = thought.replace("READ_FILE:", "").strip()
        try:
            number = int(raw)
            return {"action": "read_file", "index": number - 1}  # 0-based
        except ValueError:
            return {"action": "read_file", "path": raw}

    if thought.startswith("SEARCH_CODE:"):
        pattern = thought.replace("SEARCH_CODE:", "").strip()
        return {"action": "search_code", "pattern": pattern}

    if thought.upper().startswith("FINISH"):
        return {"action": "finish"}

    return {"action": "noop"}
