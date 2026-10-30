import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'

function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const registeredEmail = location.state?.registeredEmail
  const destination = location.state?.from?.pathname ?? '/dashboard'

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setSubmitError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')
    setFieldErrors({})

    try {
      await login(form)
      navigate(destination, { replace: true })
    } catch (error) {
      setFieldErrors(error.fieldErrors ?? {})
      setSubmitError(error.message)
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
