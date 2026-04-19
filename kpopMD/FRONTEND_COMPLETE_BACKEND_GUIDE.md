# 📋 Frontend 완료 현황 & 백엔드 구성 가이드

> 작성일: 2026-04-18  
> 작성 목적: 프론트엔드 먼저 완성된 상태에서 백엔드를 설계·구현할 때 충돌 없이 연결하기 위한 레퍼런스

---

## 📊 전체 진행률 (업데이트됨)

```
전체 진행률:  ███████░░░ 65% (프론트엔드 완료, 백엔드 미시작)
```

| 영역 | 상태 | 진행률 | 비고 |
|---|---|---|---|
| 문서화/설계 | ✅ 완료 | 100% | kpopMD/ 폴더 |
| **Frontend 기반** | ✅ 완료 | 100% | types, mock, api, store |
| **Frontend 화면** | ✅ 완료 | 100% | 6개 페이지 전부 |
| **Frontend 컴포넌트** | ✅ 완료 | 100% | 14개 컴포넌트 |
| DB 스키마 | ⬜ 미시작 | 0% | AVATAR_DANCE_MASTER_INSTRUCTIONS.md 참고 |
| Backend 기반 | ⬜ 미시작 | 0% | Flask + SQLAlchemy |
| Backend API | ⬜ 미시작 | 0% | 아래 API 명세 참고 |
| 관리자 페이지 | ⬜ 미시작 | 0% | Phase 4 |
| Unity 연동 | ⬜ 미시작 | 0% | Phase 5 |

---

## ✅ Phase 3 체크리스트 — Frontend 완료 항목

### 📁 기반 파일 (lib/)
- [x] `lib/types.ts` — 전체 시스템 공통 타입 정의
  - `JointName` (13개): nose, left_shoulder, right_shoulder, left_elbow, right_elbow, left_wrist, right_wrist, left_hip, right_hip, left_knee, right_knee, left_ankle, right_ankle
  - `SKELETON_CONNECTIONS` — 14쌍 연결 정보
  - `SessionFrame`, `AnalysisReport`, `SectionScore`, `LiveFrameData`
  - `ReplayStatus`, `PracticeStatus`, `WsConnectionStatus`
  - `getScoreColor()`, `getScoreLabel()`, `getScoreGrade()` 헬퍼
- [x] `lib/mock.ts` — 백엔드 없이 동작하는 mock 데이터
  - `MOCK_USER`, `MOCK_DANCE_REFERENCES` (5개), `MOCK_RECENT_SESSIONS`
  - `MOCK_ANALYSIS_REPORT` (6개 구간 점수 포함)
  - `createMockSessionFrames(sessionId)` — 90프레임, 15fps
  - `generateMockLiveFrame(sessionId)` — SSE 프레임 생성
- [x] `lib/api.ts` — API 클라이언트 (MOCK_MODE 플래그 포함)
  - `MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'`
  - `userApi`, `danceApi`, `sessionApi`, `reportApi`, `replayApi`, `avatarApi` 그룹
  - **백엔드 연결 시 `.env.local`에서 `NEXT_PUBLIC_MOCK_MODE=false` 로만 변경하면 됨**
- [x] `lib/drawSkeleton.ts` — Canvas 2D API 스켈레톤 렌더러
  - `drawUserSkeleton(canvas, pose, jointErrors?, opts?)`
  - `drawGhostSkeleton(canvas, pose, opts?)` — 반투명 보라색 기준 포즈
  - `drawComparisonSkeleton(canvas, userPose, refPose, errors?)`
  - `highlightJoint(canvas, pose, joint, color?, pulseRadius?)`
  - `syncCanvasSize(canvas, container)`

### 📁 상태관리 (store/)
- [x] `store/danceStore.ts` — Zustand 통합 스토어
  - **LiveSessionSlice**: 실시간 포즈, 점수, 피드백, joint_errors
  - **ReportSlice**: AnalysisReport, 리플레이 프레임/상태/속도
  - **UserSlice**: 유저 정보, 아바타 선택 상태
  - `applyLiveFrame(frame)` — LiveFrameData 한 번에 적용
  - `useDanceStore.getState()` — 콜백 내부에서 stale closure 방지

