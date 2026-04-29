import type { ApiClient } from "./client";
import { mockClient } from "./mock/handlers";
import { httpClient } from "./http/handlers";

export const apiMode: "mock" | "real" =
  process.env.NEXT_PUBLIC_API_MODE === "real" ? "real" : "mock";

export const api: ApiClient = apiMode === "real" ? httpClient : mockClient;

export type { ApiClient };
