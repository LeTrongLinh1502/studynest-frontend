import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import BrandLogo from './BrandLogo'
import type { Role } from '../types/phaseA'

const menus: Record<Role, { to: string; icon: string; label: string }[]> = {
  STUDENT: [
    { to: '/dashboard', icon: 'home', label: 'Tổng quan' },
    { to: '/student/lessons', icon: 'book', label: 'Bài học' },
    { to: '/student/quizzes', icon: 'quiz', label: 'Luyện đề' },
    { to: '/student/results', icon: 'results', label: 'Kết quả luyện tập' },
    { to: '/student/classes', icon: 'class', label: 'Lớp của tôi' },
  ],
  TEACHER: [
    { to: '/dashboard', icon: 'home', label: 'Tổng quan' },
    { to: '/teacher/lessons', icon: 'book', label: 'Bài học' },
    { to: '/teacher/questions', icon: 'question', label: 'Ngân hàng câu hỏi' },
    { to: '/teacher/quizzes', icon: 'quiz', label: 'Bộ đề' },
    { to: '/teacher/classes', icon: 'class', label: 'Lớp học' },
  ],
  ADMIN: [
    { to: '/dashboard', icon: 'home', label: 'Tổng quan' },
    { to: '/admin/catalog', icon: 'book', label: 'Môn & chủ đề' },
    { to: '/admin/teacher-applications', icon: 'class', label: 'Duyệt giáo viên' },
    { to: '/admin/content-reports', icon: 'report', label: 'Báo cáo nội dung' },
    { to: '/admin/audit-events', icon: 'clock', label: 'Nhật ký thao tác' },
  ],
}

