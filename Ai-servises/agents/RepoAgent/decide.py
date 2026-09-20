# agent/decide.py
# Simple decision parser for agent actions
# LLM returns simple commands that need to be parsed into actions.
# For example:
# READ_FILE: path/to/file.py
# FINISH

def decide_action(thought: str) -> dict:
    """
    Very simple parser.
    LLM returns something like:
    READ_FILE: 1
    or
    FINISH
    """

    thought = thought.strip()

    if thought.startswith("READ_FILE:"):
        path_part = thought.replace("READ_FILE:", "").strip()
        try:
            number = int(path_part)
            # Note: The actual path will be resolved later using the list
            return {
                "action": "read_file",
                "index": number - 1  # 0-based
            }
        except ValueError:
            # Fallback to old parsing if not a number
            return {
                "action": "read_file",
                "path": path_part
            }

    if thought.startswith("FINISH"):
        return {"action": "finish"}

    return {"action": "noop"}
