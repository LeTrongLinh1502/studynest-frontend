# StudyNest — kế hoạch triển khai V2+V3 và V4+V5

Ngày lập: 31/10/2026. Phạm vi: Spring Boot/Java 21 ở `D:\CodeProHome\studynest-server`, React/TypeScript ở `D:\CodeProHome\studynest-frontend`, MySQL `studynest_db`. Đây là **kế hoạch và SQL dự kiến**, chưa phải các migration đã được tạo hoặc chạy.

## 0. Nền tảng và quyết định chung

- Giữ V1 `users` và luồng login/signup bằng session + CSRF hiện tại. Đăng ký công khai luôn tạo `STUDENT`; quyền `TEACHER` do Admin duyệt, quyền `ADMIN` cấp thủ công cho tài khoản tin cậy ban đầu.
- Không tạo `FOREIGN KEY`. Các cột ID tham chiếu vẫn cùng kiểu `BIGINT UNSIGNED`, có index/unique cần thiết; service kiểm tra bản ghi tồn tại, đúng chủ sở hữu, đúng role, đúng trạng thái trong transaction. Dùng `ARCHIVED`/`DISABLED` thay cho xóa cứng dữ liệu đã được sử dụng.
- Flyway là nguồn tạo bảng duy nhất. Giữ `spring.jpa.hibernate.ddl-auto=validate`; không dùng `ddl-auto=update`. Mỗi khối SQL ở cuối tài liệu được chép thành một migration trong BE và để Flyway chạy theo thứ tự. Không chạy tay cùng SQL trong DataGrip trên chính database mà Flyway sẽ migrate.
- API chỉ trả DTO; không trả JPA entity, `password_hash`, đáp án đúng trước khi nộp bài, hoặc đường dẫn file nội bộ.
- Mốc đầu: `SINGLE_CHOICE`, file PDF/DOCX/PPTX, link video ngoài. `MULTIPLE_CHOICE` dùng cấu trúc sẵn có nhưng triển khai sau khi chấm câu một đáp án ổn định. AI, OCR/PDF thành câu hỏi, livestream và thanh toán ngoài phạm vi V2–V5.
- Các thời điểm API dùng ISO-8601; service thống nhất xử lý thời gian và hạn nộp. Các con số/ngày trong mockup chỉ là dữ liệu minh họa.

## Giai đoạn A — V2 + V3: phân quyền, lớp học, bài học và tài liệu

### A1. V2 — danh mục, duyệt giáo viên và lớp học

**DB:** `subjects`, `topics`, `teacher_applications`, `classes`, `class_members`.

**BE, theo thứ tự:**

1. Tạo `V2__catalog_teacher_and_classes.sql`; map entity/repository đúng cột, index và unique.
2. Thêm `@EnableMethodSecurity` và quyền theo endpoint/service. Admin quản lý môn/chủ đề, duyệt giáo viên; Teacher tạo/sửa lớp của mình; Student tham gia lớp bằng mã. Kiểm tra quyền sở hữu ở service, không chỉ dựa vào role hoặc nút FE.
3. Luồng xin quyền Teacher: Student gửi đơn; Admin xem đơn và duyệt trong một transaction, cập nhật `users.role_code='TEACHER'`, lưu người duyệt và thời gian. Chặn nhiều đơn `PENDING` bằng kiểm tra trong service.
4. Luồng lớp: mã tham gia ngẫu nhiên, duy nhất; thêm Student idempotent theo unique `(class_id, student_id)`; chỉ Teacher sở hữu lớp hoặc Admin được xem danh sách thành viên.
5. Một tài khoản Admin đầu tiên được cấp thủ công sau khi tạo tài khoản thường. Không thêm endpoint tự cấp quyền Admin.

**API dự kiến:**

