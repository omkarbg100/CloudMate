import os
import subprocess
import logging
import re
import base64
import traceback
from typing import Annotated, Generator, TypedDict, Dict
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import SystemMessage
from langgraph.graph import StateGraph, Graph, START, END
from diagram_generator import generate_diagram
from utils.llm import create_llm as create_gateway_llm

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class State(TypedDict):
    messages: Annotated[list[BaseMessage], "The conversation history"]
    yaml_content: Annotated[str, "The generated YAML content"]
    architecture_explanation: Annotated[str, "Explanation of the architecture"]
    diagram_generated: Annotated[bool, "Whether the diagram has been generated"]
    validation_result: Annotated[str, "Result of the validation"]
    iteration_count: Annotated[int, "Number of iterations"]
    architecture_score: Annotated[float, "Score of the current architecture (0-100)"]
    current_node: Annotated[str, "Current node in the workflow"]
    next_node: Annotated[str, "Next node to be executed"]
    context: Annotated[dict, "Additional context information"]


def create_llm(model_id: str):
    model, _provider = create_gateway_llm()
    return model


with open("diagram_as_code.yaml", "r") as file:
    diagram_as_code_example = file.read()


def extract_yaml(content: str) -> str:
    match = re.search(r"<DIAGRAM>(.*?)</DIAGRAM>", content, re.DOTALL)
    if match:
        yaml_content = match.group(1).strip()
        return yaml_content
    return ""


def check_warn_messages(yaml_content: str) -> bool:
    if not yaml_content:
        return False
    with open("temp_architecture.yaml", "w") as f:
        f.write(yaml_content)
    result = subprocess.run(
        ["awsdac", "temp_architecture.yaml"], capture_output=True, text=True
    )
    return "WARN" not in result.stdout


def architect_node(state: State) -> State:
    logger.info("Executing architect node")
    messages = state["messages"]
    llm = create_llm(state["context"]["model_id"])
    try:
        previous_validation = state.get("previous_validation", "")
        previous_score = state.get("previous_score", 0)

        prompt = f"""You are an AWS Solutions Architect. Design the best AWS architecture for the request and answer in diagram-as-code YAML.

        Requirements: {messages[-1].content}

        Previous validation: {previous_validation}
        Previous score: {previous_score}

        Use the previous validation to improve missing components and unnatural connections.

        Response example:
        <DIAGRAM>
        {diagram_as_code_example}
        </DIAGRAM>

        Explanation:
        [Write the architecture explanation here]
        """

        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content

        yaml_content = extract_yaml(content)
        if not check_warn_messages(yaml_content):
            raise ValueError("Invalid YAML generated")

        explanation_match = re.search(r"Explanation:(.*?)$", content, re.DOTALL | re.IGNORECASE)
        explanation = explanation_match.group(1).strip() if explanation_match else ""

        state["yaml_content"] = yaml_content
        state["architecture_explanation"] = explanation
        state["current_node"] = "Architect"
        state["next_node"] = "Diagram"

        logger.info("Architect node execution successful")
        return state
    except Exception as e:
        logger.error(f"Architect node execution failed: {str(e)}")
        state["next_node"] = "FINISH"
        return state


def diagram_node(state: State) -> State:
    logger.info("Executing diagram node")
    try:
        yaml_content = state["yaml_content"]
        diagram_result = generate_diagram(yaml_content)

        if diagram_result["success"]:
            state["diagram_generated"] = True
            state["diagram_feedback"] = diagram_result["feedback"]
            logger.info(
                f"Diagram node execution successful: {diagram_result['message']}"
            )
        else:
            state["diagram_generated"] = False
            state["diagram_feedback"] = None
            logger.error(f"Diagram generation failed: {diagram_result['message']}")

        state["current_node"] = "Diagram"
        state["next_node"] = "Validate"
        return state
    except Exception as e:
        logger.error(f"Diagram node execution failed: {str(e)}")
        state["next_node"] = "FINISH"
        return state


def validate_node(state: State) -> State:
    logger.info("Executing validate node")
    try:
        llm = create_llm(state["context"]["model_id"])
        with open("output.png", "rb") as image_file:
            image_data = image_file.read()
            image_base64 = base64.b64encode(image_data).decode("utf-8")

        diagram_feedback = state.get("diagram_feedback", {})
        warnings = "\n".join(diagram_feedback.get("warnings", []))
        errors = "\n".join(diagram_feedback.get("errors", []))
        suggestions = "\n".join(diagram_feedback.get("suggestions", []))

        prompt = f"""Validate the AWS architecture represented by the YAML and generated diagram (output.png). Use the explanation as the reference.
        Check whether connections are natural and whether the architecture meets the requirements. Deduct 5 points for each unnatural connection and 10 points for each element mentioned in the explanation but missing from the diagram.
        
        YAML:
        {state['yaml_content']}
        
        Explanation:
        {state['architecture_explanation']}

        Diagram generation warnings:
        {warnings}

        Diagram generation errors:
        {errors}

        Diagram improvement suggestions:
        {suggestions}

        Evaluate the architecture and identify improvements. Include the validation result and score.

        Response format:
        <ValidationResult>[validation result]</ValidationResult>

        <Score>[0-100]</Score>
        """
        response = llm.invoke(
            [
                HumanMessage(
                    content=[
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_base64}"
                            },
                        },
                    ]
                )
            ]
        )
        validation_result = response.content

        score_match = re.search(r"<Score>(\d+)</Score>", validation_result, re.IGNORECASE)
        score = float(score_match.group(1)) if score_match else 0

        state["validation_result"] = validation_result
        state["architecture_score"] = score
        state["current_node"] = "Validate"
        state["next_node"] = "supervisor"
        logger.info(f"Validate node execution successful: {validation_result}")
        return state
    except Exception as e:
        logger.error(f"Validate node execution failed: {str(e)}")
        state["next_node"] = "FINISH"
        return state


