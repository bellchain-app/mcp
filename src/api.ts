/**
 * Zugriff auf die REST-Schnittstelle von Bellchain (`/v1`, docs: developers/api), angemeldet mit dem API-Schlüssel des
 * Kunden. Der Server spricht nur mit dieser einen Adresse: `https://api.bellchain.app/v1`, für Tests per
 * `BELLCHAIN_API_URL` einstellbar (https, http nur für den eigenen Rechner). Der Schlüssel geht nur in den Kopf
 * `Authorization`, nie in eine Adresse, ein Protokoll oder eine Antwort an den Assistenten.
 */
import { VERSION } from './values.ts';

export const DEFAULT_API_URL = 'https://api.bellchain.app/v1';

/** `bc_` und 32 Zeichen, wie die Schlüssel aus den Einstellungen. */
const KEY = /^bc_[A-Za-z0-9_-]{32}$/;
/** Gewöhnliche Anfragen; ein Replay über ein Jahr in Minuten-Kerzen darf länger rechnen. */
const TIMEOUT_MS = 30_000;
export const REPLAY_TIMEOUT_MS = 180_000;

/** Ein Fehler der Schnittstelle oder der Verbindung (`status` 0), mit dem Satz für Menschen aus der Antwort. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** Weitere Felder der Fehlerantwort, etwa `problems` beim Aktivieren oder `issues` einer ungültigen Chain. */
  readonly details: Readonly<Record<string, unknown>>;
  readonly retryAfter?: number;

  constructor(status: number, code: string, message: string, details: Readonly<Record<string, unknown>> = {}, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    if (retryAfter !== undefined) this.retryAfter = retryAfter;
  }
}

/** Was mit dem Schlüssel nicht stimmt, als Satz für den Assistenten; `undefined`, wenn er passt. */
export function keyProblem(key: string | undefined): string | undefined {
  if (!key) return 'BELLCHAIN_API_KEY is not set. Create an API key in Bellchain under Settings → API (Trader plan) and put it into the env block of this MCP server in your assistant’s configuration.';
  if (!KEY.test(key)) return 'BELLCHAIN_API_KEY does not look like a Bellchain API key (bc_ followed by 32 characters). Copy it again from Settings → API.';
  return undefined;
}

/**
 * Die Adresse der Schnittstelle aus `BELLCHAIN_API_URL`, ohne Schrägstrich am Ende. Nur https, außer für localhost,
 * 127.0.0.1 und [::1] (Test-Server); sonst ein Fehler, damit der Schlüssel nie unverschlüsselt über das Netz geht.
 */
export function apiUrlFrom(value: string | undefined): string {
  if (value === undefined || value.trim() === '') return DEFAULT_API_URL;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`BELLCHAIN_API_URL is not a URL: ${value}`);
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw new Error('BELLCHAIN_API_URL must use https (http only for localhost).');
  if (url.username || url.password || url.search || url.hash) throw new Error('BELLCHAIN_API_URL must not contain credentials, a query or a fragment.');
  return url.toString().replace(/\/+$/, '');
}

export interface BellchainApiOptions {
  readonly baseUrl: string;
  readonly apiKey: string | undefined;
  /** Für Tests; sonst das `fetch` von Node. */
  readonly fetch?: typeof fetch;
}

type Query = Readonly<Record<string, string | number | undefined>>;

export class BellchainApi {
  readonly baseUrl: string;
  readonly #key: string | undefined;
  readonly #fetch: typeof fetch;

  constructor(options: BellchainApiOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.#key = options.apiKey;
    this.#fetch = options.fetch ?? fetch;
  }

  get(path: string, query: Query = {}, signal?: AbortSignal): Promise<unknown> {
    return this.#request('GET', path, query, undefined, signal, TIMEOUT_MS);
  }

  post(path: string, body: unknown = {}, signal?: AbortSignal, timeoutMs = TIMEOUT_MS): Promise<unknown> {
    return this.#request('POST', path, {}, body, signal, timeoutMs);
  }

  patch(path: string, body: unknown, query: Query = {}, signal?: AbortSignal): Promise<unknown> {
    return this.#request('PATCH', path, query, body, signal, TIMEOUT_MS);
  }

  delete(path: string, query: Query = {}, signal?: AbortSignal): Promise<unknown> {
    return this.#request('DELETE', path, query, undefined, signal, TIMEOUT_MS);
  }

  async #request(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, query: Query, body: unknown, signal: AbortSignal | undefined, timeoutMs: number): Promise<unknown> {
    const problem = keyProblem(this.#key);
    if (problem) throw new ApiError(401, 'no_key', problem);
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    const timeout = AbortSignal.timeout(timeoutMs);
    let response: Response;
    try {
      response = await this.#fetch(url, {
        method,
        headers: {
          authorization: `Bearer ${this.#key}`,
          accept: 'application/json',
          'user-agent': `bellchain-mcp/${VERSION}`,
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        redirect: 'error',
      });
    } catch (error) {
      if (timeout.aborted) throw new ApiError(0, 'timeout', `Bellchain did not answer within ${Math.round(timeoutMs / 1000)} seconds. Try again in a moment.`);
      if (signal?.aborted) throw new ApiError(0, 'cancelled', 'The request was cancelled.');
      // Ohne Einzelheiten aus dem Fehler: Sie könnten die Adresse samt Pfad enthalten, mehr aber nicht.
      throw new ApiError(0, 'unreachable', `Could not reach the Bellchain API at ${this.baseUrl} (${error instanceof Error ? error.name : 'network error'}). Check the internet connection.`);
    }
    const text = await response.text();
    let data: unknown;
    try {
      data = text === '' ? {} : JSON.parse(text);
    } catch {
      data = undefined;
    }
    if (response.ok && data !== undefined) return data;
    const record = typeof data === 'object' && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
    const { error: code, message, ...details } = record;
    const retry = Number(response.headers.get('retry-after'));
    throw new ApiError(
      response.status,
      typeof code === 'string' ? code : `http_${response.status}`,
      typeof message === 'string' && message !== '' ? message : `Bellchain answered with HTTP ${response.status}.`,
      details,
      Number.isFinite(retry) && retry > 0 ? retry : undefined,
    );
  }
}
