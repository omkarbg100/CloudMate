import streamlit as st

from architect import run_aws_architect_agent

st.set_page_config(page_title="AWS Architecture Assistant", page_icon="🏗️", layout="wide")
st.title("AWS Architecture Assistant")

models = ["gemini-2.0-flash", "llama-3.3-70b-versatile"]
selected_model = st.sidebar.selectbox("Model hint", models)

examples = {
    "Web application": "Design a cost-conscious, highly available web application with a database and static assets.",
    "Microservices": "Design a container-based microservices architecture with service communication and load balancing.",
    "Data pipeline": "Design a scalable real-time data ingestion, processing, and analytics pipeline.",
    "Serverless backend": "Design a serverless backend with authentication, APIs, and persistent storage.",
    "Disaster recovery": "Design a disaster recovery architecture with clear RPO and RTO targets.",
}

st.sidebar.caption("The architecture agent uses the configured Gemini or Groq gateway. No AWS account connection is required.")
for label, value in examples.items():
    if st.sidebar.button(label):
        st.session_state["question"] = value

question = st.text_area("Describe the AWS architecture you need", value=st.session_state.get("question", ""), height=160)

if st.button("Generate architecture"):
    if not question.strip():
        st.warning("Enter architecture requirements first.")
    else:
        try:
            with st.spinner("Generating architecture..."):
                for status in run_aws_architect_agent(question, selected_model):
                    if "error" in status:
                        st.error(status["error"])
                        break
                    if "yaml_content" in status:
                        st.subheader("Architecture YAML")
                        st.code(status["yaml_content"], language="yaml")
                    if "architecture_explanation" in status:
                        st.subheader("Explanation")
                        st.write(status["architecture_explanation"])
                    if status.get("validation_result"):
                        st.subheader("Validation")
                        st.write(status["validation_result"])
        except Exception as exc:
            st.error(str(exc))
