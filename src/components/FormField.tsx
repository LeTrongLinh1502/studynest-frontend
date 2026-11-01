import { useState } from 'react'
import type { InputHTMLAttributes } from 'react'

type FormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  id: string
  label: string
  error?: string
}

function FormField({ label, error, ...inputProps }: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const errorId = error ? `${inputProps.id}-error` : undefined
  const isPassword = inputProps.type === 'password'
  const icon = inputProps.name === 'email'
    ? <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>
    : isPassword
      ? <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" /></>
      : <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2z" /></>

  return (
    <div className="form-field">
      <label htmlFor={inputProps.id}>{label}</label>
      <div className={`form-field__control form-field__control--${inputProps.name || 'text'}`}>
        <svg className="form-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
        <input
          {...inputProps}
          type={isPassword && showPassword ? 'text' : inputProps.type}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={error ? 'input--error' : undefined}
        />
        {isPassword && <button className="form-field__toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`} aria-pressed={showPassword}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.7-6 10-6 10 6 10 6-3.7 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="M3 21 21 3" />}</svg></button>}
      </div>
      {error && <span id={errorId} className="field-error">{error}</span>}
    </div>
  )
}

export default FormField
