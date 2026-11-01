function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-logo${compact ? ' brand-logo--compact' : ''}`}>
      <span className="brand-logo__mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 8.5C12.2 5.5 7.4 5.1 3 6.6v17c4.7-1.3 9.3-.6 13 2.3 3.7-2.9 8.3-3.6 13-2.3v-17c-4.4-1.5-9.2-1.1-13 1.9Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"/>
          <path d="M16 8.5v17.4M6.5 11.1c2.4-.4 4.6-.1 6.5.9m6 0c1.9-1 4.1-1.3 6.5-.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </span>
      <span>StudyNest</span>
    </div>
  )
}

export default BrandLogo
