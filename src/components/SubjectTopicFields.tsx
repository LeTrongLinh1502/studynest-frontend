import { useEffect, useState } from 'react'
import { catalogApi } from '../api/phaseAApi'
import type { Subject, Topic } from '../types/phaseA'
import { messageOf } from './WorkspaceUi'

interface Props {
  subjectId: number
  topicId: number
  disabled?: boolean
  onSubjectChange: (subjectId: number) => void
  onTopicChange: (topicId: number) => void
}

export default function SubjectTopicFields({ subjectId, topicId, disabled = false, onSubjectChange, onTopicChange }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [subjectError, setSubjectError] = useState('')
  const [topicError, setTopicError] = useState('')

  useEffect(() => {
    let active = true
    catalogApi.subjects().then((items) => { if (active) setSubjects(items) })
      .catch((cause) => { if (active) setSubjectError(`Không tải được môn học: ${messageOf(cause)}`) })
      .finally(() => { if (active) setSubjectsLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!subjectId) { setTopics([]); setTopicsLoading(false); setTopicError(''); return }
    let active = true
    setTopics([]); setTopicsLoading(true); setTopicError('')
    catalogApi.topics(subjectId).then((items) => { if (active) setTopics(items) })
      .catch((cause) => { if (active) setTopicError(`Không tải được chủ đề: ${messageOf(cause)}`) })
      .finally(() => { if (active) setTopicsLoading(false) })
    return () => { active = false }
  }, [subjectId])

  return <>
    <div className="form-grid subject-topic-fields">
      <label>Môn học<select required disabled={disabled || subjectsLoading} value={subjectId || ''} onChange={(event) => onSubjectChange(Number(event.target.value))}>
        <option value="">{subjectsLoading ? 'Đang tải môn học...' : 'Chọn môn học'}</option>
        {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
      </select></label>
      <label>Chủ đề<select required disabled={disabled || !subjectId || topicsLoading} value={topicId || ''} onChange={(event) => onTopicChange(Number(event.target.value))}>
        <option value="">{!subjectId ? 'Chọn môn học trước' : topicsLoading ? 'Đang tải chủ đề...' : 'Chọn chủ đề'}</option>
        {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
      </select></label>
    </div>
    {subjectError && <p className="field-feedback field-feedback--error" role="alert">{subjectError}</p>}
    {topicError && <p className="field-feedback field-feedback--error" role="alert">{topicError}</p>}
    {!subjectsLoading && !subjectError && subjects.length === 0 && <p className="field-feedback">Chưa có môn học. Admin cần tạo môn học trước.</p>}
    {subjectId > 0 && !topicsLoading && !topicError && topics.length === 0 && <p className="field-feedback">Môn này chưa có chủ đề đang hoạt động. Admin cần tạo chủ đề trước.</p>}
  </>
}
