import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { classApi, lessonApi } from '../../api/phaseAApi'
import { quizApi } from '../../api/phaseBApi'
import type { ClassAssignment, ClassMember, Lesson, StudyClass } from '../../types/phaseA'
import type { Quiz } from '../../types/phaseB'
import { Empty, Notice, PageHeader, Panel, StatusPill, formatDate, messageOf } from '../../components/WorkspaceUi'

export default function TeacherClassDetailPage() {
  const classId = Number(useParams().id)
  const navigate = useNavigate()
  const [classroom, setClassroom] = useState<StudyClass | null>(null)
  const [members, setMembers] = useState<ClassMember[]>([])
  const [assignments, setAssignments] = useState<ClassAssignment[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [form, setForm] = useState({ name: '', description: '' })
  const [assignForm, setAssignForm] = useState({ lessonId: '', availableAt: '', dueAt: '' })
  const [quizForm, setQuizForm] = useState({ quizId: '', availableAt: '', dueAt: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    if (!Number.isInteger(classId) || classId <= 0) return
    const [nextClass, nextMembers, nextAssignments, nextLessons, nextQuizzes] = await Promise.all([
      classApi.teacherOne(classId), classApi.members(classId), classApi.assignments(classId), lessonApi.teacherMine(), quizApi.teacherMine(),
    ])
    setClassroom(nextClass); setForm({ name: nextClass.name, description: nextClass.description ?? '' })
    setMembers(nextMembers); setAssignments(nextAssignments); setLessons(nextLessons.filter((item) => item.status === 'PUBLISHED'))
    setQuizzes(nextQuizzes.filter((item) => item.status === 'PUBLISHED'))
  }, [classId])
  useEffect(() => { void load().catch((cause) => setError(messageOf(cause))) }, [load])

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('')
    try { const updated = await classApi.update(classId, form); setClassroom(updated); setSuccess('Đã cập nhật lớp học.') }
    catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function assign(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('')
    try {
      const available = assignForm.availableAt ? new Date(assignForm.availableAt).toISOString() : null
      const due = assignForm.dueAt ? new Date(assignForm.dueAt).toISOString() : null
      await classApi.assign(classId, Number(assignForm.lessonId), available, due)
      setAssignments(await classApi.assignments(classId)); setAssignForm({ lessonId: '', availableAt: '', dueAt: '' })
      setSuccess('Đã giao bài học cho lớp.')
    } catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function assignQuiz(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('')
    try {
      const quiz = quizzes.find((item) => item.id === Number(quizForm.quizId))
      if (!quiz) throw new Error('Chọn một đề đã xuất bản.')
      if (quiz.resultPolicy === 'AFTER_DUE' && !quizForm.dueAt) throw new Error('Đề xem kết quả sau hạn nộp cần có hạn nộp.')
      const available = quizForm.availableAt ? new Date(quizForm.availableAt).toISOString() : null
      const due = quizForm.dueAt ? new Date(quizForm.dueAt).toISOString() : null
      await classApi.assignQuiz(classId, quiz.id, available, due)
      setAssignments(await classApi.assignments(classId)); setQuizForm({ quizId: '', availableAt: '', dueAt: '' })
      setSuccess('Đã giao đề cho lớp.')
    } catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function cancel(id: number) {
    if (!window.confirm('Hủy nội dung đã giao cho lớp?')) return
    setBusy(true); setError('')
    try { await classApi.cancelAssignment(classId, id); setAssignments(await classApi.assignments(classId)); setSuccess('Đã hủy bài giao.') }
    catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function removeMember(studentId: number) {
    if (!window.confirm('Xóa học sinh khỏi lớp?')) return
    setBusy(true); setError('')
    try { await classApi.removeMember(classId, studentId); setMembers(await classApi.members(classId)); setSuccess('Đã xóa thành viên.') }
    catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function archive() {
    if (!window.confirm('Lưu trữ lớp học? Các bài đã giao sẽ bị hủy.')) return
    setBusy(true); setError('')
    try { await classApi.archive(classId); navigate('/teacher/classes', { replace: true }) }
    catch (cause) { setError(messageOf(cause)); setBusy(false) }
  }

  if (!Number.isInteger(classId) || classId <= 0) return <Notice message="Mã lớp không hợp lệ." />
  return <>
    <PageHeader eyebrow="LỚP HỌC" title={classroom?.name ?? 'Đang tải lớp...'} description={classroom?.description ?? 'Quản lý học sinh và bài được giao.'}
      action={<div className="button-row"><Link to={`/teacher/classes/${classId}/analytics`} className="button button--primary">Thống kê</Link><Link to="/teacher/classes" className="button button--soft">← Tất cả lớp</Link></div>} />
    {error && <Notice message={error} />}{success && <Notice tone="success" message={success} />}
    {classroom && <>
      <div className="workspace-two-col workspace-two-col--wide">
        <Panel title="Thông tin lớp" action={<StatusPill status={classroom.status} />}>
          <div className="join-code-box"><div><small>MÃ THAM GIA</small><strong>{classroom.joinCode}</strong></div><button type="button" className="button button--soft" onClick={() => void navigator.clipboard.writeText(classroom.joinCode ?? '')}>Sao chép</button></div>
          <form className="workspace-form workspace-form--border" onSubmit={save}><label>Tên lớp<input required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Mô tả<textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="button-row"><button className="button button--primary" disabled={busy || classroom.status !== 'ACTIVE'}>Lưu thay đổi</button><button type="button" className="button button--danger" disabled={busy || classroom.status !== 'ACTIVE'} onClick={() => void archive()}>Lưu trữ lớp</button></div></form>
        </Panel>
        <Panel title="Giao bài học">
          {lessons.length ? <form className="workspace-form" onSubmit={assign}><label>Chọn bài đã xuất bản<select required value={assignForm.lessonId} onChange={(event) => setAssignForm({ ...assignForm, lessonId: event.target.value })}><option value="">Chọn bài học</option>{lessons.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><div className="form-grid"><label>Mở từ<input type="datetime-local" value={assignForm.availableAt} onChange={(event) => setAssignForm({ ...assignForm, availableAt: event.target.value })} /></label><label>Hạn học<input type="datetime-local" value={assignForm.dueAt} onChange={(event) => setAssignForm({ ...assignForm, dueAt: event.target.value })} /></label></div><button className="button button--primary" disabled={busy || classroom.status !== 'ACTIVE'}>Giao bài cho lớp</button></form>
            : <div className="class-assignment-empty"><Empty title="Chưa có bài đã xuất bản" detail="Tạo và xuất bản bài học trước khi giao cho lớp." /><Link className="button button--primary" to="/teacher/lessons/new">+ Tạo bài học</Link></div>}
          <div className="stack-list stack-list--spaced">{assignments.filter((item) => item.targetType === 'LESSON').map((item) => <div className="topic-item" key={item.id}><div><strong>{item.lessonTitle ?? `Bài #${item.targetId}`}</strong><small>Mở: {formatDate(item.availableAt)} · Hạn: {formatDate(item.dueAt)}</small></div><StatusPill status={item.status} />{item.status === 'ACTIVE' && <button className="text-button text-button--danger" type="button" disabled={busy} onClick={() => void cancel(item.id)}>Hủy</button>}</div>)}</div>
        </Panel>
      </div>
      <Panel title="Giao đề trắc nghiệm">
        {quizzes.length ? <form className="workspace-form" onSubmit={assignQuiz}>
          <label>Đề đã xuất bản<select required value={quizForm.quizId} onChange={(event) => setQuizForm({ ...quizForm, quizId: event.target.value })}><option value="">Chọn đề</option>{quizzes.map((quiz) => <option value={quiz.id} key={quiz.id}>{quiz.title}</option>)}</select></label>
          <div className="form-grid"><label>Mở từ<input type="datetime-local" value={quizForm.availableAt} onChange={(event) => setQuizForm({ ...quizForm, availableAt: event.target.value })} /></label><label>Hạn nộp<input type="datetime-local" value={quizForm.dueAt} onChange={(event) => setQuizForm({ ...quizForm, dueAt: event.target.value })} /></label></div>
          <button className="button button--primary" disabled={busy || classroom.status !== 'ACTIVE'}>Giao đề cho lớp</button>
        </form> : <div className="class-assignment-empty"><Empty title="Chưa có đề đã xuất bản" detail="Tạo và xuất bản đề trước khi giao cho lớp." /><Link className="button button--primary" to="/teacher/quizzes/new">+ Tạo đề trắc nghiệm</Link></div>}
        {assignments.filter((item) => item.targetType === 'QUIZ').map((item) => <div className="topic-item" key={item.id}><div><strong>{item.quizTitle ?? `Đề #${item.targetId}`}</strong><small>Mở: {formatDate(item.availableAt)} · Hạn: {formatDate(item.dueAt)}</small></div><StatusPill status={item.status} />{item.status === 'ACTIVE' && <button type="button" className="text-button text-button--danger" disabled={busy} onClick={() => void cancel(item.id)}>Hủy</button>}</div>)}
      </Panel>
      <Panel title={`Thành viên (${members.filter((item) => item.status === 'ACTIVE').length})`}>
        {members.length ? <div className="stack-list">{members.map((item) => <div className="topic-item" key={item.id}><div><strong>{item.fullName}</strong><small>{item.email} · Tham gia {formatDate(item.joinedAt)}</small></div><StatusPill status={item.status} />{item.status === 'ACTIVE' && <button type="button" className="text-button text-button--danger" disabled={busy} onClick={() => void removeMember(item.studentId)}>Xóa</button>}</div>)}</div>
          : <Empty title="Chưa có học sinh" detail="Chia sẻ mã tham gia để học sinh vào lớp." />}
      </Panel>
    </>}
  </>
}
