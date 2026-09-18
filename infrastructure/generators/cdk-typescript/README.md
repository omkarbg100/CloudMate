# CDK TypeScript Generator

This generator will convert a validated DeployMate deployment plan into CDK constructs.

Input:

- `infrastructure/specs/deployment-plan.schema.json`
- AI-generated deployment plan
- AWS discovery snapshot
- policy validation result
- human approval record for risky actions

Output:

- CDK stack or construct definitions for the selected resources.
- References to reused resources.
- Explicit modifications for existing resources.
- Executor input for approved AWS actions.

The generator must not assume all projects use the same services. It must read `resourceDecisions` and generate only what the Architecture Agent selected.
