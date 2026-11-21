import type { Json } from "./database.types.ts";

export type JsonObject = { [key: string]: Json | undefined };

export function isJsonObject(value: Json | null | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toJson(value: unknown): Json {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => toJson(item));
  }
  if (typeof value === "object") {
    const result: JsonObject = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = item === undefined ? undefined : toJson(item);
    }
    return result;
  }
  throw new TypeError("Value cannot be represented as database JSON.");
}
