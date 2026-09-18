import { ZodError } from "zod";

/**
 * Validate `req.body` against a Zod schema and replace it with the parsed value.
 * Throws a 400 error with a readable message on failure.
 * @param {import("zod").ZodTypeAny} schema
 */
export function validateBody(schema) {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body ?? {});
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues
          .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
          .join("; ");
        const err = new Error(message);
        err.status = 400;
        return next(err);
      }
      next(error);
    }
  };
}
