# 백엔드 단계별 실행 계획

기준 문서:
- `FRONTEND_COMPLETE_BACKEND_GUIDE.md`
- `02_BACKEND_GUIDE.md`
- `04_DATABASE_GUIDE.md`

이 문서는 `kpop_dance` 백엔드를 프런트 계약과 충돌 없이 단계적으로 붙이기 위한 실행 가이드입니다.

## 현재 상태

- 프런트가 기대하는 API 계약은 `frontend/lib/api.ts`와 `frontend/lib/types.ts`에 반영되어 있습니다.
- Flask 백엔드는 `/api/health`부터 시작해 단계적으로 기능이 붙는 구조입니다.
- `success / data / message` 응답 형식을 사용합니다.
- SSE는 `EventSource` 기준으로 맞췄습니다.

## 단계별 계획

### 0단계. 작업 기준 고정

- [x] DB 이름과 문자셋을 `avatar_dance_db`, `utf8mb4`로 고정
- [x] 공통 응답 형식을 `{ success, data, message }`로 고정
- [x] 조인트 이름을 프런트와 동일하게 유지
- [x] SSE는 `EventSource` 기반으로 통일

완료 기준:
- 문서와 코드가 같은 계약을 바라본다.

### 1단계. 백엔드 기반 생성

- [x] `backend/app/__init__.py`
- [x] `backend/app/config.py`
- [x] `backend/app/extensions.py`
- [x] `backend/app/api/health_routes.py`
- [x] `backend/app/utils/response.py`
- [x] `backend/run.py`
- [x] `backend/requirements.txt`
- [x] `backend/.env.example`
- [x] `backend/sql/init.sql`

완료 기준:
- `GET /api/health`가 정상 응답한다.
- Flask 앱이 application factory 구조로 시작한다.

### 2단계. DB 스키마와 모델 연결

- [x] `users`
- [x] `dance_references`
- [x] `practice_sessions`
- [x] `session_frames`
- [x] `analysis_reports`
- [x] `avatar_renders`
- [x] `reward_items`
- [x] `user_reward_items`

완료 기준:
- SQL 스키마와 SQLAlchemy 모델의 필드 의미가 맞는다.
- 마이그레이션을 만들 수 있다.

### 3단계. 기본 조회 API

- [x] `GET /api/dance-references`
- [x] `GET /api/dance-references/<id>`
- [x] `GET /api/users/me`
- [x] `GET /api/users/me/sessions`

완료 기준:
- 프런트 리스트 화면이 mock 없이도 데이터를 받을 수 있다.
- DB가 비어 있으면 데모 폴백으로 응답한다.

### 4단계. 세션 API

- [x] `POST /api/session/start`
- [x] `POST /api/session/end`
- [x] `GET /api/session/<session_id>`
- [x] `GET /api/session/<session_id>/frames`

완료 기준:
- practice, report, replay 화면의 핵심 데이터가 연결된다.
- DB가 비어 있으면 demo 세션으로 이어진다.

### 5단계. 실시간 스트림

- [x] `GET /api/stream/live`
- [x] `LiveFrameData` 응답 형태 고정
- [x] mock 모드와 실제 모드 분리

완료 기준:
- 프런트 `EventSource`가 끊기지 않고 프레임을 받는다.

### 6단계. 분석과 리플레이

- [x] `GET /api/analysis/<session_id>`
- [x] 섹션 점수와 리포트 로직 연결
- [x] 세션 점수와 취약 구간 계산

완료 기준:
- report 페이지가 mock 없이 동작한다.

### 7단계. 아바타 출력

- [x] `GET /api/avatar/items`
- [x] `POST /api/avatar/render`
- [x] `GET /api/avatar/render/<render_id>`
- [x] `GET /api/avatar/export/<session_id>`

완료 기준:
- avatar 페이지와 Unity export 흐름이 연결된다.

### 8단계. 관리자와 보안

- [x] JWT 인증
- [x] 관리자 권한
- [x] rate limit
- [x] admin 페이지용 API
- [x] 관리자 페이지 사용자 검색/필터
- [x] 관리자 세션 상세 수정 API

완료 기준:
- 운영 기능과 보호 기능이 분리된다.
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `PATCH /api/admin/users/<user_id>`
- `GET /api/admin/sessions`
- `GET /api/admin/renders`
- `GET /api/admin/rewards`

### 9단계. 영상 업로드와 프레임 추출

- [x] `POST /api/uploads/video`
- [x] `GET /api/uploads/video/<upload_id>`
- [x] `GET /api/uploads/video/<upload_id>/file`
- [x] `GET /api/uploads/video/<upload_id>/frames/<frame_name>`
- [x] 업로드 저장 경로 정리
- [x] 프레임 미리보기 추출 서비스

완료 기준:
- 영상 파일을 서버가 저장한다.
- 가능한 경우 프레임 미리보기를 바로 뽑는다.
- 업로드 결과를 프런트가 바로 보여준다.

### 10단계. 업로드 분석과 리포트 연결

- [x] 업로드 프레임을 `pose_service`로 읽기
- [x] 기준 안무 JSON과 프레임별 비교
- [x] `analysis_service`로 점수와 피드백 생성
- [x] 업로드 결과를 `/report/<upload_id>`로 연결

완료 기준:
- 업로드한 영상이 바로 분석 리포트로 이어진다.
- 업로드 분석 결과를 다시 조회할 수 있다.

## 다음 작업

- 업로드 분석의 구간별 점수를 더 세분화한다. `완료`
- 업로드 결과를 관리자 화면에서 필터링할 수 있게 한다. `완료`
- 실제 MediaPipe가 설치된 환경에서 더 정확한 포즈 추출을 확인한다. `완료`

## 앞으로 할 일

- MediaPipe가 없는 환경과 있는 환경의 정확도 차이를 샘플 영상으로 비교한다.
- 업로드 리포트 화면에 구간별 점수와 불안정 관절을 더 시각적으로 보여준다.
- 관리자에서 업로드 결과를 점수/상태/분석 여부로 더 세밀하게 정렬하는 옵션을 추가한다.
