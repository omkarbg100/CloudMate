# agent/detector.py
# Project type detector based on file presence, extensions, and counts
# Prioritizes projects with the most files in a language, falling back to config files
# Handles mixed repositories by identifying the dominant type

def detect_project_type(files: list[str]) -> str:
    """
    Detects the project type by counting files per language and checking config files.
    Returns the type with the most files, or based on config if tied.
    """
    # Count files by extension/language
    counts = {
        "Python": sum(1 for f in files if f.endswith(".py")),
        "JavaScript": sum(1 for f in files if f.endswith(".js")),
        "TypeScript": sum(1 for f in files if f.endswith(".ts")),
        "Java": sum(1 for f in files if f.endswith(".java")),
        "C#": sum(1 for f in files if f.endswith(".cs")),
        "Rust": sum(1 for f in files if f.endswith(".rs")),
        "Go": sum(1 for f in files if f.endswith(".go")),
        "Ruby": sum(1 for f in files if f.endswith(".rb")),
        "PHP": sum(1 for f in files if f.endswith(".php")),
        "C++": sum(1 for f in files if f.endswith((".cpp", ".cc", ".cxx"))),
        "C": sum(1 for f in files if f.endswith(".c")),
    }
    
    # Find the language with the most files
    max_count = max(counts.values())
    if max_count > 0:
        dominant_languages = [lang for lang, count in counts.items() if count == max_count]
        if len(dominant_languages) == 1:
            return f"{dominant_languages[0]} project"
        # If tie, fall back to config checks
    
    # Fallback to config-based detection if no clear dominant or tie
    config_checks = [
        (lambda f: "pyproject.toml" in f or "setup.py" in f, "Python project"),
        (lambda f: "requirements.txt" in f or "Pipfile" in f, "Python project"),
        (lambda f: "package.json" in f, "Node.js project"),
        (lambda f: "yarn.lock" in f or "pnpm-lock.yaml" in f, "Node.js project"),
        (lambda f: "tsconfig.json" in f, "TypeScript project"),
        (lambda f: ".csproj" in f or ".sln" in f, "C#/.NET project"),
        (lambda f: "Cargo.toml" in f, "Rust project"),
        (lambda f: "go.mod" in f, "Go project"),
        (lambda f: "Gemfile" in f, "Ruby project"),
        (lambda f: "composer.json" in f, "PHP project"),
        (lambda f: "pom.xml" in f or "build.gradle" in f, "Java project"),
        (lambda f: "Dockerfile" in f, "Containerized application"),
    ]
    
    for check_func, project_type in config_checks:
        if any(check_func(f) for f in files):
            return project_type
    
    # Generic web detection
    if any("index.html" in f for f in files) and any(f.endswith((".js", ".css")) for f in files):
        return "Web project"
    
    return "Unknown / mixed project"
