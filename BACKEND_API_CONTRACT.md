# 백엔드 API 계약서

프로젝트: K-pop Dance Clone / My Avatar Dance Master  
계약 버전: Phase 1, SSE 우선  
프런트엔드 기본 API 주소: `NEXT_PUBLIC_API_URL`, 기본값 `http://localhost:5000`

## 계약 원칙

- 일반 성공 응답은 `{ success, data, message, timestamp }` 형식을 사용한다.
- 일반 에러 응답은 `{ success, error, code, status, message, timestamp }` 형식을 사용한다.
- 1차 실시간 스트리밍 계약은 WebSocket이 아니라 SSE 기준이다.
- `useWebSocketDance.ts`는 기존 import 호환을 위해 파일명을 유지하지만, 실제 운영 연결은 `EventSource`를 사용한다.
- Joint 이름은 절대 변경하지 않는다:
  `nose`, `left_shoulder`, `right_shoulder`, `left_elbow`, `right_elbow`, `left_wrist`, `right_wrist`, `left_hip`, `right_hip`, `left_knee`, `right_knee`, `left_ankle`, `right_ankle`.

## 공통 성공 응답

```json
{
  "success": true,
  "data": {},
  "message": "ok",
  "timestamp": "2026-05-12T07:00:00.000Z"
}
```

## 공통 에러 응답

```json
{
  "success": false,
  "error": "Session not found",
  "code": "SESSION_NOT_FOUND",
  "status": 404,
  "message": "요청한 연습 세션을 찾을 수 없습니다.",
  "timestamp": "2026-05-12T07:00:00.000Z"
}
```

## POST `/api/session/start`

목적: 카운트다운과 실시간 점수 수신 전에 연습 세션을 생성한다.

사용 페이지/파일:
- `frontend/hooks/useLiveDanceSession.ts`
- `frontend/app/practice/page.tsx`

관련 DB 테이블:
- `practice_sessions`
- `dance_references`
- `users`

Request 예시:

```json
{
  "dance_reference_id": 1,
  "user_id": 1
}
```

Response 예시:

```json
{
  "success": true,
  "data": {
    "session_id": "session_20260512_0001",
    "dance_reference": {
      "id": 1,
      "title": "Pink Venom",
      "artist_name": "BLACKPINK",
      "difficulty": "hard",
      "duration_seconds": 187,
      "thumbnail_url": "/mock/thumbs/pink-venom.jpg",
      "preview_video_url": "/mock/videos/pink-venom-preview.mp4",
      "reference_json_path": "/storage/dance_reference/pink-venom.json",
      "created_at": "2026-05-12T07:00:00.000Z"
    },
    "stream_url": "http://localhost:5000/api/stream/live?session_id=session_20260512_0001",
    "started_at": "2026-05-12T07:00:00.000Z"
  },
  "message": "세션이 시작되었습니다.",
  "timestamp": "2026-05-12T07:00:00.000Z"
}
```

mock 데이터와 실제 데이터 차이:
- mock은 `mock_session_*` 값을 프런트에서 즉시 만든다.
- 실제 API는 `practice_sessions`에 `session_status = "in_progress"` 상태로 저장해야 한다.
- 실제 API는 유효한 SSE 주소인 `stream_url`을 반환해야 한다.

## GET `/api/stream/live`

목적: SSE로 실시간 포즈, 점수, 구간, 피드백 프레임을 전송한다.

사용 페이지/파일:
- `frontend/hooks/useWebSocketDance.ts`
- `frontend/store/danceStore.ts`
- `frontend/app/practice/page.tsx`

관련 DB 테이블:
- `practice_sessions`
- `session_frames`
- `dance_references`

Request query 예시:

```text
/api/stream/live?session_id=session_20260512_0001
```

SSE event data 예시:

```json
{
  "session_id": "session_20260512_0001",
  "timestamp": 1778569200000,
  "user_pose": {
    "left_shoulder": { "x": 0.38, "y": 0.28, "visibility": 0.99 }
  },
  "reference_pose": {
    "left_shoulder": { "x": 0.40, "y": 0.30, "visibility": 0.99 }
  },
  "joint_errors": {
    "left_elbow": {
      "joint": "left_elbow",
      "status": "wrong",
      "angle_diff": 18.5,
      "direction": "올려요"
    }
  },
  "feedback": {
    "level": "needs_fix",
    "text": "왼팔 팔꿈치를 올려요",
    "target_joint": "left_elbow",
    "timestamp": 1778569200000
  },
  "match_score": 82,
  "is_recording": true,
  "section_index": 2
}
```

mock 데이터와 실제 데이터 차이:
- mock은 `setInterval`과 `generateMockLiveFrame`으로 프레임을 생성한다.
- 실제 API는 같은 `LiveFrameData` 구조를 SSE의 `event.data`로 직접 보내야 한다.
- SSE 프레임은 공통 응답 wrapper로 감싸지 않는다.

## POST `/api/session/end`

목적: 연습 세션을 종료하고, 요약 점수와 분석 리포트를 저장한 뒤 반환한다.

사용 페이지/파일:
- `frontend/hooks/useLiveDanceSession.ts`

관련 DB 테이블:
- `practice_sessions`
- `session_frames`
- `analysis_reports`
- `avatar_renders`

Request 예시:

```json
{
  "session_id": "session_20260512_0001"
}
```

Response 예시:

