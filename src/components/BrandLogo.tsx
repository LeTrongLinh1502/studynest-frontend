function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-logo${compact ? ' brand-logo--compact' : ''}`}>
      <span className="brand-logo__mark" aria-hidden="true">S</span>
      <span>StudyNest</span>
    </div>
  )
}

export default BrandLogo