### 📁 훅 (hooks/)
- [x] `hooks/useLiveDanceSession.ts` — 연습 세션 전체 생명주기
  - 카메라 권한 → 세션 시작 → SSE 연결 → 종료 → 리포트 이동
- [x] `hooks/useWebSocketDance.ts` — SSE(Server-Sent Events) 연결 훅
  - `EventSource` 기반 (WebSocket 아님, SSE)
  - mock 모드: `setInterval`로 `generateMockLiveFrame()` 호출

### 📁 공통 컴포넌트 (components/)
- [x] `components/BottomNav.tsx` — 모바일 하단 공통 내비게이션 (`usePathname` 기반 active)
- [x] `components/DanceCard.tsx` — 안무 선택 카드
- [x] `components/StreakCard.tsx` — 연속 연습 일수 카드
- [x] `components/RankBadge.tsx` — 유저 등급 배지
- [x] `components/CameraStage.tsx` — 카메라 뷰 + Canvas 오버레이
- [x] `components/SkeletonOverlay.tsx` — 사용자 스켈레톤 (틀린 관절 빨간색)
- [x] `components/GhostGuideOverlay.tsx` — 기준 안무 고스트 (반투명 보라)
- [x] `components/FeedbackPanel.tsx` — 실시간 피드백 메시지 카드
- [x] `components/ScoreBar.tsx` — 실시간 점수 바
- [x] `components/ErrorJointBadge.tsx` — 틀린 관절 배지
- [x] `components/MobileBottomControls.tsx` — 연습 중 하단 컨트롤 (미러/스켈레톤 토글)
- [x] `components/SectionScoreChart.tsx` — 구간 점수 차트
- [x] `components/AvatarRewardCard.tsx` — 아바타/의상/무대 아이템 카드
- [x] `components/ReplayTimeline.tsx` — 리플레이 타임라인 (전체 구현)
  - Score Waveform, Seek 슬라이더, 섹션 점프, 속도 조절, 1/5 프레임 스텝

### 📁 페이지 (app/)
- [x] `app/layout.tsx` — Pretendard 폰트, 공통 레이아웃
- [x] `app/globals.css` — CSS 변수 (`--color-primary` 등), Pretendard Variable 폰트
- [x] `app/page.tsx` — 홈 (Hero, 스트릭, 안무 목록, 최근 기록)
- [x] `app/practice/page.tsx` — 연습 화면 (안무 선택 → 카운트다운 → 녹화 → 종료)
- [x] `app/report/[sessionId]/page.tsx` — 오답 노트 리포트
- [x] `app/replay/[sessionId]/page.tsx` — Skeleton Replay Studio (전체 구현)
  - 원근 격자 Canvas 배경, 오버레이/분할/단독 뷰, 재생 루프
- [x] `app/avatar/page.tsx` — 아바타 선택 및 퍼포먼스 생성

---

## ⚠️ 백엔드 설계 전 반드시 알아야 할 주의사항

### 1. 🔑 Joint Naming — 절대 변경 금지

프론트엔드의 모든 타입, Canvas 렌더러, Zustand 스토어, mock 데이터가 아래 13개 이름 기준으로 고정되어 있다.

```python
# backend에서도 반드시 이 이름 사용
JOINT_NAMES = [
    'nose',
    'left_shoulder', 'right_shoulder',
    'left_elbow',    'right_elbow',
    'left_wrist',    'right_wrist',
    'left_hip',      'right_hip',
    'left_knee',     'right_knee',
    'left_ankle',    'right_ankle',
]
```

> MediaPipe의 기본 landmark 인덱스(0~32)를 위 이름으로 매핑해서 내보내야 한다.
> 이름이 달라지면 프론트 Canvas 렌더링 전체가 깨진다.

---

### 2. 📡 SSE 프레임 포맷 — `LiveFrameData`와 100% 일치

프론트 `hooks/useWebSocketDance.ts`는 아래 형식의 SSE 이벤트를 파싱한다.

