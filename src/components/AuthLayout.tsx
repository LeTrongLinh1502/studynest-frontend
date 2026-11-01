import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo'

interface AuthLayoutProps {
  eyebrow: string
  title: string
  description: string
  variant: 'login' | 'signup'
  children: ReactNode
}

function AuthLayout({ eyebrow, title, description, variant, children }: AuthLayoutProps) {
  return (
    <div className={`auth-screen auth-screen--${variant}`}>
      <header className="auth-site-header"><BrandLogo compact /><nav aria-label="Tài khoản"><Link className={variant === 'login' ? 'auth-site-header__active' : ''} to="/login">Đăng nhập</Link><Link className={variant === 'signup' ? 'auth-site-header__active' : ''} to="/signup">Bắt đầu học</Link></nav></header>
    <main className="auth-page">
      <section className="auth-intro" aria-label="Giới thiệu StudyNest">
        <BrandLogo />
        <div className="auth-intro__content">
          <p className="auth-intro__eyebrow">HỌC TẬP THEO CÁCH CỦA BẠN</p>
          <h1>{variant === 'login' ? <>Học theo <em>cách của bạn</em></> : <>Bắt đầu hành trình <em>học tập</em></>}</h1>
          <p>{variant === 'login' ? 'StudyNest đồng hành cùng bạn qua bài học, đề luyện tập và từng bước tiến bộ.' : 'Tri thức hôm nay, một tương lai rộng mở hơn ngày mai.'}</p>
        </div>
        <div className="auth-art" aria-hidden="true"><span className="auth-art__orbit" /><span className="auth-art__book">▤</span><span className="auth-art__cap">✦</span><span className="auth-art__laptop"><span>StudyNest</span></span><span className="auth-art__plant">✳</span></div>
      </section>

      <section className="auth-form-section">
        <div className="auth-mobile-brand"><BrandLogo compact /></div>
        <div className="auth-card">
          <header className="auth-card__header">
            <p className="auth-card__eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            <p>{description}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
    </div>
  )
}

export default AuthLayout
