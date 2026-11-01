import { useEffect, useState } from 'react'
import { applicationApi } from '../../api/phaseAApi'
import type { TeacherApplication } from '../../types/phaseA'
import { Empty, Notice, PageHeader, Panel, StatusPill, formatDate, messageOf } from '../../components/WorkspaceUi'

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<TeacherApplication[]>([])
  const [filter, setFilter] = useState('PENDING')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load(status: string) { setApplications(await applicationApi.all(status === 'ALL' ? undefined : status)) }
  useEffect(() => { void load(filter).catch((cause) => setError(messageOf(cause))) }, [filter])
  const selected = applications.find((item) => item.id === selectedId)

  async function review(decision: 'APPROVED' | 'REJECTED') {
    if (selectedId === null) return
    setBusy(true); setError(''); setSuccess('')
    try {
      await applicationApi.review(selectedId, decision, note)
      await load(filter); setSelectedId(null); setNote('')
      setSuccess(decision === 'APPROVED' ? 'Đã cấp quyền Teacher. Người được duyệt cần đăng nhập lại.' : 'Đã từ chối đơn đăng ký.')
    } catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  return <>
    <PageHeader eyebrow="QUẢN TRỊ TÀI KHOẢN" title="Duyệt giáo viên" description="Xem lý do đăng ký trước khi cấp quyền Teacher." />
    {error && <Notice message={error} />}{success && <Notice tone="success" message={success} />}
    <div className="workspace-tabs" role="group" aria-label="Lọc đơn đăng ký">{[['PENDING', 'Chờ duyệt'], ['APPROVED', 'Đã duyệt'], ['REJECTED', 'Từ chối'], ['ALL', 'Tất cả']].map(([value, label]) => <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => { setFilter(value); setSelectedId(null) }}>{label}</button>)}</div>
    <div className="workspace-two-col">
      <Panel title={`Đơn đăng ký (${applications.length})`}>
        <div className="stack-list">{applications.length ? applications.map((item) => <button key={item.id} type="button" className={`catalog-item${selectedId === item.id ? ' catalog-item--active' : ''}`}
          onClick={() => { setSelectedId(item.id); setNote('') }}><span><strong>{item.fullName ?? `User #${item.userId}`}</strong><small>{item.email} · {formatDate(item.createdAt)}</small></span><StatusPill status={item.status} /></button>)
          : <Empty title="Không có đơn trong bộ lọc này" detail="Thử chọn trạng thái khác." />}</div>
      </Panel>
      <Panel title="Chi tiết đơn">
        {selected ? <div className="application-detail"><div className="detail-line"><span>Người đăng ký</span><strong>{selected.fullName}</strong></div>
          <div className="detail-line"><span>Email</span><strong>{selected.email}</strong></div>
          <div className="detail-line"><span>Ngày gửi</span><strong>{formatDate(selected.createdAt)}</strong></div>
          <h3>Lý do đăng ký</h3><p className="quoted-text">{selected.reason || 'Không có lý do.'}</p>
          {selected.status === 'PENDING' ? <><label className="workspace-field">Ghi chú phản hồi<textarea rows={4} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú cho quyết định này..." /></label>
          <div className="button-row"><button className="button button--primary" disabled={busy} onClick={() => void review('APPROVED')}>Duyệt quyền Teacher</button><button className="button button--danger" disabled={busy} onClick={() => void review('REJECTED')}>Từ chối</button></div></> : <><div className="detail-line"><span>Ngày xử lý</span><strong>{formatDate(selected.reviewedAt)}</strong></div><p className="quoted-text">{selected.reviewNote || 'Không có ghi chú xử lý.'}</p></>}
        </div> : <Empty title="Chọn một đơn để xem" />}
      </Panel>
    </div>
  </>
}
