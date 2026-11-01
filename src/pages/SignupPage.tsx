import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/httpClient'
import { useAuth } from '../auth/useAuth'
import AuthMockupLayout from '../components/AuthMockupLayout'
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
  const [acceptedTerms, setAcceptedTerms] = useState(false)
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
    if (form.password.length > 72) errors.password = 'Mật khẩu tối đa 72 ký tự.'
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
    if (!acceptedTerms) {
      setSubmitError('Vui lòng đồng ý với điều khoản trước khi đăng ký.')
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
    <AuthMockupLayout
      variant="signup"
      title="Tạo tài khoản"
      description="Tham gia StudyNest để lưu tiến trình học tập và khám phá nhiều cơ hội mới."
    >
      {submitError && <div className="alert alert--error" role="alert">{submitError}</div>}

      <form className="auth-form auth-form--signup" onSubmit={handleSubmit} noValidate>
        <FormField
          id="fullName"
          name="fullName"
          type="text"
          label="Họ và tên"
          placeholder="Nhập họ và tên của bạn"
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
          placeholder="Nhập địa chỉ email của bạn"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={fieldErrors.email}
          required
        />
        <div className="auth-mockup__password-field"><FormField
            id="password"
            name="password"
            type="password"
            maxLength={72}
            label="Mật khẩu"
            placeholder="Tạo mật khẩu"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            error={fieldErrors.password}
            required
          /><p className="auth-password-hint">Mật khẩu dài từ 8 đến 72 ký tự.</p></div>
          <FormField
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            maxLength={72}
            label="Xác nhận mật khẩu"
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            required
          />

        <label className="auth-mockup__terms"><input type="checkbox" checked={acceptedTerms} onChange={(event) => { setAcceptedTerms(event.target.checked); setSubmitError('') }} /><span>Tôi đồng ý với <strong>Điều khoản sử dụng</strong> và <strong>Chính sách bảo mật</strong></span></label>

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </button>
      </form>

      <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </AuthMockupLayout>
  )
}

export default SignupPage
