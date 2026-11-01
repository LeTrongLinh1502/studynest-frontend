import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { applicationApi } from '../../api/phaseAApi'
import type { TeacherApplication } from '../../types/phaseA'
import { Empty, Notice, PageHeader, Panel, StatusPill, formatDate, messageOf } from '../../components/WorkspaceUi'

export default function StudentTeacherApplicationPage() {
  const [applications, setApplications] = useState<TeacherApplication[]>([])
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  useEffect(() => { applicationApi.mine().then(setApplications).catch((cause) => setError(messageOf(cause))) }, [])
  const pending = applications.some((item) => item.status === 'PENDING')
  const approved = applications.some((item) => item.status === 'APPROVED')

  async function apply(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('')
    try { const item = await applicationApi.apply(reason); setApplications((previous) => [item, ...previous]); setReason(''); setSuccess('Đã gửi đơn đăng ký. Hãy chờ Admin xét duyệt.') }
    catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  return <>
    <PageHeader eyebrow="PHÁT TRIỂN CỘNG ĐỒNG" title="Trở thành giáo viên" description="Chia sẻ kiến thức và xây dựng bài học cho học sinh trên StudyNest." />
    {error && <Notice message={error} />}{success && <Notice tone="success" message={success} />}
    {approved && <Notice tone="info" message="Đơn của bạn đã được duyệt. Hãy đăng xuất rồi đăng nhập lại để sử dụng quyền giáo viên." />}
    <div className="workspace-two-col">
      <Panel title="Gửi đơn đăng ký"><form className="workspace-form" onSubmit={apply}><label>Lý do muốn giảng dạy<textarea rows={6} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Giới thiệu kinh nghiệm và chủ đề bạn muốn chia sẻ..." /></label><button className="button button--primary" disabled={busy || pending || approved}>{pending ? 'Đang chờ duyệt' : approved ? 'Đã được duyệt' : 'Gửi đơn đăng ký'}</button></form></Panel>
      <Panel title="Lịch sử đăng ký">{applications.length ? <div className="stack-list">{applications.map((item) => <div className="topic-item" key={item.id}><div><strong>Đơn #{item.id}</strong><small>Gửi {formatDate(item.createdAt)}</small><small>{item.reviewNote || item.reason || 'Không có ghi chú'}</small></div><StatusPill status={item.status} /></div>)}</div> : <Empty title="Chưa có đơn đăng ký" />}</Panel>
    </div>
  </>
}
