# Claude Code 실행 프롬프트
프로젝트명: My Avatar Dance Master

아래 요구사항에 맞춰 **MySQL용 실제 테이블 설계 SQL**과 **FastAPI + MySQL 연결용 starter 코드**를 생성해줘.

이 프로젝트는 K-pop 안무 학습 앱이며, 사용자의 연습 세션, 점수, 오답 노트 리포트, 아바타 렌더 기록까지 저장해야 한다.  
백엔드는 Python FastAPI 기반이며, DB는 MySQL을 사용한다.

---

## 목표
다음 산출물을 만들어줘.

1. **MySQL CREATE TABLE SQL 파일**
2. **FastAPI + SQLAlchemy + PyMySQL 기반 starter backend 코드**
3. **Alembic 초기 마이그레이션 구조**
4. **.env.example**
5. **requirements.txt**
6. **최소 실행 가능한 API 예제**
7. **프로젝트 폴더 구조**

---

## 기술 스택
- Python 3.11+
- FastAPI
- SQLAlchemy 2.x
- PyMySQL
- Alembic
- Pydantic
- python-dotenv
- Uvicorn

---

## 반드시 지켜야 할 설계 방향
- 구조는 실서비스형으로 작성할 것
- 유지보수 가능하게 모듈 분리할 것
- 타입 힌트 충분히 넣을 것
- SQLAlchemy 2.x 스타일 사용할 것
- sync 방식으로 먼저 starter 구성할 것
- 나중에 확장 가능하도록 repositories 패턴을 고려할 것
- MySQL 기준으로 작성할 것
- 모든 주요 테이블에 `created_at`, `updated_at`를 넣을 것
- PK는 bigint 또는 int 기준으로 일관성 있게 설계할 것
- 외래키(FK), 인덱스, unique 제약조건을 적절히 넣을 것
- JSON 컬럼이 필요한 곳은 MySQL JSON 타입 사용 가능
- 초기 starter 코드는 바로 실행 가능해야 함

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
- status는 active/inactive/suspended 정도를 고려

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
- session_id unique 또는 one-to-one 관계 고려

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
다음 파일을 만들어줘.

### `sql/schema.sql`
내용:
- database 생성문은 optional
- `CREATE TABLE IF NOT EXISTS ...`
- FK 포함
- index 포함
- charset/collation 고려
- InnoDB 기준
- timestamp 컬럼 포함
- soft delete는 starter에서는 optional

그리고 SQL 아래에 짧게 설명도 달아줘:
- 왜 이렇게 테이블을 나눴는지
- 어떤 테이블이 핵심인지
- 어떤 JSON 컬럼이 왜 필요한지

---

## FastAPI starter 코드 요구사항

### 폴더 구조
아래 구조로 starter 코드를 작성해줘.

```bash
backend/
├─ app/
│  ├─ main.py
│  ├─ core/
│  │  ├─ config.py
│  │  ├─ database.py
│  │  └─ db_init.py
│  ├─ models/
│  │  ├─ base.py
│  │  ├─ user.py
│  │  ├─ dance_reference.py
│  │  ├─ practice_session.py
│  │  ├─ session_frame.py
│  │  ├─ analysis_report.py
│  │  └─ avatar_render.py
│  ├─ schemas/
│  │  ├─ user.py
│  │  ├─ practice_session.py
│  │  └─ analysis_report.py
│  ├─ api/
│  │  └─ routes/
│  │     ├─ health.py
│  │     ├─ users.py
│  │     └─ sessions.py
│  ├─ repositories/
│  │  ├─ user_repository.py
│  │  └─ session_repository.py
│  └─ dependencies/
│     └─ db.py
├─ alembic/
├─ alembic.ini
├─ requirements.txt
├─ .env.example
└─ sql/
   └─ schema.sql



   
---

아래는 더 짧은 **압축형 버전**입니다. Claude Code가 길게 읽지 못하거나, 먼저 초안을 빨리 뽑고 싶을 때 쓰시면 됩니다.

```md
My Avatar Dance Master 프로젝트용으로 MySQL 테이블 설계 SQL과 FastAPI starter backend 코드를 생성해줘.

요구사항:
- Python + FastAPI + SQLAlchemy 2.x + PyMySQL + Alembic
- MySQL 기준
- 실서비스형 구조
- 바로 실행 가능한 starter 코드
- SQL과 코드 모두 실제 복붙 가능해야 함

필수 테이블:
- users
- dance_references
- practice_sessions
- session_frames
- analysis_reports
- avatar_renders
- optional: reward_items, user_reward_items

필수 조건:
- created_at, updated_at 포함
- FK, index, unique 적절히 적용
- pose_json / report_json은 JSON 타입
- analysis_reports는 practice_sessions와 1:1
- avatar_renders는 session과 1:N

필수 파일:
- sql/schema.sql
- requirements.txt
- .env.example
- app/core/config.py
- app/core/database.py
- app/core/db_init.py
- app/models/*
- app/schemas/*
- app/repositories/*
- app/api/routes/health.py
- app/api/routes/users.py
- app/api/routes/sessions.py
- app/main.py
- Alembic 초기 설정 예시

폴더 구조:
backend/
  app/
    core/
    models/
    schemas/
    repositories/
    api/routes/
    dependencies/
  alembic/
  sql/schema.sql
  requirements.txt
  .env.example

출력 순서:
1. 폴더 구조
2. schema.sql
3. requirements.txt
4. .env.example
5. config.py
6. database.py
7. base.py
8. models
9. schemas
10. repositories
11. routes
12. main.py
13. db_init.py
14. alembic 설정
15. 실행 방법