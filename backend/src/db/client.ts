import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Bindings = {
  DB: D1Database;
  STORAGE: R2Bucket;
  ENVIRONMENT?: string;
  DEFAULT_LLM_API_BASE?: string;
  DEFAULT_LLM_MODEL?: string;
  DEFAULT_IMAGE_MODEL?: string;
};

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
