import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { classApi } from '../../api/phaseAApi'
import type { StudyClass } from '../../types/phaseA'
import { Empty, Notice, PageHeader, Panel, StatusPill, messageOf } from '../../components/WorkspaceUi'

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<StudyClass[]>([])
  const [form, setForm] = useState({ name: '', description: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  useEffect(() => { classApi.teacherMine().then(setClasses).catch((cause) => setError(messageOf(cause))) }, [])

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('')
    try {
      const created = await classApi.create(form)
      setClasses((previous) => [created, ...previous]); setForm({ name: '', description: '' })
      setSuccess(`Đã tạo lớp ${created.name}. Mã tham gia: ${created.joinCode}.`)
    } catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  return <>
    <PageHeader eyebrow="KHÔNG GIAN GIẢNG DẠY" title="Lớp học" description="Tạo lớp, chia sẻ mã tham gia và giao bài học cho học sinh." />
    {error && <Notice message={error} />}{success && <Notice tone="success" message={success} />}
    <div className="workspace-two-col workspace-two-col--wide">
      <Panel title={`Lớp của bạn (${classes.length})`}>
        <div className="card-list">{classes.length ? classes.map((item) => <Link to={`/teacher/classes/${item.id}`} className="list-card" key={item.id}>
          <span className="list-card__icon">◫</span><span className="list-card__main"><strong>{item.name}</strong><small>{item.description || 'Chưa có mô tả'}</small><small>Mã lớp: <b>{item.joinCode}</b> · {item.memberCount ?? 0} học sinh · {item.lessonCount ?? 0} bài học · {item.quizCount ?? 0} đề</small></span><StatusPill status={item.status} /><span className="list-card__arrow">→</span>
        </Link>) : <Empty title="Chưa có lớp học" detail="Tạo lớp đầu tiên để học sinh có thể tham gia." />}</div>
      </Panel>
      <Panel title="Tạo lớp mới">
        <form className="workspace-form" onSubmit={create}>
          <label>Tên lớp<input required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ví dụ: Toán 10A" /></label>
          <label>Mô tả<textarea rows={4} maxLength={5000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Giới thiệu ngắn về lớp..." /></label>
          <button className="button button--primary" disabled={busy}>{busy ? 'Đang tạo...' : 'Tạo lớp học'}</button>
        </form>
      </Panel>
    </div>
  </>
}
