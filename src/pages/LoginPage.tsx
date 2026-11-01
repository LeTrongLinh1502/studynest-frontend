import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/httpClient'
import { useAuth } from '../auth/useAuth'
import AuthMockupLayout from '../components/AuthMockupLayout'
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
  const [showPasswordHelp, setShowPasswordHelp] = useState(false)
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
    <AuthMockupLayout
      variant="login"
      title="Đăng nhập"
      description="Chào mừng bạn quay trở lại StudyNest!"
    >
      {registeredEmail && (
        <div className="alert alert--success" role="status">
          Đăng ký thành công. Hãy đăng nhập bằng tài khoản {registeredEmail}.
        </div>
      )}

      {submitError && <div className="alert alert--error" role="alert">{submitError}</div>}

      {showPasswordHelp && <div className="alert alert--error" role="status">Chức năng đặt lại mật khẩu chưa có trong phiên bản này.</div>}

      <form className="auth-form auth-form--login" onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="Nhập địa chỉ email của bạn"
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
          maxLength={72}
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
          required
        />

        <button className="auth-mockup__forgot" type="button" onClick={() => setShowPasswordHelp((current) => !current)}>Quên mật khẩu?</button>

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập...' : <>Đăng nhập <span aria-hidden="true">→</span></>}
        </button>
      </form>

      <div className="auth-mockup__divider"><span>Hoặc</span></div>
      <Link className="auth-mockup__secondary-button" to="/signup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2z" /></svg> Tạo tài khoản</Link>
    </AuthMockupLayout>
  )
}

export default LoginPage