| Role | Endpoint | Công việc |
| --- | --- | --- |
| Public/đã đăng nhập | `GET /api/subjects`, `GET /api/subjects/{id}/topics` | Danh mục để lọc bài học, câu hỏi, đề |
| Student | `POST /api/teacher-applications`, `GET /api/teacher-applications/me` | Xin quyền Teacher, xem trạng thái |
| Admin | `GET /api/admin/teacher-applications`, `PATCH /api/admin/teacher-applications/{id}` | Duyệt/từ chối |
| Admin | CRUD `/api/admin/subjects`, `/api/admin/topics` | Quản lý danh mục |
| Teacher | CRUD `/api/teacher/classes`, `GET /api/teacher/classes/{id}/members` | Quản lý lớp của mình |
| Student | `POST /api/classes/join`, `GET /api/classes/my` | Vào lớp bằng mã, xem lớp của mình |

**FE:**

1. Mở rộng `AuthContext`/`AuthUser` hiện có để điều hướng theo role. Tạo `RoleRoute`, `AppShell`, menu riêng Admin/Teacher/Student; route `403` và màn hình thiếu quyền.
2. Trang Student xin quyền Teacher, nhập mã lớp và xem lớp đã tham gia.
3. Trang Teacher tạo lớp, xem mã tham gia và danh sách học sinh.
4. Trang Admin quản lý môn/chủ đề và hàng chờ duyệt giáo viên.

### A2. V3 — bài học, file, video và giao bài

**DB:** `lessons`, `lesson_resources`, `lesson_completions`, `class_assignments`. Đặt `class_assignments` ở V3 để **giao bài học cho lớp ngay trong giai đoạn A**; V4 tái sử dụng bảng này cho đề thi.

**BE, theo thứ tự:**

1. Tạo `V3__lessons_and_resources.sql` và entity/repository.
2. Lesson API: Teacher tạo nháp, sửa, sắp xếp tài liệu, xem trước, xuất bản/ẩn bài. `visibility=PUBLIC` cho bài công khai; `CLASS` chỉ mở khi đã giao cho lớp mà Student là thành viên.
3. Storage service lưu file ngoài source/Git theo `STUDYNEST_UPLOAD_DIR`; DB chỉ lưu `storage_key` và metadata. Kiểm tra kích thước, MIME/đuôi file, tên file an toàn. Tải file qua API có kiểm tra quyền xem lesson. Chỉ link `https://` hợp lệ cho video/website.
4. Cấu hình `spring.servlet.multipart.max-file-size` và `max-request-size`; upload dùng `multipart/form-data` và CSRF header. Student mở link video ngoài; trạng thái `đã học` do Student tự đánh dấu, không suy diễn đã xem hết video.
5. Giao lesson cho lớp qua `class_assignments` với `target_type='LESSON'`, ngày mở/hạn nộp. Chặn Teacher giao lesson hoặc class không thuộc mình.

**API dự kiến:**

| Role | Endpoint | Công việc |
| --- | --- | --- |
| Teacher | CRUD `/api/teacher/lessons`, `POST /api/teacher/lessons/{id}/publish` | Soạn và xuất bản bài |
| Teacher | `POST /api/teacher/lessons/{id}/resources/files`, `POST /api/teacher/lessons/{id}/resources/links` | File/link video |
| Teacher | `POST /api/teacher/classes/{id}/assignments` | Giao lesson cho lớp |
| Student | `GET /api/lessons`, `GET /api/lessons/{id}`, `POST /api/lessons/{id}/complete` | Học và đánh dấu hoàn thành |
| Người có quyền xem | `GET /api/lesson-resources/{id}/download` | Tải tài liệu |

**FE:**

1. Mở rộng `httpClient.ts` thành `GET/POST/PUT/PATCH/DELETE/upload`. Với `FormData`, browser tự tạo `Content-Type` có boundary; client vẫn gửi CSRF header. Giữ `credentials: 'include'`.
2. Teacher: danh sách bài, form soạn bài, upload file có tiến độ/lỗi, form link video, xem trước, xuất bản, chọn lớp để giao bài. Dùng mockup `05-teacher-lesson-editor.png`.
3. Student: thư viện lọc theo môn/chủ đề; trang bài học gồm tóm tắt, file, video, nút đánh dấu hoàn thành; dashboard hiển thị bài sắp tới. Dùng mockup `01`, `02`, `08` trong `src/interface`.

