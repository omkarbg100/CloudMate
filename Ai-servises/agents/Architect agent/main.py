import os
from architect import run_aws_architect_agent

# Provider credentials are loaded from the environment by utils.llm.

if __name__ == "__main__":
    question = "Design an architecture that reduces timeout risk when reading data from S3 through Athena and generating embeddings."
    messages = run_aws_architect_agent(question)
    for message in messages:
        print(f"{message.type}: {message.content}\n")
    