```json
{
  "success": true,
  "data": {
    "session": {
      "id": 101,
      "user_id": 1,
      "dance_reference_id": 1,
      "started_at": "2026-05-12T07:00:00.000Z",
      "ended_at": "2026-05-12T07:04:00.000Z",
      "total_score": 85,
      "lowest_section_score": 71,
      "unlock_avatar_render": true,
      "session_status": "completed",
      "motion_similarity": 88.2,
      "average_angle_error": 12.4,
      "unstable_joint_count": 3,
      "most_wrong_joints": ["left_elbow", "right_knee", "left_wrist"],
      "created_at": "2026-05-12T07:00:00.000Z"
    },
    "report": {
      "id": 1,
      "session_id": "session_20260512_0001",
      "total_score": 85,
      "weakest_section": {
        "section_index": 3,
        "section_name": "2절",
        "start_time": 95,
        "end_time": 135,
        "score": 71
      },
      "most_wrong_joints": ["left_elbow", "right_knee", "left_wrist"],
      "average_angle_error": 12.4,
      "motion_similarity": 88.2,
      "section_scores": [],
      "report_json": {
        "coach_comment": "전반적으로 좋은 퍼포먼스예요.",
        "improvement_tips": ["왼팔 팔꿈치를 어깨 높이까지 올려보세요"],
        "best_section": {
          "section_index": 2,
          "section_name": "후렴 1",
          "start_time": 60,
          "end_time": 95,
          "score": 91
        }
      },
      "created_at": "2026-05-12T07:04:05.000Z"
    },
    "unlock_avatar_render": true
  },
  "message": "세션이 종료되었습니다.",
  "timestamp": "2026-05-12T07:04:05.000Z"
}
```

mock 데이터와 실제 데이터 차이:
- mock은 고정된 `MOCK_ANALYSIS_REPORT`를 반환한다.
- 실제 API는 저장된 프레임을 기반으로 점수를 계산하고 `analysis_reports`를 생성 또는 갱신해야 한다.

## GET `/api/analysis/:sessionId`

목적: 세션 ID만으로 리포트 페이지를 직접 로드한다.

사용 페이지/파일:
- `frontend/app/report/[sessionId]/page.tsx`
- `frontend/app/avatar/page.tsx`

관련 DB 테이블:
- `analysis_reports`
- `practice_sessions`
- `session_frames`

Response data:
- `AnalysisReport`

mock 데이터와 실제 데이터 차이:
- mock은 `MOCK_ANALYSIS_REPORT`를 fallback으로 사용한다.
- 실제 API는 `section_scores`, `weakest_section`, `most_wrong_joints`, `average_angle_error`, `motion_similarity`, `report_json.best_section`을 반드시 반환해야 한다.

## GET `/api/avatar/export/:sessionId`

목적: 완료된 세션의 Unity/아바타 export 데이터를 반환한다.

사용 페이지/파일:
- `frontend/lib/api.ts`의 `api.replay.getUnityExport`
- 추후 Unity 연동

관련 DB 테이블:
- `avatar_renders`
- `practice_sessions`
- `session_frames`
- `reward_items`
- `user_reward_items`

Response 예시:

```json
{
  "success": true,
  "data": {
    "session_id": "session_20260512_0001",
    "avatar": {
      "avatar_id": "avatar_002",
      "stage_theme_id": "stage_002",
      "costume_id": "costume_002"
    },
    "frames": [],
    "render_status": "completed",
    "output_url": "/renders/session_20260512_0001.mp4"
  },
  "message": "아바타 export 데이터가 준비되었습니다.",
  "timestamp": "2026-05-12T07:05:00.000Z"
}
```

mock 데이터와 실제 데이터 차이:
- mock은 `{ session_id, frames }`만 반환한다.
- 실제 API는 선택된 아바타, 무대, 의상, 렌더 상태를 함께 반환해야 한다.

## GET `/api/dance-references`

목적: 연습에서 선택 가능한 안무 목록을 불러온다.

사용 페이지/파일:
- `frontend/app/practice/page.tsx`
- `frontend/lib/api.ts`

관련 DB 테이블:
- `dance_references`

Response data:
- `DanceReference[]`

mock 데이터와 실제 데이터 차이:
- mock은 5개의 고정 곡을 사용한다.
- 실제 API는 Phase 1에서는 `data`에 단순 배열을 반환한다. 페이지네이션은 이후 단계에서 추가한다.

## GET `/api/dance-references/:id`

목적: 단일 안무 기준 데이터를 조회한다.

사용 페이지/파일:
- `frontend/lib/api.ts`
- 추후 상세 화면

관련 DB 테이블:
- `dance_references`

Response data:
- `DanceReference`

mock 데이터와 실제 데이터 차이:
- 실제 API는 존재하지 않는 ID에 대해 공통 에러 형식의 404 응답을 반환해야 한다.

## 프런트엔드에서 이미 참조 중인 추가 API

- `GET /api/session/:sessionId`: 세션 상세 조회, `practice_sessions` 관련.
- `GET /api/session/:sessionId/frames`: 리플레이 프레임 조회, `session_frames` 관련.
- `GET /api/avatar/items?type=avatar|stage|costume`: 보상 아이템 목록 조회, `reward_items`, `user_reward_items` 관련.
- `POST /api/avatar/render`: 아바타 렌더 요청 생성, `avatar_renders` 관련.
- `GET /api/avatar/render/:renderId`: 렌더 상태 조회, `avatar_renders` 관련.

## 관리자 API

관리자 API는 일반 사용자 연습 플로우와 분리한다.

- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:userId`
- `GET /api/admin/sessions`
- `PATCH /api/admin/sessions/:sessionId`
- `GET /api/admin/renders`
- `GET /api/admin/rewards`
- `GET /api/admin/uploads`

관리자 API도 동일한 공통 응답 형식을 사용한다. 관리자 세션 상태는 프런트 호환을 위해 `active`, `completed`, `abandoned` 또는 기존 세션 값인 `in_progress`, `completed`, `aborted` 중 하나로 정규화한다.