**Tiêu chí hoàn thành A:** Admin duyệt Teacher; Teacher tạo lớp và bài học có PDF/video, giao cho lớp; Student tham gia lớp, mở đúng bài được giao, tải file và đánh dấu hoàn thành; Student ngoài lớp không xem được bài `CLASS`.

## Giai đoạn B — V4 + V5: ngân hàng câu hỏi, làm đề, kết quả và kiểm duyệt

### B1. V4 — câu hỏi, đề và giao đề

**DB:** `questions`, `question_options`, `quizzes`, `quiz_questions`, `quiz_question_options`. Bảng `class_assignments` từ V3 nhận thêm `target_type='QUIZ'` mà không cần đổi schema.

**BE, theo thứ tự:**

1. Tạo `V4__questions_and_quizzes.sql`. Teacher tạo câu hỏi một đáp án, gắn topic/difficulty, lời giải; validate có ít nhất 2 lựa chọn và đúng 1 đáp án cho `SINGLE_CHOICE`.
2. Teacher tạo đề nháp, chọn câu từ ngân hàng, đặt điểm, thời gian, số lần làm, chính sách hiển thị kết quả. Khi xuất bản, chép nội dung câu và lựa chọn vào `quiz_questions`/`quiz_question_options`; khóa sửa bản đề đã xuất bản. Muốn sửa nội dung thì tạo bản đề mới.
3. Cho phép `PUBLIC` hoặc giao cho lớp qua `class_assignments`. API lấy đề cho Student loại bỏ `is_correct` và `explanation_snapshot` trước khi được phép xem kết quả.
4. Thứ tự câu/đáp án cố định trong V4+V5; tính năng trộn cần lưu thứ tự riêng cho từng attempt ở migration sau, nên chưa bật cờ trộn trong giai đoạn này.

**API dự kiến:** CRUD `/api/teacher/questions`, CRUD `/api/teacher/quizzes`, `POST /api/teacher/quizzes/{id}/publish`, `POST /api/teacher/classes/{id}/assignments`, `GET /api/quizzes`, `GET /api/quizzes/{id}`.

**FE:** Teacher có ngân hàng câu hỏi, form tạo/sửa câu, form chọn câu tạo đề và xem trước đề. Student có danh sách đề theo môn/chủ đề và trang thông tin đề. Giao diện làm đề theo mockup `03-quiz-taking.png`.

### B2. V5 — lượt làm, chấm, thống kê, báo cáo

**DB:** `quiz_attempts`, `attempt_answers`, `attempt_answer_options`, `content_reports`, `audit_events`.

**BE, theo thứ tự:**

1. Tạo `V5__attempts_reports_and_audit.sql`. Student bắt đầu attempt sau khi BE kiểm tra quyền xem, hạn nộp và `max_attempts`. Mỗi attempt có `attempt_no` duy nhất cho `(quiz_id, student_id)`.
2. Lưu đáp án từng câu. Nộp bài trong transaction: khóa attempt, chỉ cho chuyển `IN_PROGRESS -> SUBMITTED` một lần, chấm ở server từ bản snapshot, lưu điểm và thời gian. Hết giờ thì tự nộp theo đồng hồ phía server; FE chỉ hiển thị đếm ngược.
3. Result API trả điểm, câu đúng/sai và lời giải theo `result_policy`; Teacher xem tổng hợp theo đề/lớp/topic; Admin xem báo cáo nội dung và nhật ký duyệt/ẩn.
4. Báo cáo câu hỏi/tài liệu sai: Student hoặc Teacher gửi `content_reports`; Admin duyệt, ẩn nội dung hoặc ghi lý do đóng báo cáo. Ghi `audit_events` cho thao tác đổi role, xuất bản/ẩn nội dung, duyệt báo cáo.

**API dự kiến:**

