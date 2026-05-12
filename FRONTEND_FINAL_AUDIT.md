# 프런트엔드 최종 점검 보고서

프로젝트: K-pop Dance Clone / My Avatar Dance Master  
점검일: 2026-05-12  
범위: 백엔드 구현 전 Phase 1 프런트엔드 정리

## 완료된 화면 목록

- `frontend/app/page.tsx`: 홈/대시보드 진입 화면.
- `frontend/app/practice/page.tsx`: 안무 선택, 카메라 연습, 카운트다운, 실시간 점수 HUD, 일시정지/종료 컨트롤.
- `frontend/app/report/[sessionId]/page.tsx`: 점수 리포트, 구간별 점수, 틀린 관절, 코치 코멘트, 리플레이/아바타 CTA.
- `frontend/app/replay/[sessionId]/page.tsx`: 스켈레톤 리플레이 Canvas, 재생 컨트롤, 구간 점프, 보기 모드.
- `frontend/app/avatar/page.tsx`: 아바타/무대/의상 선택, 점수 잠금 상태, 렌더 요청 흐름.
- `frontend/app/auth/page.tsx`: 인증 UI 흐름.
- `frontend/app/admin/page.tsx`: 관리자 대시보드와 관리 UI.
- `frontend/app/upload/page.tsx`: 영상 업로드 흐름.

## 아직 mock 상태인 기능

- 안무 목록은 `MOCK_DANCE_REFERENCES` fallback을 사용한다.
- 세션 시작은 `mock_session_*` 값을 생성한다.
- 실시간 점수 스트림은 `generateMockLiveFrame`으로 생성한다.
- 세션 종료는 `MOCK_ANALYSIS_REPORT`를 반환한다.
- 리플레이 프레임은 `createMockSessionFrames`로 생성한다.
- 아바타 아이템과 렌더 상태는 `MOCK_AVATAR_ITEMS`, `MOCK_AVATAR_RENDER`를 사용한다.
- 인증, 관리자, 업로드 흐름은 `frontend/lib/api.ts` 안에 mock 분기를 가지고 있다.

## 백엔드 연결 대기 중인 기능

- `POST /api/session/start`에서 `practice_sessions` 저장.
- `GET /api/stream/live`에서 SSE 실시간 스트림 제공.
- 실시간 분석 중 또는 종료 시점에 `session_frames` 저장.
- `POST /api/session/end`에서 `analysis_reports` 계산 및 저장.
- `GET /api/analysis/:sessionId`로 리포트 직접 조회.
- `GET /api/session/:sessionId/frames`로 리플레이 프레임 조회.
- `GET /api/avatar/export/:sessionId`로 아바타 export 조회.
- `POST /api/avatar/render`, `GET /api/avatar/render/:renderId`로 아바타 렌더 요청/상태 조회.
- `reward_items`, `user_reward_items` 기반 보상 아이템 소유/잠금 규칙.

## 세션 흐름 점검

- Practice는 `/practice` 또는 `/practice?danceId={id}`에서 시작한다.
- `POST /api/session/start`가 `session_id`를 반환한다.
- Zustand에 `sessionId`가 저장된다.
- 카운트다운이 완료된다.
- `useWebSocketDance.connect(sessionId)`가 SSE 연결을 연다.
- `POST /api/session/end`가 `session`과 `report`를 반환한다.
- Store에 `lastCompletedSession`과 `currentReport`가 저장된다.
- 라우터가 `/report/{sessionId}`로 이동한다.
- Report는 `/replay/{sessionId}`로 이동할 수 있다.
- Report는 `total_score >= 80`일 때 `/avatar?sessionId={sessionId}` CTA를 활성화한다.

## 위험 요소

- 일부 파일명과 타입명에 아직 `WebSocket/ws` 표현이 남아 있다. 단, Phase 1 계약은 SSE로 문서화했고 실제 구현도 `EventSource` 기반이다.
- `ReplayPage`는 비교 시각화를 위해 기준 포즈를 로컬에서 생성한다. 현재 백엔드 프레임은 사용자 `pose_json`만 있어도 동작하지만, 정확한 리플레이에는 기준 프레임 데이터가 필요할 수 있다.
- `AvatarPage`는 직접 `/avatar`로 접근하면 demo 점수 85를 fallback으로 사용한다. 백엔드 연결 후에는 `sessionId`로 리포트를 조회해 해금 여부를 판단해야 한다.
- `AvatarRender.session_id`는 현재 `number` 타입이지만 프런트는 문자열 세션 ID도 전달할 수 있다. 다음 Phase에서 렌더 row id와 연습 `session_id`의 관계를 정리해야 한다.
- `ApiResponse<T>`는 이제 `timestamp`를 필수로 요구한다. 백엔드는 모든 일반 응답에 `timestamp`를 포함해야 한다.
- 모바일 카메라 권한과 자동 재생 동작은 실제 기기 테스트가 필요하다. 특히 iOS Safari 확인이 필요하다.

## 다음 Phase에서 백엔드가 반드시 맞춰야 할 데이터 구조

### `LiveFrameData`

- `session_id: string`
- `timestamp: number`
- `user_pose: PoseData`
- `reference_pose: PoseData`
- `joint_errors: JointErrors`
- `feedback: FeedbackMessage`
- `match_score: number`
- `is_recording: boolean`
- `section_index?: number`

### `SessionFrame`

- `id: number`
- `session_id: string`
- `frame_index: number`
- `timestamp_seconds: number`
- `pose_json: PoseDataExtended`
- `score: number`

### `AnalysisReport`

- `id: number`
- `session_id: string`
- `total_score: number`
- `weakest_section: SectionScore`
- `most_wrong_joints: JointName[]`
- `average_angle_error: number`
- `motion_similarity?: number`
- `section_scores: SectionScore[]`
- `report_json: ReportJson`
- `created_at: string`

### `DanceReference`

- `id: number`
- `title: string`
- `artist_name: string`
- `difficulty: "easy" | "normal" | "hard" | "expert"`
- `duration_seconds: number`
- `thumbnail_url: string`
- `preview_video_url?: string`
- `reference_json_path: string`
- `created_at: string`

## 필수 DB 테이블

- `users`
- `dance_references`
- `practice_sessions`
- `session_frames`
- `analysis_reports`
- `avatar_renders`
- `reward_items`
- `user_reward_items`

## 점검한 프런트엔드 파일

- `frontend/lib/types.ts`
- `frontend/store/danceStore.ts`
- `frontend/lib/mock.ts`
- `frontend/lib/api.ts`
- `frontend/hooks/useWebSocketDance.ts`
- `frontend/app/practice/page.tsx`
- `frontend/app/report/[sessionId]/page.tsx`
- `frontend/app/replay/[sessionId]/page.tsx`
- `frontend/app/avatar/page.tsx`

## 다음 Phase 권장 구현 순서

1. `GET /api/dance-references`
2. `POST /api/session/start`
3. `GET /api/stream/live`
4. `POST /api/session/end`
5. `GET /api/analysis/:sessionId`
6. `GET /api/session/:sessionId/frames`
7. 아바타 export/render API
