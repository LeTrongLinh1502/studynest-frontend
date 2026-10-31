import type { ApiErrorResponse, CsrfResponse, FieldErrors } from '../types/auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

interface ApiErrorOptions {
  status?: number
  code?: string
  fieldErrors?: FieldErrors
}

export class ApiError extends Error {
  status: number
  code: string
  fieldErrors: FieldErrors

  constructor(message: string, { status = 0, code = 'UNKNOWN_ERROR', fieldErrors = {} }: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json()

  const text = await response.text()
  return text ? { message: text } : null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response

  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body) headers.set('Content-Type', 'application/json')

  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers,
    })
  } catch {
    throw new ApiError('Không thể kết nối tới máy chủ. Vui lòng kiểm tra backend đang chạy.', {
      code: 'NETWORK_ERROR',
    })
  }

  const data = await parseResponse(response)

  if (!response.ok) {
    const errorData: ApiErrorResponse = data !== null && typeof data === 'object' ? data as ApiErrorResponse : {}
    throw new ApiError(errorData.message ?? 'Yêu cầu không thành công.', {
      status: response.status,
      code: errorData.code ?? 'REQUEST_FAILED',
      fieldErrors: errorData.fieldErrors ?? {},
    })
  }

  return data as T
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path)
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const csrf = await request<CsrfResponse>('/api/auth/csrf')

  return request<T>(path, {
    method: 'POST',
    headers: { [csrf.headerName]: csrf.token },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
