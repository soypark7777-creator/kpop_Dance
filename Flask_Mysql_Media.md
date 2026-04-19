# Claude Code 실행 프롬프트
프로젝트명: My Avatar Dance Master

아래 요구사항에 맞춰 **MySQL용 실제 테이블 설계 SQL**과 **Flask + MySQL + MediaPipe 확장 가능한 starter backend 코드**를 생성해줘.

이 프로젝트는 K-pop 안무 학습 앱이며, 사용자의 연습 세션, 포즈 프레임, 점수, 오답 노트 리포트, 아바타 렌더 기록까지 저장해야 한다.  
백엔드는 Python **Flask 기반**이며, DB는 **MySQL**을 사용한다.

이 starter backend는 단순 CRUD 예제가 아니라, 이후 아래 기능이 자연스럽게 붙을 수 있도록 설계해야 한다.

- MediaPipe Pose 기반 실시간 포즈 분석
- 기준 안무 JSON 로딩
- 관절 각도 비교
- DTW 기반 점수 계산
- SSE 또는 SocketIO 실시간 스트리밍
- 세션 종료 후 리포트 생성
- Unity export JSON 생성
- 웹앱 / 모바일앱 공용 API

---

## 목표
다음 산출물을 만들어줘.

1. **MySQL CREATE TABLE SQL 파일**
2. **Flask + SQLAlchemy + PyMySQL 기반 starter backend 코드**
3. **Flask-Migrate 또는 Alembic 초기 마이그레이션 구조**
4. **.env.example**
5. **requirements.txt**
6. **최소 실행 가능한 API 예제**
7. **프로젝트 폴더 구조**
8. **향후 MediaPipe / SSE / Unity export 확장을 위한 placeholder 구조**

---

## 기술 스택
- Python 3.11+
- Flask
- Flask-CORS
- Flask-SQLAlchemy
- SQLAlchemy 2.x 스타일
- PyMySQL
- Flask-Migrate
- Pydantic
- python-dotenv
- Gunicorn
- 확장 고려:
  - mediapipe
  - opencv-python
  - numpy
  - scipy
  - flask-socketio
  - eventlet

---

## 반드시 지켜야 할 설계 방향
- 구조는 실서비스형으로 작성할 것
- 유지보수 가능하게 모듈 분리할 것
- 타입 힌트 충분히 넣을 것
- SQLAlchemy 2.x 스타일을 최대한 반영할 것
- sync 방식 starter로 먼저 구성할 것
- MySQL 기준으로 작성할 것
- 모든 주요 테이블에 `created_at`, `updated_at`를 넣을 것
- PK 타입은 일관성 있게 설계할 것
- FK, index, unique 제약조건을 적절히 넣을 것
- JSON 컬럼이 필요한 곳은 MySQL JSON 타입 사용 가능
- starter 코드는 바로 실행 가능해야 함
- Flask는 반드시 **Application Factory 패턴 + Blueprint 구조**로 설계할 것
- Flask-CORS 포함할 것
- repository/service 계층을 두어 추후 실시간 분석 로직을 넣기 쉽게 만들 것
- 향후 MediaPipe 서비스와 SSE 스트림이 자연스럽게 붙도록 구조를 미리 열어둘 것
- 웹앱과 모바일앱이 동일 API를 사용 가능해야 함

---

## 프로젝트의 미래 확장 시나리오
이 starter backend는 나중에 아래 기능을 붙일 수 있어야 한다.

### 1. MediaPipe Pose 연동
- webcam frame 또는 업로드 영상 frame 입력
- pose landmark 추출
- joint naming 정규화
- visibility 포함

### 2. 기준 안무 JSON 비교
- dance_references.reference_json_path 기반으로 기준 안무 로드
- 사용자 pose와 기준 pose 비교

### 3. 각도 계산
- shoulder-elbow-wrist
- hip-knee-ankle
- shoulder-hip-knee

### 4. DTW 점수 계산
- timing mismatch 보정
- total_score
- section_scores

### 5. SSE 실시간 스트리밍
- `/api/stream/live`
- 실시간 feedback, joint_errors, match_score 반환

### 6. 오답 노트 리포트
- weakest_section
- most_wrong_joints
- average_angle_error
- report_json

### 7. Unity export
- session 기반 joint / position / optional rotation export JSON 제공

즉, starter 구조 자체가 **CRUD 앱이 아니라 분석 엔진으로 성장 가능한 구조**여야 한다.

---

## 필요한 테이블
아래 테이블들을 실제 MySQL SQL로 설계해줘.

### 1. users
필드 예시:
- id
- email
- password_hash
- nickname
- avatar_id
- points
- status
- created_at
- updated_at