const roleLabel: Record<Role, string> = { STUDENT: 'Học sinh', TEACHER: 'Giáo viên', ADMIN: 'Quản trị viên' }

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>,
    book: <><path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1z" /><path d="M12 5v15" /></>,
    quiz: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    results: <><path d="M4 20V12h4v8M10 20V5h4v15M16 20V9h4v11" /></>,
    question: <><circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.1.9-1.7 1.4-1.7 3.2M12 17h.01" /></>,
    class: <><path d="M3 20V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v15zM7 8h4m2 0h4M7 12h4m2 0h4M7 16h10" /></>,
    star: <><path d="m12 2 2.7 6.7L22 11l-7.3 2.3L12 21l-2.7-7.7L2 11l7.3-2.3z" /></>,
    report: <><path d="M12 3 2 21h20L12 3zM12 9v5m0 3h.01" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  }
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export default function WorkspaceLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const accountButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!accountOpen) return
    function handlePointerDown(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountOpen(false)
        accountButtonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [accountOpen])

  useEffect(() => { setAccountOpen(false) }, [location.pathname])

  if (!user) return null
  const takingQuiz = /^\/student\/attempts\/\d+$/.test(location.pathname)
  const viewingResult = user.role === 'STUDENT' && /^\/student\/attempts\/\d+\/result$/.test(location.pathname)
  const currentPage = viewingResult ? menus.STUDENT.find((item) => item.to === '/student/results')
    : menus[user.role].filter((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)).sort((a, b) => b.to.length - a.to.length)[0]
  const searchRoute = user.role === 'STUDENT' ? (currentPage?.to === '/student/quizzes' ? '/student/quizzes' : currentPage?.to === '/student/results' ? '/student/results' : '/student/lessons')
    : user.role === 'TEACHER' ? (currentPage?.to === '/teacher/quizzes' ? '/teacher/quizzes' : '/teacher/lessons') : '/admin/catalog'
  const searchPlaceholder = user.role === 'ADMIN' ? 'Tìm môn học...'
    : user.role === 'TEACHER' ? (searchRoute === '/teacher/quizzes' ? 'Tìm bộ đề...' : 'Tìm bài học...')
      : searchRoute === '/student/results' ? 'Tìm lượt làm, môn học...'
        : searchRoute === '/student/quizzes' ? 'Tìm đề luyện tập...' : 'Tìm bài học...'
  const headerAction = user.role === 'TEACHER' && location.pathname === '/teacher/lessons'
    ? { to: '/teacher/lessons/new', label: 'Tạo bài học', icon: '+' }
    : user.role === 'TEACHER' && location.pathname === '/teacher/quizzes'
      ? { to: '/teacher/quizzes/new', label: 'Tạo đề', icon: '+' }
      : user.role === 'STUDENT' && location.pathname === '/dashboard'
        ? { to: '/student/lessons', label: 'Bài học', icon: '→' }
        : user.role === 'STUDENT' && location.pathname === '/student/results'
          ? { to: '/student/quizzes', label: 'Luyện đề', icon: '→' }
          : user.role === 'TEACHER' && location.pathname === '/dashboard'
            ? { to: '/teacher/lessons/new', label: 'Tạo bài học', icon: '+' }
            : user.role === 'ADMIN' && location.pathname === '/dashboard'
              ? { to: '/admin/catalog', label: 'Môn & chủ đề', icon: '→' }
              : null
  const nameParts = user.fullName.trim().split(/\s+/).filter(Boolean)
  const initials = (nameParts.length > 1 ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}` : nameParts[0]?.[0] ?? 'U').toLocaleUpperCase('vi')

  async function handleLogout() {
    setBusy(true)
    try { await logout() }
    catch { /* AuthContext already clears local user state. */ }
    finally { setBusy(false); navigate('/login', { replace: true }) }
  }

  if (takingQuiz) return <div className="workspace workspace--quiz">
    <header className="quiz-focus-header"><BrandLogo compact /><span>Đáp án được lưu khi bạn chọn</span><Link className="button button--soft" to="/student/quizzes">Danh sách đề</Link></header>
    <main className="quiz-focus-content"><Outlet /></main>
  </div>

  return <div className="workspace">
    <aside className={`workspace-sidebar${open ? ' workspace-sidebar--open' : ''}`}>
      <div className="workspace-brand"><BrandLogo compact /></div>
      <div className="workspace-sidebar__label">KHÔNG GIAN CỦA BẠN</div>
      <nav className="workspace-nav" aria-label="Điều hướng chính">
        {menus[user.role].map((item) => <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} end={item.to === '/dashboard'}
          className={({ isActive }) => `workspace-nav__link${isActive || (viewingResult && item.to === '/student/results') ? ' workspace-nav__link--active' : ''}`}>
          <span aria-hidden="true"><NavIcon name={item.icon} /></span>{item.label}
        </NavLink>)}
      </nav>
      {user.role === 'STUDENT' && <Link className="workspace-sidebar__teacher-link" to="/student/teacher-application">Trở thành giáo viên →</Link>}
      <div className="workspace-sidebar__footer">StudyNest <span>Học theo cách của bạn</span></div>
    </aside>
    {open && <button className="workspace-overlay" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
    <div className="workspace-main">
      <header className="workspace-topbar">
        <button className="workspace-menu-button" type="button" onClick={() => setOpen(true)} aria-label="Mở menu">☰</button>
        <div className="workspace-topbar__title"><span className="workspace-topbar__chevron" aria-hidden="true">›</span><span>{currentPage?.label ?? 'StudyNest'}</span></div>
        <form key={`${searchRoute}-${location.search}`} className="workspace-topbar__search" role="search" onSubmit={(event) => { event.preventDefault(); const query = String(new FormData(event.currentTarget).get('q') ?? '').trim(); navigate(query ? `${searchRoute}?q=${encodeURIComponent(query)}` : searchRoute) }}>
          <svg className="workspace-topbar__search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input name="q" type="search" defaultValue={new URLSearchParams(location.search).get('q') ?? ''} placeholder={searchPlaceholder} aria-label={searchPlaceholder.replace('...', '')} />
          <button type="submit">Tìm</button>
        </form>
        <div className="workspace-topbar__right">
          {headerAction && <Link className="workspace-topbar__action" to={headerAction.to} title={headerAction.label} aria-label={headerAction.label}><span aria-hidden="true">{headerAction.icon}</span><span className="workspace-topbar__action-label">{headerAction.label}</span></Link>}
          <div className="workspace-topbar__separator" aria-hidden="true" />
          <span className={`workspace-role workspace-role--${user.role.toLowerCase()}`}>{roleLabel[user.role]}</span>
          <div className="workspace-account" ref={accountRef}>
            <button ref={accountButtonRef} className="workspace-account__trigger" type="button" aria-expanded={accountOpen} aria-controls={accountOpen ? 'workspace-account-menu' : undefined} aria-label={`Tài khoản ${user.fullName}`} onClick={() => setAccountOpen((value) => !value)}>
              <span className="workspace-avatar" aria-hidden="true">{initials}</span>
              <span className="workspace-user-name">{user.fullName}</span>
              <svg className="workspace-account__chevron" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {accountOpen && <div className="workspace-account__menu" id="workspace-account-menu">
              <div className="workspace-account__info"><strong>{user.fullName}</strong><span>{user.email}</span><small>{roleLabel[user.role]}</small></div>
              <button className="workspace-account__logout" type="button" disabled={busy} onClick={() => void handleLogout()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 17v3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5v3M14 8l4 4-4 4M8 12h10" /></svg>
                {busy ? 'Đang thoát...' : 'Đăng xuất'}
              </button>
            </div>}
          </div>
        </div>
      </header>
      <main className="workspace-content"><Outlet /></main>
    </div>
    {user.role === 'STUDENT' && <nav className="workspace-mobile-nav" aria-label="Điều hướng trên điện thoại">{menus.STUDENT.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive || (viewingResult && item.to === '/student/results') ? 'workspace-mobile-nav__active' : ''}><NavIcon name={item.icon} /><span>{item.label}</span></NavLink>)}</nav>}
  </div>
}
