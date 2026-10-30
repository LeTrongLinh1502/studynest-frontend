function FormField({ label, error, ...inputProps }) {
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