| Role | Endpoint | Công việc |
| --- | --- | --- |
| Student | `POST /api/quizzes/{id}/attempts` | Bắt đầu bài |
| Student | `PUT /api/attempts/{id}/answers/{questionId}` | Lưu/thay đáp án |
| Student | `POST /api/attempts/{id}/submit`, `GET /api/attempts/{id}/result` | Nộp và xem kết quả |
| Teacher | `GET /api/teacher/quizzes/{id}/results`, `GET /api/teacher/classes/{id}/analytics` | Điểm và thống kê |
| Người đăng nhập | `POST /api/content-reports` | Báo nội dung sai |
| Admin | `GET /api/admin/content-reports`, `PATCH /api/admin/content-reports/{id}` | Xử lý báo cáo |

**FE:** trang làm bài tự lưu, đồng hồ, danh sách câu và xác nhận nộp; trang kết quả/đáp án và liên kết về bài học theo topic; Teacher có thống kê lớp và câu sai nhiều; Admin có hàng chờ kiểm duyệt. Dùng mockup `04`, `06`, `07` trong `src/interface`.

**Tiêu chí hoàn thành B:** Teacher xuất bản/giao đề; Student chỉ thấy đáp án khi chính sách cho phép, làm/nộp được một lượt hợp lệ; làm mới trang không mất đáp án đã lưu; submit lặp không cộng điểm hai lần; Teacher xem kết quả lớp; Admin xử lý báo cáo.

## Phụ lục SQL — chép từng khối sang BE khi triển khai

### `V2__catalog_teacher_and_classes.sql`

