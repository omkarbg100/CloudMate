import { ZodError } from "zod";

/**
 * Validate `req.body` against a Zod schema and replace it with the parsed value.
 * Throws a 400 error with a readable message on failure.
 * @param {import("zod").ZodTypeAny} schema
 */
export function parseWithSchema(schema, value) {
  try {
    return { value: schema.parse(value) };
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");
      const err = new Error(message);
      err.status = 400;
      return { error: err };
    }
    return { error: error };
  }
}

export function validateBody(schema) {
  return (req, _res, next) => {
    const { value, error } = parseWithSchema(schema, req.body ?? {});
    if (error) return next(error);
    req.body = value;
    next();
  };
}

export function validateQuery(schema) {
  return (req, _res, next) => {
    const { value, error } = parseWithSchema(schema, req.query ?? {});
    if (error) return next(error);
    req.query = value;
    next();
  };
}
