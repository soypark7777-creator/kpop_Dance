# Kpop Dance

K-pop 댄스 자세 분석과 아바타 리플레이를 함께 제공하는 연습 앱입니다.

사용자는 영상을 업로드하거나 실시간 연습을 통해 동작을 분석하고,  
관리자는 세션과 업로드 결과를 확인하며 운영할 수 있습니다.

## 프로젝트 한눈에 보기

- 프런트엔드: `Next.js + TypeScript + Tailwind CSS`
- 백엔드: `Flask + SQLAlchemy + MySQL`
- 분석 로직: `MediaPipe + 관절 각도 계산 + DTW 유사도`
- 리포트: 세션별 점수, 흔들린 관절, 구간별 점수, 피드백
- 아바타: Unity export JSON 생성
- 관리자: 사용자, 세션, 렌더, 리워드 운영 화면

## 현재 구현 상태

- 로그인 / 회원가입 가능
- 관리자 로그인 및 관리자 페이지 가능
- 세션 시작 / 종료 / 분석 리포트 가능
- 실시간 스트림 가능
- 영상 업로드 후 프레임 분석 가능
- 아바타 렌더 및 Unity export JSON 가능
- 업로드/관리자 필터 및 정렬 가능

## 빠른 실행

### 1. 프런트엔드 실행

```powershell
cd C:\PROJECT\Kpop_Dance\frontend
npm install
npm run dev
```

브라우저에서:
- `http://127.0.0.1:3000`

### 2. 백엔드 테스트 서버 실행

테스트용 SQLite 모드:

```powershell
cd C:\PROJECT\Kpop_Dance\backend
python dev_test_server.py
```

백엔드 주소:
- `http://127.0.0.1:5001`

### 3. 실제 MySQL 백엔드 실행

`backend/.env.example`를 복사해 `.env`를 만들고 MySQL 정보를 넣습니다.

```powershell
cd C:\PROJECT\Kpop_Dance\backend
python -m pip install -r requirements.txt
python run.py
```

## 핵심 기능

### 사용자 기능

- 회원가입 / 로그인
- 홈에서 사용자 상태 확인
- 안무 목록 조회
- 연습 세션 시작 / 종료
- 실시간 자세 비교
- 분석 리포트 조회
- 영상 업로드 분석
- 아바타와 무대 선택

### 관리자 기능

- 관리자 로그인
- 사용자 목록 조회 및 수정
- 세션 목록 조회 및 필터링
- 세션 상세 편집
- 렌더 목록 조회
- 리워드 목록 조회

### 분석 기능

- MediaPipe 기반 포즈 추출
- 관절 각도 계산
- DTW 기반 동작 흐름 비교
- 구간별 점수 계산
- 피드백 메시지 생성
- 흔들린 관절 강조

## 주요 화면

- `/` : 홈
- `/auth` : 로그인 / 회원가입
- `/practice` : 연습
- `/report/[sessionId]` : 리포트
- `/replay/[sessionId]` : 리플레이
- `/avatar` : 아바타 선택 및 렌더
- `/upload` : 영상 업로드
- `/admin` : 관리자

## API 요약

### 인증

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### 사용자 / 안무 / 세션

- `GET /api/users/me`
- `GET /api/users/me/sessions`
- `GET /api/dance-references`
- `GET /api/dance-references/<id>`
- `POST /api/session/start`
- `POST /api/session/end`
- `GET /api/session/<session_id>`
- `GET /api/session/<session_id>/frames`

### 실시간 분석

- `GET /api/stream/live`
- `GET /api/analysis/<session_id>`

### 아바타

- `GET /api/avatar/items`
- `POST /api/avatar/render`
- `GET /api/avatar/render/<render_id>`
- `GET /api/avatar/export/<session_id>`

### 영상 업로드

- `POST /api/uploads/video`
- `GET /api/uploads/video/<upload_id>`
- `GET /api/uploads/video/<upload_id>/file`
- `GET /api/uploads/video/<upload_id>/frames/<frame_name>`