```python
# Flask SSE 응답 포맷 (반드시 이 구조)
frame_data = {
    "session_id":     "uuid-string",
    "timestamp":      1713000000000,        # unix ms
    "user_pose":      { "nose": {"x": 0.5, "y": 0.12, "visibility": 0.99}, ... },
    "reference_pose": { "nose": {"x": 0.5, "y": 0.12}, ... },
    "joint_errors": {
        "left_elbow": {
            "joint":      "left_elbow",
            "status":     "wrong",           # "correct" | "wrong" | "missing"
            "angle_diff": 18.5,              # 도(degree)
            "direction":  "올려요"           # 한국어 피드백
        }
    },
    "feedback": {
        "level":        "needs_fix",         # "perfect" | "good" | "needs_fix"
        "text":         "왼팔 팔꿈치를 올려요",
        "target_joint": "left_elbow",        # optional
        "timestamp":    1713000000000
    },
    "match_score":    82,                    # 0~100 정수
    "is_recording":   True,
    "section_index":  2                      # optional
}

# SSE 포맷
yield f"data: {json.dumps(frame_data, ensure_ascii=False)}\n\n"
```

> `Content-Type: text/event-stream`, `X-Accel-Buffering: no` 헤더 필수

---

### 3. 📊 분석 리포트 포맷 — `AnalysisReport`와 100% 일치

세션 종료 후 `POST /api/session/end` 응답 또는 `GET /api/analysis/<session_id>` 응답이 아래 형식이어야 한다.

```python
analysis_report = {
    "id":            1,
    "session_id":    "uuid-string",
    "total_score":   85,
    "weakest_section": {
        "section_index": 3,
        "section_name":  "2절",
        "start_time":    95,    # 초
        "end_time":      135,
        "score":         71
    },
    "most_wrong_joints": ["left_elbow", "right_knee", "left_wrist"],  # JointName[]
    "average_angle_error": 12.4,
    "section_scores": [
        {"section_index": 0, "section_name": "인트로",   "start_time": 0,   "end_time": 20,  "score": 88},
        {"section_index": 1, "section_name": "1절",      "start_time": 20,  "end_time": 60,  "score": 82},
        {"section_index": 2, "section_name": "후렴 1",   "start_time": 60,  "end_time": 95,  "score": 91},
        {"section_index": 3, "section_name": "2절",      "start_time": 95,  "end_time": 135, "score": 71},
        {"section_index": 4, "section_name": "후렴 2",   "start_time": 135, "end_time": 170, "score": 85},
        {"section_index": 5, "section_name": "아웃트로", "start_time": 170, "end_time": 187, "score": 89}
    ],
    "report_json": {
        "coach_comment":     "전반적으로 좋아요! 2절 왼팔 팔꿈치 집중 연습 추천.",
        "improvement_tips":  ["왼팔 팔꿈치를 어깨 높이까지 올려보세요", ...],
        "best_section":      { ...section_score }
    },
    "created_at": "2026-04-18T10:04:30Z"
}
```

---

### 4. 🎬 세션 프레임 포맷 — `SessionFrame`와 100% 일치

리플레이 페이지 (`GET /api/sessions/<id>/frames`) 응답 배열의 각 원소:

```python
session_frame = {
    "id":                1,
    "session_id":        "uuid-string",
    "frame_index":       0,
    "timestamp_seconds": 0.0,    # float, 0부터 시작
    "pose_json": {               # PoseDataExtended — 위치 + 선택적 회전
        "nose":          {"x": 0.50, "y": 0.12, "visibility": 0.99},
        "left_shoulder": {"x": 0.38, "y": 0.28, "visibility": 0.99,
                          "rotation": {"x": 0, "y": 0, "z": 0, "w": 1},  # Unity용, optional
                          "angle": 90.0},                                   # optional
        ...
    },
    "score": 82.5
}
```

> 현재 리플레이 페이지는 `reference_pose`를 별도로 가져오지 않고 프론트에서 재생성한다.  
> **백엔드에서 `GET /api/sessions/<id>/frames`에 `reference_pose`도 같이 반환**하면 더 정확한 비교가 가능하다 (향후 개선 포인트).

---

### 5. 🌐 API 응답 포맷 — 모든 엔드포인트 통일

```python
# 성공 응답 (반드시 이 구조)
{
    "success": True,
    "data":    { ... },
    "message": "ok"           # optional
}

# 에러 응답
{
    "success": False,
    "error":   "세션을 찾을 수 없습니다",
    "code":    "SESSION_NOT_FOUND",  # optional
    "status":  404                   # optional
}
```

