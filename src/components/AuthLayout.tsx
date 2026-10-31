import type { ReactNode } from 'react'
import BrandLogo from './BrandLogo'

interface AuthLayoutProps {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

function AuthLayout({ eyebrow, title, description, children }: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <section className="auth-intro" aria-label="Giới thiệu StudyNest">
        <BrandLogo />
        <div className="auth-intro__content">
          <p className="auth-intro__eyebrow">HỌC TẬP THÔNG MINH HƠN</p>
          <h1>Một nơi để luyện tập, theo dõi và tiến bộ mỗi ngày.</h1>
          <p>Làm đề trắc nghiệm, lưu kết quả và xây dựng lộ trình học phù hợp với bạn.</p>
        </div>
        <div className="auth-intro__stats" aria-label="Điểm nổi bật">
          <div><strong>01</strong><span>Làm đề trực tuyến</span></div>
          <div><strong>02</strong><span>Theo dõi tiến độ</span></div>
          <div><strong>03</strong><span>Ôn tập hiệu quả</span></div>
        </div>
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
        <p className="auth-footer">© {new Date().getFullYear()} StudyNest</p>
      </section>
    </main>
  )
}

export default AuthLayout
