import subprocess
import os
import tempfile


def generate_diagram(yaml_content: str) -> dict:
    # Create a temporary YAML file.
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".yaml", delete=False
    ) as temp_file:
        temp_file.write(yaml_content)
        temp_file_path = temp_file.name

    try:
        # Run the diagram generator.
        result = subprocess.run(
            ["awsdac", temp_file_path], capture_output=True, text=True, check=True
        )

        # The generator writes output.png by default.
        output_file = "output.png"
        feedback = analyze_diagram_output(result.stderr)

        # Confirm that the output file was created.
        if os.path.exists(output_file):
            return {
                "success": True,
                "message": f"Diagram generated successfully. stdout: {result.stdout}, stderr: {result.stderr}",
                "feedback": feedback,
            }
        else:
            return {
                "success": False,
                "message": f"The diagram file was not generated. stdout: {result.stdout}, stderr: {result.stderr}",
                "feedback": feedback,
            }

    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "message": f"Diagram generation failed: {e.stderr}",
            "feedback": None,
        }
    finally:
        # Remove the temporary file.
        os.unlink(temp_file_path)


def analyze_diagram_output(output: str) -> dict:
    feedback = {"warnings": [], "errors": [], "suggestions": []}

    for line in output.split("\n"):
        if "WARN" in line:
            feedback["warnings"].append(line)
        elif "ERROR" in line:
            feedback["errors"].append(line)
        elif "consider" in line.lower() or "suggest" in line.lower():
            feedback["suggestions"].append(line)

    return feedback