조건:
- email unique
- nickname index 가능
- status는 active / inactive / suspended 고려

### 2. dance_references
필드 예시:
- id
- title
- artist_name
- difficulty
- duration_seconds
- thumbnail_url
- reference_json_path
- preview_video_url
- created_at
- updated_at

조건:
- title index
- difficulty index

### 3. practice_sessions
필드 예시:
- id
- user_id
- dance_reference_id
- started_at
- ended_at
- total_score
- lowest_section_score
- unlock_avatar_render
- session_status
- created_at
- updated_at

조건:
- users, dance_references FK 연결
- user_id index
- dance_reference_id index

### 4. session_frames
필드 예시:
- id
- session_id
- frame_index
- timestamp_seconds
- pose_json
- score
- created_at
- updated_at

조건:
- session_id FK
- session_id + frame_index index
- pose_json은 JSON 타입 고려

### 5. analysis_reports
필드 예시:
- id
- session_id
- weakest_section
- most_wrong_joints
- average_angle_error
- report_json
- created_at
- updated_at

조건:
- session_id FK
- most_wrong_joints / report_json은 JSON 타입 고려
- session_id unique 또는 1:1 구조 고려

### 6. avatar_renders
필드 예시:
- id
- user_id
- session_id
- avatar_id
- stage_theme_id
- costume_id
- render_status
- output_url
- requested_at
- completed_at
- created_at
- updated_at

조건:
- user_id FK
- session_id FK
- render_status index

### 7. optional: reward_items
필드 예시:
- id
- item_type
- item_name
- price_points
- is_premium
- metadata_json
- created_at
- updated_at

### 8. optional: user_reward_items
필드 예시:
- id
- user_id
- reward_item_id
- acquired_at
- created_at
- updated_at

---

## SQL 산출물 요구사항

### `sql/schema.sql`
내용:
- database 생성문은 optional
- `CREATE TABLE IF NOT EXISTS ...`
- FK 포함
- index 포함
- charset / collation 고려
- InnoDB 기준
- timestamp 컬럼 포함
- starter에서는 soft delete optional

그리고 SQL 아래에 짧게 설명도 달아줘:
- 왜 이렇게 테이블을 나눴는지
- 어떤 테이블이 핵심인지
- 어떤 JSON 컬럼이 왜 필요한지
- 어떤 테이블이 MediaPipe / SSE / Unity export 확장과 연결되는지

---

## Flask starter 코드 요구사항

### 폴더 구조
아래 구조로 starter 코드를 작성해줘.

```bash
backend/
├─ app/
│  ├─ __init__.py
│  ├─ config.py
│  ├─ extensions.py
│  ├─ api/
│  │  ├─ __init__.py
│  │  └─ routes/
│  │     ├─ __init__.py
│  │     ├─ health.py
│  │     ├─ users.py
│  │     ├─ sessions.py
│  │     ├─ references.py
│  │     └─ stream.py
│  ├─ models/
│  │  ├─ __init__.py
│  │  ├─ base.py
│  │  ├─ user.py
│  │  ├─ dance_reference.py
│  │  ├─ practice_session.py
│  │  ├─ session_frame.py
│  │  ├─ analysis_report.py
│  │  ├─ avatar_render.py
│  │  ├─ reward_item.py
│  │  └─ user_reward_item.py
│  ├─ schemas/
│  │  ├─ __init__.py
│  │  ├─ user.py
│  │  ├─ practice_session.py
│  │  ├─ analysis_report.py
│  │  ├─ dance_reference.py
│  │  └─ stream.py
│  ├─ repositories/
│  │  ├─ __init__.py
│  │  ├─ user_repository.py
│  │  ├─ session_repository.py
│  │  ├─ reference_repository.py
│  │  └─ report_repository.py
│  ├─ services/
│  │  ├─ __init__.py
│  │  ├─ health_service.py
│  │  ├─ session_service.py
│  │  ├─ reference_service.py
│  │  ├─ stream_service.py
│  │  ├─ mediapipe_pose_service.py
│  │  ├─ angle_service.py
│  │  ├─ dtw_service.py
│  │  ├─ feedback_service.py
│  │  ├─ replay_service.py
│  │  └─ avatar_export_service.py
│  ├─ utils/
│  │  ├─ __init__.py
│  │  ├─ response.py
│  │  ├─ geometry.py
│  │  └─ file_io.py
│  └─ storage/
│     ├─ dance_reference/
│     ├─ session_json/
│     └─ replay_exports/
├─ migrations/
├─ requirements.txt
├─ .env.example
├─ run.py
└─ sql/
   └─ schema.sql