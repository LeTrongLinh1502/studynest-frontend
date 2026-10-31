import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import BrandLogo from '../components/BrandLogo'

function DashboardPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (!user) return null

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <BrandLogo compact />
        <button className="secondary-button" type="button" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
        </button>
      </header>

      <section className="dashboard-content">
        <p className="dashboard-eyebrow">TÀI KHOẢN ĐÃ KẾT NỐI</p>
        <h1>Xin chào, {user.fullName}!</h1>
        <p>Luồng đăng ký, đăng nhập và kiểm tra phiên đã hoạt động.</p>

        <div className="profile-card">
          <div className="profile-avatar" aria-hidden="true">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div><span>Họ và tên</span><strong>{user.fullName}</strong></div>
          <div><span>Email</span><strong>{user.email}</strong></div>
          <div><span>Vai trò</span><strong>{user.role}</strong></div>
        </div>

        <div className="coming-soon">
          <span>Tiếp theo</span>
          <h2>Không gian học tập đang được xây dựng</h2>
          <p>Các chức năng làm đề, tải đề và xem kết quả sẽ được thêm tại đây.</p>
        </div>
      </section>
    </main>
  )
}

export default DashboardPage