> `lib/api.ts`의 `callApi()` 함수가 `success` 필드를 기준으로 파싱함.

---

### 6. 🔌 SSE vs WebSocket

프론트 코드는 이름이 `useWebSocketDance`이지만 **실제로는 SSE(Server-Sent Events) 사용**:

```typescript
// hooks/useWebSocketDance.ts 내부
const eventSource = new EventSource(`${API_BASE}/api/stream/live?session_id=${sessionId}`)
eventSource.onmessage = (e) => {
    const frame: LiveFrameData = JSON.parse(e.data)
    store.applyLiveFrame(frame)
}
```

따라서 백엔드는 **WebSocket이 아니라 SSE 엔드포인트**를 구현해야 한다:

```python
# Flask SSE 엔드포인트
@stream_bp.route('/api/stream/live')
def live_stream():
    session_id = request.args.get('session_id')
    
    def generate():
        while session_active(session_id):
            frame = analyze_frame(session_id)
            yield f"data: {json.dumps(frame, ensure_ascii=False)}\n\n"
            time.sleep(1/30)  # 30fps
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control':      'no-cache',
            'X-Accel-Buffering':  'no',    # Nginx 버퍼링 방지
            'Access-Control-Allow-Origin': '*',
        }
    )
```

---

### 7. 📂 기준 안무 JSON 구조

프론트에서 기준 안무를 로딩할 때 `DanceReference.reference_json_path`를 사용한다.  
이 파일의 구조가 정해져야 백엔드 분석 서비스가 로딩할 수 있다.

```json
{
    "dance_id": 1,
    "title": "Pink Venom",
    "artist_name": "BLACKPINK",
    "fps": 30,
    "duration_seconds": 187,
    "sections": [
        {
            "section_index": 0,
            "section_name": "인트로",
            "start_time": 0,
            "end_time": 20
        }
    ],
    "frames": [
        {
            "frame_index": 0,
            "timestamp_seconds": 0.0,
            "pose": {
                "nose":          {"x": 0.50, "y": 0.12},
                "left_shoulder": {"x": 0.38, "y": 0.28},
                ...
            }
        }
    ]
}
```

---

### 8. 🎭 아바타 렌더 플로우

```
총점 >= 80 → unlock_avatar_render = true → /avatar 페이지에서 아바타/무대/의상 선택
→ POST /api/avatar/render → render_status = 'processing'
→ 폴링 또는 SSE로 완료 확인 → output_url 반환
```

프론트 `app/avatar/page.tsx`는 `AvatarRender.render_status`를 폴링해서 완료 시 영상을 표시한다.

---

## 🗺️ 백엔드 구현 우선순위 (권장 순서)

```
Step 1  DB 스키마 생성 (sql/schema.sql)
Step 2  Flask Application Factory + Blueprint 구조 초기화
Step 3  GET /api/health — 연결 확인
Step 4  GET /api/dances — 안무 목록 (mock 데이터로 시작 가능)
Step 5  POST /api/session/start — 세션 발급
Step 6  GET /api/stream/live — SSE 스트림 (MediaPipe 연동)
Step 7  POST /api/session/end — 세션 종료 + DTW 점수 계산
Step 8  GET /api/sessions/<id>/report — 분석 리포트
Step 9  GET /api/sessions/<id>/frames — 리플레이 프레임
Step 10 POST /api/avatar/render — Unity export JSON 생성
Step 11 GET /api/users/<id> — 유저 프로필
Step 12 인증 (JWT)
```

---

## 🔗 프론트 → 백엔드 API 엔드포인트 매핑 전체표

