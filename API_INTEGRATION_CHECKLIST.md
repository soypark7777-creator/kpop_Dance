# API 통합 체크리스트

프로젝트: K-pop Dance Clone / My Avatar Dance Master  
범위: 백엔드 구현 전 프런트엔드 최종 점검

## 환경 설정

- [ ] `frontend/.env.local`에 `NEXT_PUBLIC_API_URL=http://localhost:5000`이 설정되어 있다.
- [ ] `NEXT_PUBLIC_MOCK_MODE=true`에서 mock 모드가 정상 동작한다.
- [ ] `NEXT_PUBLIC_MOCK_MODE=false`에서 Flask API 호출로 전환된다.
- [ ] 백엔드 CORS가 Next.js 개발 서버 origin을 허용한다.
- [ ] 모든 일반 API 성공 응답이 `{ success, data, message, timestamp }` 형식을 따른다.
- [ ] 모든 일반 API 에러 응답이 `{ success, error, code, status, message, timestamp }` 형식을 따른다.

## 플로우별 체크리스트

### 1. 안무 목록 로드

- [ ] 페이지: `frontend/app/practice/page.tsx`
- [ ] API: `GET /api/dance-references`
- [ ] DB: `dance_references`
- [ ] mock fallback: `MOCK_DANCE_REFERENCES`
- [ ] 각 안무 데이터에 `id`, `title`, `artist_name`, `difficulty`, `duration_seconds`, `thumbnail_url`, `reference_json_path`, `created_at`이 있다.

### 2. 연습 세션 시작

- [ ] 훅: `frontend/hooks/useLiveDanceSession.ts`
- [ ] API: `POST /api/session/start`
- [ ] DB: `practice_sessions`, `dance_references`, `users`
- [ ] Request에 `dance_reference_id`가 포함된다.
- [ ] Response에 `session_id`, `stream_url`, `dance_reference`, `started_at`이 포함된다.
- [ ] 카운트다운 시작 전에 Zustand의 `sessionId`가 설정된다.

### 3. SSE 실시간 점수 수신

- [ ] 훅: `frontend/hooks/useWebSocketDance.ts`
- [ ] API: `GET /api/stream/live?session_id=...`
- [ ] DB: `session_frames`, `practice_sessions`, `dance_references`
- [ ] 전송 방식은 SSE/EventSource다.
- [ ] SSE event data가 `LiveFrameData` 구조와 일치한다.
- [ ] `applyLiveFrame`이 `matchScore`, `jointErrors`, `feedback`, `userPose`, `referencePose`, `currentSectionIndex`, `isRecording`을 갱신한다.
- [ ] 스트림이 끊겼을 때 재연결 동작이 허용 가능한 수준이다.

### 4. 세션 종료

- [ ] 훅: `frontend/hooks/useLiveDanceSession.ts`
- [ ] API: `POST /api/session/end`
- [ ] DB: `practice_sessions`, `session_frames`, `analysis_reports`
- [ ] Response에 `session`, `report`, `unlock_avatar_render`가 포함된다.
- [ ] Store에 `lastCompletedSession`과 `currentReport`가 저장된다.
- [ ] 라우터가 `/report/{sessionId}`로 이동한다.

### 5. 리포트 조회

- [ ] 페이지: `frontend/app/report/[sessionId]/page.tsx`
- [ ] API: `GET /api/analysis/:sessionId`
- [ ] DB: `analysis_reports`, `practice_sessions`, `session_frames`
- [ ] Store 상태가 없어도 URL 직접 접근으로 리포트가 로드된다.
- [ ] Response에 `total_score`, `weakest_section`, `most_wrong_joints`, `average_angle_error`, `section_scores`, `report_json`이 포함된다.

### 6. 리플레이 데이터 조회

- [ ] 페이지: `frontend/app/replay/[sessionId]/page.tsx`
- [ ] API: `GET /api/session/:sessionId/frames`
- [ ] DB: `session_frames`
- [ ] Response가 `SessionFrame[]` 형식이다.
- [ ] 각 프레임에 `session_id`, `frame_index`, `timestamp_seconds`, `pose_json`, `score`가 포함된다.
- [ ] 로드 후 Canvas에 비어 있지 않은 스켈레톤 프레임이 렌더링된다.

### 7. 아바타 export 조회

- [ ] API client: `frontend/lib/api.ts`
- [ ] API: `GET /api/avatar/export/:sessionId`
- [ ] DB: `avatar_renders`, `practice_sessions`, `session_frames`, `reward_items`, `user_reward_items`
- [ ] Response에 `session_id`, 선택된 아바타/무대/의상, `frames`, `render_status`, 선택적 `output_url`이 포함된다.
- [ ] Unity export에서도 프런트와 동일한 joint 이름을 유지한다.

### 8. 80점 이상 아바타 CTA 활성화

- [ ] 페이지: `frontend/app/report/[sessionId]/page.tsx`
- [ ] 조건: `report.total_score >= 80`
- [ ] CTA URL: `/avatar?sessionId={sessionId}`
- [ ] 80점 미만이면 잠금 상태가 표시된다.
- [ ] 백엔드 연결 후 avatar 페이지도 `sessionId` 기준 리포트 조회로 해금 여부를 판단한다.

### 9. 모바일 테스트

- [ ] Practice 카메라 화면이 모바일 viewport를 채운다.
- [ ] 하단 컨트롤이 피드백 또는 점수 HUD와 겹치지 않는다.
- [ ] Report CTA 버튼이 `BottomNav` 위에서 터치 가능하다.
- [ ] Replay Canvas와 Timeline이 좁은 화면에 맞는다.
- [ ] Avatar 가로 아이템 선택 영역이 부드럽게 스크롤된다.
- [ ] iOS Safari 카메라 권한과 자동 재생 동작을 확인한다.

## 백엔드 구현 전 통과 기준

- [ ] 어떤 API도 joint 이름을 변경하지 않는다.
- [ ] 프런트가 snake_case를 기대하는 필드에 camelCase를 반환하지 않는다.
- [ ] `session_id`는 practice, report, replay, avatar 전체에서 문자열로 유지된다.
- [ ] SSE는 `LiveFrameData`를 직접 emit한다.
- [ ] 일반 HTTP API는 공통 응답 형식으로 감싼다.
- [ ] MediaPipe가 완전히 붙기 전에도 mock과 유사한 seed 데이터로 전체 플로우를 실행할 수 있다.
