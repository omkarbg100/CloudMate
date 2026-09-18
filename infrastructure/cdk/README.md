# CDK

CDK implementation is intentionally deferred until the local Phase 1 loop works.

Important:

CDK must consume generated deployment specifications. It must not hard-code one architecture for all projects.

Planned reusable constructs/generator outputs:

- DynamoDB table construct.
- ECR repository create/reuse reference.
- App Runner service construct.
- S3 bucket create/reuse reference.
- Secrets Manager secret reference.
- CloudWatch log/alarm construct.
- Additional service constructs (ECS, Lambda, RDS, ElastiCache, S3) selected by the generated architecture.

Before implementing, review:

- `docs/FOUNDATION_ANALYSIS.md`
- `docs/deployment.md`
- AWS sample repositories for service constructs
