import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { reportApi } from '../../api/phaseBApi'
import type { AuditEvent, ContentReport } from '../../types/phaseB'
import { Empty, Notice, PageHeader, Panel, StatusPill, formatDate, messageOf } from '../../components/WorkspaceUi'

export function AdminReportsPage() {
  const [reports, setReports] = useState<ContentReport[]>([])
  const [filter, setFilter] = useState('PENDING')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const load = (status: string) => reportApi.all(status === 'ALL' ? undefined : status).then(setReports)
  useEffect(() => { void load(filter).catch((e) => setError(messageOf(e))) }, [filter])
  const selected = reports.find((report) => report.id === selectedId)
  async function review(report: ContentReport, decision: 'HIDE' | 'CLOSE') {
    setBusy(true); setError(''); setSuccess('')
    try { await reportApi.review(report.id, decision, note.trim()); await load(filter); setSelectedId(null); setNote(''); setSuccess('Đã xử lý báo cáo.') }
    catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }
  return <><PageHeader eyebrow="KIỂM DUYỆT" title="Báo cáo nội dung" description="Xem báo cáo của học sinh, ẩn nội dung vi phạm hoặc đóng báo cáo." action={<Link className="button button--soft" to="/admin/audit-events">Nhật ký thao tác</Link>} />
    {error && <Notice message={error} />}{success && <Notice tone="success" message={success} />}
    <div className="workspace-tabs" role="group" aria-label="Lọc báo cáo">{[['PENDING', 'Chờ xử lý'], ['HIDDEN', 'Đã ẩn'], ['CLOSED', 'Đã đóng'], ['ALL', 'Tất cả']].map(([value, label]) => <button key={value} className={filter === value ? 'is-active' : ''} onClick={() => { setFilter(value); setSelectedId(null) }} type="button">{label}</button>)}</div>
    <div className="workspace-two-col workspace-two-col--wide"><Panel title={`Báo cáo (${reports.length})`}>{reports.length ? <div className="stack-list">{reports.map((r) => <button type="button" className={`catalog-item${selectedId === r.id ? ' catalog-item--active' : ''}`} key={r.id} onClick={() => { setSelectedId(r.id); setNote('') }}><span><strong>#{r.id} · {r.targetType} #{r.targetId}</strong><small>{r.reason.slice(0, 110)} · {formatDate(r.createdAt)}</small></span><StatusPill status={r.status} /></button>)}</div> : <Empty title="Không có báo cáo trong bộ lọc này" />}</Panel>
      <Panel title="Chi tiết báo cáo">{selected ? <div className="application-detail"><div className="detail-line"><span>Nội dung</span><strong>{selected.targetType} #{selected.targetId}</strong></div><div className="detail-line"><span>Người báo cáo</span><strong>#{selected.reporterId}</strong></div><div className="detail-line"><span>Ngày gửi</span><strong>{formatDate(selected.createdAt)}</strong></div><h3>Lý do</h3><p className="quoted-text">{selected.reason}</p>{selected.status === 'PENDING' ? <><label className="workspace-field">Ghi chú xử lý<textarea rows={4} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nhập lý do hoặc kết luận xử lý..." /></label><div className="button-row"><button className="button button--danger" type="button" disabled={busy} onClick={() => void review(selected, 'HIDE')}>Ẩn nội dung</button><button className="button button--soft" type="button" disabled={busy} onClick={() => void review(selected, 'CLOSE')}>Đóng báo cáo</button></div></> : <p className="quoted-text">{selected.resolutionNote || 'Không có ghi chú xử lý.'}</p>}</div> : <Empty title="Chọn một báo cáo để xem" />}</Panel></div>
  </>
}

export function AdminAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [action, setAction] = useState('')
  useEffect(() => { void reportApi.audit().then(setEvents).catch((e) => setError(messageOf(e))) }, [])
  const actions = [...new Set(events.map((event) => event.actionCode))]
  const shown = events.filter((event) => (!action || event.actionCode === action) && `${event.actorName ?? event.actorId} ${event.targetType} ${event.targetId ?? ''} ${event.details ?? ''}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')))
  return <><PageHeader eyebrow="QUẢN TRỊ" title="Nhật ký thao tác" description="Các hành động xuất bản, lưu trữ, duyệt và kiểm duyệt gần đây." action={<Link className="button button--soft" to="/admin/content-reports">← Báo cáo</Link>} />{error && <Notice message={error} />}<Panel title={`Sự kiện (${shown.length})`}><div className="toolbar"><input type="search" placeholder="Tìm người thao tác, nội dung..." aria-label="Tìm sự kiện" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Lọc hành động" value={action} onChange={(event) => setAction(event.target.value)}><option value="">Tất cả hành động</option>{actions.map((item) => <option value={item} key={item}>{item}</option>)}</select></div>{shown.length ? <div className="audit-table"><div className="audit-table__head"><strong>Thời gian</strong><strong>Người thao tác</strong><strong>Hành động</strong><strong>Đối tượng</strong></div>{shown.map((event) => <div className="audit-table__row" key={event.id}><span>{formatDate(event.createdAt)}</span><span>{event.actorName ?? `Người dùng #${event.actorId}`}</span><strong>{event.actionCode}</strong><span>{event.targetType} #{event.targetId ?? '—'}{event.details && <small>{event.details}</small>}</span></div>)}</div> : <Empty title="Không có sự kiện phù hợp" />}</Panel></>
}
