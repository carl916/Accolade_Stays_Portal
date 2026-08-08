import "server-only";

import { randomUUID } from "crypto";
import { buildCanonicalQuery, signSmoobuRequest } from "./signing";

export const smoobuApiBaseUrl = "https://login.smoobu.com";

type QueryValue = string | number | boolean | null | undefined;

type SmoobuClientOptions = {
  apiKey?: string;
  apiSecret?: string;
  fetchImpl?: typeof fetch;
  nonceFactory?: () => string;
  timestampFactory?: () => string;
};

type SmoobuRequestOptions = {
  query?: Record<string, QueryValue>;
  body?: unknown;
};

export type SmoobuApartment = {
  id: number;
  name: string;
};

export type SmoobuReservation = Record<string, unknown>;

export type SmoobuMessage = {
  id: number;
  subject?: string | null;
  message?: string | null;
  messageHtml?: string | null;
  htmlMessage?: string | null;
  type: 1 | 2 | number;
};

export type SmoobuPaginatedReservations = {
  page_count?: number;
  page_size?: number;
  total_items?: number;
  page?: number;
  bookings?: SmoobuReservation[];
};

export type SmoobuPaginatedMessages = {
  page_count?: number;
  page_size?: number;
  total_items?: number;
  page?: number;
  messages?: SmoobuMessage[];
};

export type SmoobuRateLimit = {
  limit?: string | null;
  remaining?: string | null;
  reset?: string | null;
};

export type SmoobuResponse<T> = {
  data: T;
  rateLimit: SmoobuRateLimit;
};

export class SmoobuConfigurationError extends Error {
  constructor() {
    super("Smoobu API credentials are not configured.");
    this.name = "SmoobuConfigurationError";
  }
}

export class SmoobuRequestError extends Error {
  status: number;
  responseBody: string;

  constructor(status: number, responseBody: string) {
    super(`Smoobu request failed with status ${status}.`);
    this.name = "SmoobuRequestError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export function getSmoobuCredentials() {
  const apiKey = process.env.SMOOBU_API_KEY;
  const apiSecret = process.env.SMOOBU_API_SECRET;

  if (!apiKey || !apiSecret) {
    return null;
  }

  return { apiKey, apiSecret };
}

function getRateLimit(headers: Headers): SmoobuRateLimit {
  return {
    limit: headers.get("x-ratelimit-limit") ?? headers.get("x-rate-limit-limit"),
    remaining: headers.get("x-ratelimit-remaining") ?? headers.get("x-rate-limit-remaining"),
    reset: headers.get("x-ratelimit-reset") ?? headers.get("x-rate-limit-reset")
  };
}

function buildUrl(path: string, query: Record<string, QueryValue> = {}) {
  const canonicalQuery = buildCanonicalQuery(query);
  return `${smoobuApiBaseUrl}${path}${canonicalQuery ? `?${canonicalQuery}` : ""}`;
}

export function createSmoobuClient(options: SmoobuClientOptions = {}) {
  const credentials =
    options.apiKey && options.apiSecret ? { apiKey: options.apiKey, apiSecret: options.apiSecret } : getSmoobuCredentials();

  if (!credentials) {
    throw new SmoobuConfigurationError();
  }
  const resolvedCredentials = credentials;

  const fetchImpl = options.fetchImpl ?? fetch;
  const nonceFactory = options.nonceFactory ?? randomUUID;
  const timestampFactory = options.timestampFactory ?? (() => new Date().toISOString());

  async function request<T>(method: string, path: string, requestOptions: SmoobuRequestOptions = {}) {
    const body = requestOptions.body ? JSON.stringify(requestOptions.body) : "";
    const timestamp = timestampFactory();
    const nonce = nonceFactory();
    const signature = signSmoobuRequest({
      method,
      path,
      query: requestOptions.query,
      timestamp,
      nonce,
      body,
      apiKey: resolvedCredentials.apiKey,
      apiSecret: resolvedCredentials.apiSecret
    });

    const response = await fetchImpl(buildUrl(path, requestOptions.query), {
      method,
      headers: {
        "X-API-Key": resolvedCredentials.apiKey,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      ...(body ? { body } : {})
    });
    const responseText = await response.text();

    if (!response.ok) {
      throw new SmoobuRequestError(response.status, responseText);
    }

    return {
      data: responseText ? (JSON.parse(responseText) as T) : ({} as T),
      rateLimit: getRateLimit(response.headers)
    } satisfies SmoobuResponse<T>;
  }

  return {
    request,
    async getApartments() {
      const response = await request<{ apartments?: SmoobuApartment[] }>("GET", "/api/apartments");
      return response.data.apartments ?? [];
    },
    async getReservations(query: Record<string, QueryValue>) {
      return request<SmoobuPaginatedReservations>("GET", "/api/reservations", { query });
    },
    async getReservation(reservationId: number | string) {
      return request<SmoobuReservation>("GET", `/api/reservations/${reservationId}`);
    },
    async getMessages(reservationId: number | string, page = 1, onlyRelatedToGuest = true) {
      return request<SmoobuPaginatedMessages>("GET", `/api/reservations/${reservationId}/messages`, {
        query: { page, onlyRelatedToGuest }
      });
    }
  };
}

export type SmoobuClient = ReturnType<typeof createSmoobuClient>;
