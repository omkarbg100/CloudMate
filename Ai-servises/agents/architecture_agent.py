import json

from utils.llm import call_llm


def run(analysis: object, requirements: str = "", region: str = "ap-south-1") -> str:
    prompt = f"""Design a simple AWS architecture from this repository analysis. Do not connect to AWS and do not inspect AWS resources. Return only JSON with region, services, connections, rationale, and warnings. Each service must contain name, purpose, and decision (create, reuse, or modify). Region: {region}. Requirements: {requirements}. Analysis: {json.dumps(analysis, ensure_ascii=False)}"""
    return call_llm(prompt, system_prompt="You are DeployMate's AWS architecture agent. Return factual, concise JSON.")