| 프론트 호출 (`lib/api.ts`) | HTTP | 백엔드 엔드포인트 | 응답 타입 |
|---|---|---|---|
| `userApi.getProfile()` | GET | `/api/users/me` | `User` |
| `danceApi.getList()` | GET | `/api/dances` | `DanceReference[]` |
| `danceApi.getById(id)` | GET | `/api/dances/:id` | `DanceReference` |
| `sessionApi.start(req)` | POST | `/api/session/start` | `StartSessionResponse` |
| `sessionApi.end(req)` | POST | `/api/session/end` | `EndSessionResponse` |
| `sessionApi.getRecent()` | GET | `/api/sessions/recent` | `PracticeSession[]` |
| `reportApi.getBySession(id)` | GET | `/api/sessions/:id/report` | `AnalysisReport` |
| `replayApi.getFrames(id)` | GET | `/api/sessions/:id/frames` | `SessionFrame[]` |
| `avatarApi.getItems()` | GET | `/api/avatar/items` | `AvatarItem[]` |
| `avatarApi.requestRender(req)` | POST | `/api/avatar/render` | `AvatarRender` |
| `avatarApi.getRenderStatus(id)` | GET | `/api/avatar/renders/:id` | `AvatarRender` |
| *(SSE 직접 연결)* | GET | `/api/stream/live?session_id=` | `LiveFrameData` stream |

---

## 🔄 백엔드 연결 전환 방법 (프론트 변경 사항 최소화)

백엔드가 준비되면 아래 단계만 실행하면 된다:

```bash
# 1. .env.local 파일 수정
NEXT_PUBLIC_MOCK_MODE=false
NEXT_PUBLIC_API_URL=http://localhost:5000

# 2. CORS 설정 확인 (Flask)
# Flask-CORS origins에 http://localhost:3000 포함 필요

# 3. 재시작
npm run dev
```

> `lib/api.ts`의 각 함수에서 `MOCK_MODE` 분기가 이미 구현되어 있어서  
> `.env.local` 값 변경 외에 프론트 코드 수정은 원칙적으로 불필요하다.

---

## 🚨 백엔드 구현 시 자주 실수하는 포인트

| 실수 | 올바른 방법 |
|---|---|
| Joint 이름을 `leftShoulder` 스타일로 작성 | 반드시 `left_shoulder` (스네이크케이스) |
| 포즈 좌표를 픽셀값으로 반환 | 반드시 **정규화(0.0~1.0)** 값으로 반환 |
| SSE 대신 WebSocket 구현 | 프론트는 `EventSource` (SSE) 사용, WebSocket 아님 |
| 응답에 `success` 필드 누락 | `{"success": true, "data": ...}` 형식 필수 |
| `section_scores`를 dict로 반환 | 반드시 **배열(list)** — `section_index`로 정렬 |
| `match_score`를 float으로 반환 | 프론트는 `Math.round()`하므로 float도 허용되나 0~100 범위 보장 필요 |
| 관절 visibility 없이 pose 반환 | visibility 0~1 값 포함 권장 (없으면 그리기 스킵 로직 적용됨) |
| UTF-8 미설정으로 한글 깨짐 | Flask `app.config['JSON_AS_ASCII'] = False`, MySQL charset utf8mb4 |

---

## 📌 프론트엔드 코드 품질 자가 진단

| 항목 | 상태 | 비고 |
|---|---|---|
| TypeScript 타입 완성도 | ✅ 높음 | `lib/types.ts` 전체 커버 |
| Joint naming 일관성 | ✅ 준수 | 13개 이름 types.ts 기준 통일 |
| API 추상화 계층 | ✅ 구성됨 | `lib/api.ts` Mock/Real 분기 |
| 상태 관리 | ✅ Zustand | 3-slice 구조 |
| Canvas 렌더러 | ✅ 완성 | `drawSkeleton.ts` |
| SSE 연결 훅 | ✅ 구현 | `useWebSocketDance.ts` |
| 모바일 대응 | ✅ first | BottomNav, pb-safe, dvh |
| Pretendard 폰트 | ✅ Variable | 100~900 weight 전체 |
| CSS 변수 | ✅ 정의됨 | `--color-primary` 등 |
| MOCK → Real 전환 | ✅ 준비됨 | `.env.local` 1줄 변경 |
| 리플레이 Canvas | ✅ 완성 | 원근 격자, 4가지 뷰 모드 |
| 어드민 페이지 | ⬜ 미구현 | Phase 4 |
| JWT 인증 | ⬜ 미구현 | 백엔드 완료 후 추가 |
| 에러 바운더리 | ⬜ 미구현 | 향후 안정화 단계 |

---

*이 문서는 백엔드 작업 시작 전 반드시 읽고, API 구현 완료 시마다 체크리스트를 업데이트할 것.*