def supervisor_node(state: State) -> State:
    logger.info(f"Executing supervisor node. Current state: {state['current_node']}")
    try:
        state["iteration_count"] = state.get("iteration_count", 0) + 1
        logger.info(f"Iteration count: {state['iteration_count']}")

        if state["iteration_count"] >= 25:
            logger.warning("Reached maximum iteration count. Finishing.")
            state["next_node"] = "FINISH"
        elif state["current_node"] == "supervisor" and not state["yaml_content"]:
            logger.info("Initial state or no YAML content. Moving to Architect node.")
            state["next_node"] = "Architect"
        elif state["current_node"] == "Architect" and state["yaml_content"]:
            logger.info("YAML content generated. Moving to Diagram node.")
            state["next_node"] = "Diagram"
        elif state["current_node"] == "Diagram" and state["diagram_generated"]:
            logger.info("Diagram generated. Moving to Validate node.")
            state["next_node"] = "Validate"
        elif state["current_node"] == "Validate" and state["validation_result"]:
            if state["architecture_score"] >= 90:
                logger.info("Architecture is satisfactory and validated. Finishing.")
                state["next_node"] = "FINISH"
            else:
                logger.info("Starting new architecture design cycle.")
                state["previous_validation"] = state["validation_result"]
                state["previous_score"] = state["architecture_score"]
                state["yaml_content"] = ""
                state["diagram_generated"] = False
                state["validation_result"] = ""
                state["architecture_score"] = 0
                state["next_node"] = "Architect"
        else:
            logger.warning(
                f"Unexpected state: {state['current_node']}. Moving to Architect node."
            )
            state["next_node"] = "Architect"

        logger.info(f"Supervisor decision: Next node is {state['next_node']}")
        return state
    except Exception as e:
        logger.error(f"Supervisor node execution failed: {str(e)}")
        state["next_node"] = "FINISH"
        return state


def create_workflow(model_id: str):
    workflow = StateGraph(State)

    workflow.add_node("Architect", architect_node)
    workflow.add_node("Diagram", diagram_node)
    workflow.add_node("Validate", validate_node)
    workflow.add_node("supervisor", supervisor_node)

    members = ["Architect", "Diagram", "Validate"]

    for member in members:
        workflow.add_edge(member, "supervisor")

    conditional_map = {k: k for k in members}
    conditional_map["FINISH"] = END
    workflow.add_conditional_edges(
        "supervisor", lambda state: state["next_node"], conditional_map
    )

    workflow.set_entry_point("supervisor")

    graph = workflow.compile()

    os.makedirs("assets", exist_ok=True)
    png_data = graph.get_graph(xray=True).draw_mermaid_png()
    with open("assets/graph.png", "wb") as f:
        f.write(png_data)

    return graph


def run_aws_architect_agent(
    question: str, model_id: str
) -> Generator[Dict, None, None]:
    logger.info(f"Running AWS Architect Agent with question: {question}")

    graph = create_workflow(model_id)
    initial_state = State(
        messages=[
            SystemMessage(
                content="You are an AWS Solutions Architect. Design the best AWS architecture for the customer's question and answer in diagram-as-code YAML. Wrap the YAML diagram in <DIAGRAM> and </DIAGRAM> without Markdown."
            ),
            HumanMessage(content=question),
        ],
        yaml_content="",
        bedrock_response="",
        context={"model_id": model_id},
        current_node="supervisor",
        next_node="supervisor",
        architecture_explanation="",
        diagram_generated=False,
        validation_result="",
        iteration_count=0,
        architecture_score=0,
    )

    try:
        for output in graph.stream(initial_state):
            logger.debug(f"Graph output: {output}")

            if isinstance(output, dict) and len(output) == 1:
                node_name, state = next(iter(output.items()))
            else:
                raise ValueError(f"Unexpected output format: {output}")

            current_node = state.get("current_node")
            if current_node is None:
                raise ValueError(f"current_node not found in state: {state}")

            logger.info(f"Current node: {current_node}")

            if current_node == "Architect":
                yield {
                    "yaml_content": state["yaml_content"],
                    "architecture_explanation": state["architecture_explanation"],
                }
            elif current_node == "Diagram":
                yield {"diagram_generated": state["diagram_generated"]}
            elif current_node == "Validate":
                yield {"validation_result": state["validation_result"]}
            elif current_node == "supervisor":
                next_node = state["next_node"]
                logger.info(f"Supervisor decision: Next node is {next_node}")

            if state["next_node"] == "FINISH":
                logger.info("Workflow completed")
                break

    except Exception as e:
        logger.error(f"Error occurred in run_aws_architect_agent: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        yield {"error": str(e), "traceback": traceback.format_exc()}
