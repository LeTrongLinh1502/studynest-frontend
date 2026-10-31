import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/httpClient'
import { useAuth } from '../auth/useAuth'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import type { FieldErrors, SignupRequest } from '../types/auth'

type SignupForm = SignupRequest & { confirmPassword: string }

const initialForm: SignupForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function SignupPage() {
  const [form, setForm] = useState(initialForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

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

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (form.password.length < 8) errors.password = 'Mật khẩu cần có ít nhất 8 ký tự.'
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận chưa khớp.'
    }
    return errors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clientErrors = validate()

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    setFieldErrors({})

    try {
      await signup({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      navigate('/login', {
        replace: true,
        state: { registeredEmail: form.email.trim() },
      })
    } catch (error) {
      setFieldErrors(error instanceof ApiError ? error.fieldErrors : {})
      setSubmitError(error instanceof Error ? error.message : 'Đăng ký không thành công.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Bắt đầu miễn phí"
      title="Tạo tài khoản StudyNest"
      description="Tạo tài khoản để lưu kết quả và theo dõi tiến độ học tập."
    >
      {submitError && <div className="alert alert--error" role="alert">{submitError}</div>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormField
          id="fullName"
          name="fullName"
          type="text"
          label="Họ và tên"
          placeholder="Nguyễn Văn An"
          autoComplete="name"
          value={form.fullName}
          onChange={handleChange}
          error={fieldErrors.fullName}
          required
        />
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
        <div className="form-row">
          <FormField
            id="password"
            name="password"
            type="password"
            label="Mật khẩu"
            placeholder="Tối thiểu 8 ký tự"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            error={fieldErrors.password}
            required
          />
          <FormField
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Xác nhận mật khẩu"
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            required
          />
        </div>

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
        </button>
      </form>

      <p className="auth-switch">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </AuthLayout>
  )
}

export default SignupPage
