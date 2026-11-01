import type { ReactNode } from 'react'
import { ApiError } from '../api/httpClient'

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="page-eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

export function Panel({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`workspace-panel ${className}`}><div className="panel-heading">{title && <h2>{title}</h2>}{action}</div>{children}</section>
}

export function Notice({ message, tone = 'error' }: { message: string; tone?: 'error' | 'success' | 'info' }) {
  return <div className={`workspace-notice workspace-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{message}</div>
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return <div className="workspace-empty"><span aria-hidden="true">✦</span><strong>{title}</strong>{detail && <p>{detail}</p>}</div>
}

export function StatusPill({ status }: { status: string }) {
  const labels: Record<string,string> = {
    ACTIVE: 'Đang hoạt động', ARCHIVED: 'Đã lưu trữ', DRAFT: 'Bản nháp', PUBLISHED: 'Đã xuất bản',
    PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', REMOVED: 'Đã xóa', CANCELLED: 'Đã hủy',
    IN_PROGRESS: 'Đang làm', SUBMITTED: 'Đã nộp', HIDDEN: 'Đã ẩn', CLOSED: 'Đã đóng',
  }
  return <span className={`status-pill status-pill--${status.toLowerCase()}`}>{labels[status] ?? status}</span>
}

export function messageOf(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error instanceof ApiError && error.status === 403) return 'Bạn không có quyền thực hiện thao tác này. Nếu vừa được duyệt giáo viên, hãy đăng xuất rồi đăng nhập lại.'
  return error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.'
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
