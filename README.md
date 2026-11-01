# StudyNest Frontend

React 19 + TypeScript + Vite. FE V2/V3 dùng session cookie và CSRF từ StudyNest Server.

## Chạy local

```powershell
cd D:\CodeProHome\studynest-frontend
npm install
npm run dev
```

Mở `http://localhost:5173`. Backend mặc định ở `http://localhost:8080`; nếu khác, tạo `.env.local`:

```text
VITE_API_URL=http://localhost:8080
```

Backend cần kết nối MySQL và tài khoản phải có role phù hợp. Admin đầu tiên được cấp role thủ công trong DB. Sau khi Admin duyệt đơn Teacher, người được duyệt phải đăng xuất rồi đăng nhập lại để session nhận role mới.

## Chức năng V2/V3

| Role | Đường dẫn FE | Chức năng |
| --- | --- | --- |
| Admin | `/admin/catalog` | Tạo/sửa/lưu trữ môn và chủ đề |
| Admin | `/admin/teacher-applications` | Duyệt hoặc từ chối Teacher |
| Teacher | `/teacher/classes` | Tạo lớp, xem mã lớp |
| Teacher | `/teacher/classes/:id` | Thành viên, sửa lớp, giao/hủy bài |
| Teacher | `/teacher/lessons` | Danh sách bài học |
| Teacher | `/teacher/lessons/new`, `/teacher/lessons/:id` | Soạn bài, upload PDF/DOCX/PPTX, thêm link HTTPS, xuất bản, giao lớp |
| Student | `/student/classes` | Tham gia lớp, xem bài được giao |
| Student | `/student/lessons`, `/student/lessons/:id` | Lọc/đọc bài, tải file, đánh dấu hoàn thành |
| Student | `/student/teacher-application` | Xin quyền Teacher, xem lịch sử đơn |

`npm run build` chạy TypeScript typecheck và tạo bản build Vite. FE hiển thị nội dung bài học như văn bản an toàn; không chèn HTML trực tiếp. File upload dùng `FormData` và tự gửi CSRF token. Các tài nguyên trong `src/interface` là ảnh tham khảo thiết kế.

## Chức năng V4/V5

| Role | Đường dẫn | Chức năng |
| --- | --- | --- |
| Teacher | `/teacher/questions` | Soạn, sửa, lưu trữ câu hỏi một đáp án đúng |
| Teacher | `/teacher/quizzes` | Tạo đề từ ngân hàng câu hỏi, xuất bản và lưu trữ |
| Teacher | `/teacher/classes/:id` | Giao đề cho lớp và đặt thời hạn |
| Teacher | `/teacher/quizzes/:id/results` | Xem lượt nộp, điểm và tỷ lệ đúng từng câu |
| Teacher | `/teacher/classes/:id/analytics` | Xem tiến độ lớp và học sinh |
| Student | `/student/quizzes` | Xem đề được giao, đề công khai và lượt làm |
| Student | `/student/attempts/:id` | Làm bài, tự lưu đáp án, xem đồng hồ và nộp bài |
| Student | `/student/attempts/:id/result` | Xem điểm/đáp án theo chính sách của đề |
| Admin | `/admin/content-reports` | Xử lý báo cáo, ẩn nội dung hoặc đóng báo cáo |
| Admin | `/admin/audit-events` | Xem nhật ký thao tác |

BE cần có schema V2–V5. Nếu đã tạo bảng bằng SQL thủ công, các migration dùng `CREATE TABLE IF NOT EXISTS`. Trước khi chạy BE trong IntelliJ, đặt `DB_USERNAME` và `DB_PASSWORD` trong Run Configuration; có thể đặt thêm `STUDYNEST_UPLOAD_DIR` cho thư mục tài liệu.

Giao diện mới dùng thêm migration V6 để lưu các câu hỏi được đánh dấu khi làm bài. Danh sách đề và bài học có bộ lọc môn học/chủ đề, trạng thái và tìm kiếm; ô tìm kiếm trên thanh đầu trang đưa từ khóa vào URL. PDF của bài học được xem trực tiếp qua API có kiểm tra quyền. Các ảnh trong `src/interface` là mẫu tham chiếu; màn đang hiển thị chỉ lấy số liệu thực từ BE.

Ở **Ngân hàng câu hỏi** và **Tạo đề**, chọn môn học trước để tải các chủ đề của môn đó. Ngân hàng câu hỏi cho thêm hoặc nhân bản tối đa 20 câu trong một lần lưu; tất cả câu trong đợt lưu dùng chung một chủ đề. BE lưu cả đợt trong một transaction, nên một câu lỗi sẽ không tạo câu nào.
