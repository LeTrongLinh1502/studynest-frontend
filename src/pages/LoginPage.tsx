import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/httpClient'
import { useAuth } from '../auth/useAuth'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import type { FieldErrors, LoginRequest } from '../types/auth'

interface LoginLocationState {
  registeredEmail?: string
  from?: { pathname: string }
}

function LoginPage() {
  const [form, setForm] = useState<LoginRequest>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LoginLocationState | null
  const registeredEmail = locationState?.registeredEmail
  const destination = locationState?.from?.pathname ?? '/dashboard'

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.currentTarget
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
    setSubmitError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')
    setFieldErrors({})

    try {
      await login(form)
      navigate(destination, { replace: true })
    } catch (error) {
      setFieldErrors(error instanceof ApiError ? error.fieldErrors : {})
      setSubmitError(error instanceof Error ? error.message : 'Đăng nhập không thành công.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Chào mừng trở lại"
      title="Đăng nhập vào StudyNest"
      description="Tiếp tục hành trình học tập của bạn."
    >
      {registeredEmail && (
        <div className="alert alert--success" role="status">
          Đăng ký thành công. Hãy đăng nhập bằng tài khoản {registeredEmail}.
        </div>
      )}

      {submitError && <div className="alert alert--error" role="alert">{submitError}</div>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="ban@example.com"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={fieldErrors.email}
          required
        />
        <FormField
          id="password"
          name="password"
          type="password"
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
          required
        />

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <p className="auth-switch">
        Chưa có tài khoản? <Link to="/signup">Đăng ký ngay</Link>
      </p>
    </AuthLayout>
  )
}

export default LoginPage
