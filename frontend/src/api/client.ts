import type { ProblemDetail } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** A failed API call: an HTTP error with the server's problem detail, or a network failure (status 0). */
export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetail | null

  constructor(message: string, status: number, problem: ProblemDetail | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }

  /** No answer from the backend itself: a network failure, or a proxy reporting it down (502/503/504). */
  get isUnreachable(): boolean {
    return this.status === 0 || this.status === 502 || this.status === 503 || this.status === 504
  }
}

async function readProblem(response: Response): Promise<ProblemDetail | null> {
  try {
    const body: unknown = await response.json()
    return body && typeof body === 'object' ? (body as ProblemDetail) : null
  } catch {
    return null
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('Couldn’t reach the CoachPulse server.', 0)
  }

  if (!response.ok) {
    const problem = await readProblem(response)
    throw new ApiError(problem?.detail ?? problem?.title ?? `Request failed (${response.status})`, response.status, problem)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** A sentence for the person using the app, whatever went wrong. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isUnreachable) return 'Couldn’t reach the CoachPulse server. Check your connection and try again.'
    if (error.status === 404) return 'The server doesn’t provide this yet.'
    return error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}

export function isUnreachable(error: unknown): boolean {
  return error instanceof ApiError && error.isUnreachable
}
