import { randomUUID } from "node:crypto";

/** Generate a short, prefixed identifier such as `proj_1a2b3c...`. */
export function newId(prefix) {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}
