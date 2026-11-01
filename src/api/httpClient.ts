import type { ApiErrorResponse, CsrfResponse, FieldErrors } from '../types/auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

interface ApiErrorOptions { status?: number; code?: string; fieldErrors?: FieldErrors }

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

async function errorFrom(response: Response): Promise<ApiError> {
  let payload: ApiErrorResponse = {}
  try {
    if ((response.headers.get('content-type') ?? '').includes('application/json')) {
      payload = await response.json() as ApiErrorResponse
    }
  } catch { /* A malformed response still becomes a useful API error. */ }
  return new ApiError(payload.message ?? 'Yêu cầu không thành công.', {
    status: response.status, code: payload.code ?? 'REQUEST_FAILED', fieldErrors: payload.fieldErrors ?? {},
  })
}

async function send(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { credentials: 'include', ...options, headers })
  } catch {
    throw new ApiError('Không thể kết nối máy chủ. Vui lòng kiểm tra backend đang chạy.', { code: 'NETWORK_ERROR' })
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await send(path, options)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

async function mutate<T>(path: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  const csrf = await request<CsrfResponse>('/api/auth/csrf')
  return request<T>(path, {
    method,
    headers: { [csrf.headerName]: csrf.token },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  })
}

export const get = <T>(path: string) => request<T>(path)
export const post = <T>(path: string, body?: unknown) => mutate<T>(path, 'POST', body)
export const put = <T>(path: string, body?: unknown) => mutate<T>(path, 'PUT', body)
export const patch = <T>(path: string, body?: unknown) => mutate<T>(path, 'PATCH', body)
export const remove = (path: string) => mutate<void>(path, 'DELETE')
export async function getFileBlob(path: string): Promise<Blob> {
  const response = await send(path, { headers: { Accept: 'application/pdf' } })
  return response.blob()
}
export async function upload<T>(path: string, data: FormData, onProgress?: (percent: number) => void): Promise<T> {
  const csrf = await request<CsrfResponse>('/api/auth/csrf')
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}${path}`)
    xhr.withCredentials = true
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader(csrf.headerName, csrf.token)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100))
    }
    xhr.onerror = () => reject(new ApiError('Không thể kết nối máy chủ. Vui lòng thử lại.', { code: 'NETWORK_ERROR' }))
    xhr.onload = () => {
      let payload: ApiErrorResponse | T | null = null
      try { payload = xhr.responseText ? JSON.parse(xhr.responseText) as ApiErrorResponse | T : null }
      catch { /* Unexpected response is reported below. */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (payload === null) reject(new ApiError('Máy chủ trả về dữ liệu không hợp lệ.'))
        else resolve(payload as T)
      } else {
        const detail = payload as ApiErrorResponse | null
        reject(new ApiError(detail?.message ?? 'Tải file không thành công.', {
          status: xhr.status, code: detail?.code ?? 'UPLOAD_FAILED', fieldErrors: detail?.fieldErrors ?? {},
        }))
      }
    }
    xhr.send(data)
  })
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const response = await send(path, { headers: { Accept: '*/*' } })
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