### 관리자

- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `PATCH /api/admin/users/<user_id>`
- `GET /api/admin/sessions`
- `PATCH /api/admin/sessions/<session_id>`
- `GET /api/admin/renders`
- `GET /api/admin/rewards`

## 문서 진입점

- [프로젝트 개요](kpopMD/00_PROJECT_OVERVIEW.md)
- [공통 규칙](kpopMD/01_COMMON_RULES.md)
- [백엔드 가이드](kpopMD/02_BACKEND_GUIDE.md)
- [프런트 UX 가이드](kpopMD/03_FRONTEND_UX_GUIDE.md)
- [DB 가이드](kpopMD/04_DATABASE_GUIDE.md)
- [진행 체크리스트](kpopMD/05_PROGRESS_CHECKLIST.md)
- [백엔드 단계별 계획](kpopMD/07_BACKEND_STEP_BY_STEP_PLAN.md)
- [점수 계산 흐름](kpopMD/09_BACKEND_SCORING_FLOW.md)
- [가중치 가이드](kpopMD/10_SCORING_WEIGHT_GUIDE.md)
- [영상 업로드 파이프라인](kpopMD/11_VIDEO_UPLOAD_PIPELINE.md)
- [MediaPipe vs fallback 비교](kpopMD/12_MEDIAPIPE_FALLBACK_COMPARISON.md)
- [로그인 / 회원가입 / 관리자 테스트 플로우](kpopMD/13_AUTH_SIGNUP_ADMIN_TEST_FLOW.md)
- [관리자 초기화 가이드](kpopMD/14_ADMIN_BOOTSTRAP_GUIDE.md)
- [배포 가이드](kpopMD/15_DEPLOYMENT_GUIDE.md)
- [다음 작업 계획](kpopMD/16_NEXT_STEP_PLAN.md)
- [Unity API 계약서](kpopMD/17_UNITY_API_CONTRACT.md)

## 디렉터리 구조

```text
Kpop_Dance/
├─ backend/
│  ├─ app/
│  │  ├─ api/
│  │  ├─ models/
│  │  ├─ repositories/
│  │  ├─ schemas/
│  │  ├─ services/
│  │  └─ utils/
│  ├─ sql/
│  ├─ migrations/
│  └─ run.py
├─ frontend/
│  ├─ app/
│  ├─ components/
│  ├─ hooks/
│  ├─ lib/
│  └─ store/
└─ kpopMD/
   └─ project docs
```

## 점수 계산 방식

아래 흐름으로 점수를 계산합니다.

```text
프레임 입력
  -> MediaPipe 포즈 추출
  -> 관절 각도 계산
  -> 기준 안무와 비교
  -> DTW로 동작 흐름 비교
  -> 틀린 관절 / 평균 오차 / 구간별 점수 계산
  -> 피드백 생성
  -> 리포트 저장
```

자세한 설명은 다음 문서를 참고하면 됩니다.
- [점수 계산 흐름](kpopMD/09_BACKEND_SCORING_FLOW.md)
- [가중치 가이드](kpopMD/10_SCORING_WEIGHT_GUIDE.md)

## Unity 연동 방향

Unity는 아래 순서로 붙이면 됩니다.

1. 로그인해서 토큰 받기
2. 세션 시작
3. 실시간 스트림 받기
4. 세션 종료
5. 분석 리포트 받기
6. `avatar/export` JSON으로 리플레이 씬 구성

계약 문서는 다음 파일을 참고하세요.
- [Unity API 계약서](kpopMD/17_UNITY_API_CONTRACT.md)

## 참고

- 이 저장소는 현재 구현이 많이 진행된 상태입니다.
- 일부 외부 연동(Unity 실프로젝트 연결, 실제 사람 영상 비교 등)은 다음 단계로 남아 있습니다.
- 개발 진행 상황은 [진행 체크리스트](kpopMD/05_PROGRESS_CHECKLIST.md)에서 확인할 수 있습니다.
