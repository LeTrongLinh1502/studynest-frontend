const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN_ERROR', fieldErrors = {} } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

async function parseResponse(response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json()

  const text = await response.text()
  return text ? { message: text } : null
}

async function request(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError('Không thể kết nối tới máy chủ. Vui lòng kiểm tra backend đang chạy.', {
      code: 'NETWORK_ERROR',
    })
  }

  const data = await parseResponse(response)

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'Yêu cầu không thành công.', {
      status: response.status,
      code: data?.code ?? 'REQUEST_FAILED',
      fieldErrors: data?.fieldErrors ?? {},
    })
  }

  return data
}

export function get(path) {
  return request(path)
}

export async function post(path, body) {
  const csrf = await request('/api/auth/csrf')

  return request(path, {
    method: 'POST',
    headers: { [csrf.headerName]: csrf.token },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
