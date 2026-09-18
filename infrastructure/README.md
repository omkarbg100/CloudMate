# Infrastructure

This folder contains the infrastructure generation layer for DeployMate.

Current status:

- No AWS resources are created by this scaffold.
- The folder must not hard-code one fixed architecture.
- The AI-generated deployment plan is the source of truth for create/reuse/modify decisions.
- Generators and execution utilities convert validated plans into deployable infrastructure.
- Execution uses typed tool actions in `ai-engine/tools/aws.py`; there is no fixed managed-runtime dependency.

Subfolders:

- `specs/`: JSON schemas for AI-generated deployment specifications.
- `generators/`: generator implementations/templates such as CDK TypeScript.
- `policies/`: policy rules used before AWS execution.
- `execution/`: typed AWS execution utility contracts.
- `cdk/`: future CDK app shell; it should consume generated specs, not embed product assumptions.
- `docker/`: container build assets.

Execution flow:

1. Architecture Agent emits resource decisions.
2. Deployment Agent emits a deployment specification.
3. Policy validation node (`_policy_validation` in `graphs/nodes.py`) validates the actions.
4. Human approval is recorded for risky actions.
5. Generator produces CDK/Terraform/SDK execution inputs.
6. AWS executor assumes the user's IAM role with STS and executes typed actions.