```sql
CREATE TABLE subjects (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id), UNIQUE KEY uq_subjects_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE topics (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    subject_id BIGINT UNSIGNED NOT NULL,
    parent_topic_id BIGINT UNSIGNED NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(150) NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    PRIMARY KEY (id),
    UNIQUE KEY uq_topics_subject_code (subject_id, code),
    INDEX idx_topics_parent (parent_topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE teacher_applications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    reason TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reviewed_by BIGINT UNSIGNED NULL,
    review_note TEXT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    reviewed_at TIMESTAMP(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_teacher_applications_user_status (user_id, status),
    INDEX idx_teacher_applications_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE classes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    teacher_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    join_code CHAR(8) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_classes_join_code (join_code),
    INDEX idx_classes_teacher (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE class_members (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    class_id BIGINT UNSIGNED NOT NULL,
    student_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_class_members_class_student (class_id, student_id),
    INDEX idx_class_members_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `V3__lessons_resources_and_assignments.sql`

```sql
CREATE TABLE lessons (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    teacher_id BIGINT UNSIGNED NOT NULL,
    topic_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary TEXT NULL,
    body LONGTEXT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'CLASS',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_lessons_teacher_status (teacher_id, status),
    INDEX idx_lessons_topic_status (topic_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lesson_resources (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    lesson_id BIGINT UNSIGNED NOT NULL,
    resource_type VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    external_url VARCHAR(2048) NULL,
    storage_key VARCHAR(512) NULL,
    original_name VARCHAR(255) NULL,
    mime_type VARCHAR(100) NULL,
    size_bytes BIGINT UNSIGNED NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_lesson_resources_lesson_order (lesson_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lesson_completions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    lesson_id BIGINT UNSIGNED NOT NULL,
    student_id BIGINT UNSIGNED NOT NULL,
    completed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_lesson_completions_lesson_student (lesson_id, student_id),
    INDEX idx_lesson_completions_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE class_assignments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    class_id BIGINT UNSIGNED NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id BIGINT UNSIGNED NOT NULL,
    assigned_by BIGINT UNSIGNED NOT NULL,
    available_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    due_at TIMESTAMP(6) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_class_assignments_target (class_id, target_type, target_id),
    INDEX idx_class_assignments_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `V4__questions_and_quizzes.sql`

```sql
CREATE TABLE questions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    teacher_id BIGINT UNSIGNED NOT NULL,
    topic_id BIGINT UNSIGNED NOT NULL,
    question_type VARCHAR(30) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    stem TEXT NOT NULL,
    explanation TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_questions_teacher_status (teacher_id, status),
    INDEX idx_questions_topic_difficulty (topic_id, difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE question_options (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    question_id BIGINT UNSIGNED NOT NULL,
    content TEXT NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_question_options_order (question_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quizzes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    teacher_id BIGINT UNSIGNED NOT NULL,
    lesson_id BIGINT UNSIGNED NULL,
    topic_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    time_limit_minutes INT UNSIGNED NULL,
    max_attempts INT UNSIGNED NOT NULL DEFAULT 1,
    result_policy VARCHAR(30) NOT NULL DEFAULT 'AFTER_SUBMIT',
    visibility VARCHAR(20) NOT NULL DEFAULT 'CLASS',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_quizzes_teacher_status (teacher_id, status),
    INDEX idx_quizzes_topic_status (topic_id, status),
    INDEX idx_quizzes_lesson (lesson_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quiz_questions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    quiz_id BIGINT UNSIGNED NOT NULL,
    source_question_id BIGINT UNSIGNED NULL,
    question_type VARCHAR(30) NOT NULL,
    stem_snapshot TEXT NOT NULL,
    explanation_snapshot TEXT NULL,
    points DECIMAL(8,2) NOT NULL DEFAULT 1.00,
    sort_order INT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_quiz_questions_order (quiz_id, sort_order),
    INDEX idx_quiz_questions_source (source_question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quiz_question_options (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    quiz_question_id BIGINT UNSIGNED NOT NULL,
    content_snapshot TEXT NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_quiz_question_options_order (quiz_question_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `V5__attempts_reports_and_audit.sql`

```sql
CREATE TABLE quiz_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    quiz_id BIGINT UNSIGNED NOT NULL,
    student_id BIGINT UNSIGNED NOT NULL,
    assignment_id BIGINT UNSIGNED NULL,
    attempt_no INT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    score DECIMAL(8,2) NULL,
    max_score DECIMAL(8,2) NOT NULL,
    started_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    submitted_at TIMESTAMP(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_quiz_attempts_number (quiz_id, student_id, attempt_no),
    INDEX idx_quiz_attempts_student (student_id, submitted_at),
    INDEX idx_quiz_attempts_assignment (assignment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attempt_answers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    attempt_id BIGINT UNSIGNED NOT NULL,
    quiz_question_id BIGINT UNSIGNED NOT NULL,
    is_correct TINYINT(1) NULL,
    points_earned DECIMAL(8,2) NULL,
    answered_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_attempt_answers_question (attempt_id, quiz_question_id),
    INDEX idx_attempt_answers_question (quiz_question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attempt_answer_options (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    attempt_answer_id BIGINT UNSIGNED NOT NULL,
    quiz_question_option_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attempt_answer_options_choice
        (attempt_answer_id, quiz_question_option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE content_reports (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    reporter_id BIGINT UNSIGNED NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id BIGINT UNSIGNED NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reviewed_by BIGINT UNSIGNED NULL,
    resolution_note TEXT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    reviewed_at TIMESTAMP(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_content_reports_status (status, created_at),
    INDEX idx_content_reports_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_id BIGINT UNSIGNED NOT NULL,
    action_code VARCHAR(80) NOT NULL,
    target_type VARCHAR(30) NOT NULL,
    target_id BIGINT UNSIGNED NULL,
    details TEXT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_audit_events_actor_time (actor_id, created_at),
    INDEX idx_audit_events_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Thứ tự bàn giao và lưu ý khi triển khai

1. Hoàn thành A trước khi code B; giao bài học không phụ thuộc bảng của V4.
2. Sau khi migration đã chạy ở một môi trường, mọi sửa schema phải dùng migration mới; không sửa lại file V2–V5 đã phát hành.
3. Trước khi code BE, kiểm tra các thay đổi local đang có ở `pom.xml` và `.mvn/wrapper/maven-wrapper.properties` để không ghi đè chúng.
4. Sau mỗi đợt, nghiệm thu bằng luồng thật giữa các role và dữ liệu MySQL; kiểm tra quyền truy cập trực tiếp vào API, không chỉ kiểm tra nút trên FE.

Tài liệu tham khảo: [Spring Boot/Flyway](https://docs.spring.io/spring-boot/how-to/data-initialization.html), [Spring Security method security](https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html), [Spring Security CSRF cho upload](https://docs.spring.io/spring-security/reference/features/exploits/csrf.html).
