import { Link } from 'react-router-dom'
import { PageHeader, Panel } from '../components/WorkspaceUi'

export default function ForbiddenPage() {
  return <><PageHeader eyebrow="QUYỀN TRUY CẬP" title="Trang này không dành cho tài khoản của bạn" description="Hãy chọn một mục phù hợp trong menu bên trái." />
    <Panel><Link className="button button--primary" to="/dashboard">Về tổng quan</Link></Panel></>
}
