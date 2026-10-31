import type { InputHTMLAttributes } from 'react'

type FormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  id: string
  label: string
  error?: string
}

function FormField({ label, error, ...inputProps }: FormFieldProps) {
  const errorId = error ? `${inputProps.id}-error` : undefined

  return (
    <div className="form-field">
      <label htmlFor={inputProps.id}>{label}</label>
      <input
        {...inputProps}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={error ? 'input--error' : undefined}
      />
      {error && <span id={errorId} className="field-error">{error}</span>}
    </div>
  )
}

export default FormField
