import { createHash, createHmac } from "crypto";

type QueryValue = string | number | boolean | null | undefined;

export function buildCanonicalQuery(query: Record<string, QueryValue> = {}) {
  return Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

export function hashBody(body: string) {
  return createHash("sha256").update(body).digest("hex");
}

export function buildCanonicalRequest(input: {
  method: string;
  path: string;
  query?: Record<string, QueryValue>;
  timestamp: string;
  nonce: string;
  body: string;
  apiKey: string;
}) {
  return [
    input.method.toUpperCase(),
    input.path,
    buildCanonicalQuery(input.query),
    input.timestamp,
    input.nonce,
    hashBody(input.body),
    input.apiKey
  ].join("\n");
}

export function signSmoobuRequest(input: {
  method: string;
  path: string;
  query?: Record<string, QueryValue>;
  timestamp: string;
  nonce: string;
  body?: string;
  apiKey: string;
  apiSecret: string;
}) {
  const canonicalRequest = buildCanonicalRequest({
    method: input.method,
    path: input.path,
    query: input.query,
    timestamp: input.timestamp,
    nonce: input.nonce,
    body: input.body ?? "",
    apiKey: input.apiKey
  });

  return createHmac("sha256", input.apiSecret).update(canonicalRequest).digest("base64");
}
