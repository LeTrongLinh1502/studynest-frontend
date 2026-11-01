import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import loginMockup from '../interface/09-login-final.png'
import signupMockup from '../interface/10-signup-final.png'

interface AuthMockupLayoutProps {
  variant: 'login' | 'signup'
  title: string
  description: string
  children: ReactNode
}

export default function AuthMockupLayout({ variant, title, description, children }: AuthMockupLayoutProps) {
  const login = variant === 'login'
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  const fitCanvas = viewport.width > 1050
  const scale = Math.min(1, (viewport.width - 24) / 1672, (viewport.height - 24) / 941)

  return <div className={`auth-mockup-viewport${fitCanvas ? ' auth-mockup-viewport--fit' : ''}`}>
    <div className={`auth-mockup auth-mockup--${variant}`} style={fitCanvas ? { width: 1672, height: 941, transform: `scale(${scale})` } : undefined}>
    {login && <header className="auth-mockup__topbar">
      <Link className="auth-mockup__brand-link" to="/login" aria-label="StudyNest"><BrandLogo compact /></Link>
      <div className="auth-mockup__site-links" aria-hidden="true"><span>Trang chủ</span><span>Khóa học</span><span>Lộ trình học</span><span>Tài liệu</span><span>Về chúng tôi</span></div>
      <div className="auth-mockup__top-actions"><svg className="auth-mockup__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg><Link className="auth-mockup__nav-login" to="/login" aria-current="page">Đăng nhập</Link><Link className="auth-mockup__nav-signup" to="/signup">Bắt đầu học</Link></div>
    </header>}
    <main className="auth-mockup__card">
      <aside className="auth-mockup__visual" aria-label={login ? 'Học theo cách của bạn' : 'Bắt đầu hành trình học tập'}>
        <img className="auth-mockup__visual-image" src={login ? loginMockup : signupMockup} alt="" aria-hidden="true" />
        <span className="auth-mockup__sr-only">{login ? 'Học theo cách của bạn. StudyNest đồng hành cùng bạn trên hành trình chinh phục tri thức.' : 'Bắt đầu hành trình học tập. Tri thức hôm nay, một tương lai rộng mở hơn ngày mai.'}</span>
      </aside>
      <section className="auth-mockup__form-side" aria-labelledby="auth-mockup-title">
        <div className="auth-mockup__form-inner">
          {!login && <Link className="auth-mockup__mobile-brand" to="/login" aria-label="StudyNest"><BrandLogo compact /></Link>}
          <header className="auth-mockup__heading"><h1 id="auth-mockup-title">{title}</h1><p>{description}</p></header>
          {children}
        </div>
      </section>
    </main>
    </div>
  </div>
}
