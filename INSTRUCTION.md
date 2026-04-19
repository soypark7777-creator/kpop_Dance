이 프로젝트는 단순 포즈 인식 데모가 아니라, K-pop 안무 학습 → 오답 노트 분석 → 아바타 퍼포먼스 보상까지 이어지는 통합 서비스다.

따라서 백엔드와 프런트엔드는 반드시 아래 원칙을 지켜야 한다.

1. 실시간 포즈 비교용 JSON과 Unity export용 JSON을 분리할 것
2. 기준 안무와 사용자 포즈는 동일 joint naming을 사용할 것
3. 단순 절대좌표 비교가 아니라 관절 각도 중심 비교를 사용할 것
4. DTW를 사용해 타이밍 오차를 허용하는 점수 구조를 만들 것
5. 세션 종료 후 오답 노트 리포트를 생성할 것
6. 점수 80 이상이면 아바타 퍼포먼스 렌더링 진입 권한을 줄 것
7. 웹앱 우선 구현하되 모바일 확장을 고려한 API 중심 구조로 만들 것
8. Unity 리타겟팅을 고려해 relative angle / normalized transform / optional quaternion 구조를 준비할 것

최종 목표는 사용자가 춤을 배우고, 분석받고, 성장 보상을 시각적으로 경험하는 완성형 서비스다.

# Claude Code 실행 프롬프트
프로젝트명: My Avatar Dance Master

아래 내용을 기반으로 프런트엔드 및 전체 서비스 구조가 백엔드, Unity, 모바일 확장까지 일관되게 동작하도록 구현해줘.

이 문서는 단순 설명이 아니라 **전체 시스템을 하나의 방향으로 통합하기 위한 실행 기준**이다.  
프런트엔드는 반드시 이 구조를 중심으로 설계해야 한다.

---

# 1. 프로젝트 목표

이 서비스는 다음 흐름을 가진다.

1. 사용자가 K-pop 안무를 따라 춤춘다
2. 실시간으로 포즈를 분석하고 피드백을 받는다
3. 연습 종료 후 오답 노트 리포트를 확인한다
4. 점수가 일정 기준 이상이면 아바타 퍼포먼스를 생성한다

---

# 2. 전체 아키텍처 구조 (반드시 반영)

서비스는 다음 4개 레이어로 구성된다.

## 1) Motion Capture Layer
- 사용자 포즈 추출 (MediaPipe → Backend)
- 기준 안무 포즈 로딩 (JSON 데이터)

## 2) Analysis Layer
- 관절 각도 계산
- 틀린 부위 감지
- DTW 기반 점수 계산
- 세션 분석 리포트 생성

## 3) Experience Layer (프런트 핵심)
- 실시간 피드백 UI
- 연습 화면
- 리포트 화면
- 리플레이 화면
- 보상(아바타) 화면

## 4) Avatar Rendering Layer (Unity)
- Unity 리타겟팅
- 아바타 본 매핑
- 무대/의상/효과 적용
- 퍼포먼스 렌더링

👉 프런트엔드는 반드시 **Experience Layer 중심으로 구현**하되  
👉 모든 데이터는 Analysis Layer와 Unity Layer를 고려한 구조로 처리해야 한다.

---

# 3. 통합 데이터 설계 규칙 (매우 중요)

## 1) Joint Naming 통일 (절대 변경 금지)
프런트엔드에서 사용하는 모든 관절 이름은 아래와 동일해야 한다.

- nose
- left_shoulder / right_shoulder
- left_elbow / right_elbow
- left_wrist / right_wrist
- left_hip / right_hip
- left_knee / right_knee
- left_ankle / right_ankle

👉 프런트에서 임의로 이름 바꾸지 말 것

---

## 2) 데이터 포맷 2가지로 분리

### A. 실시간용 (lightweight JSON)
- 실시간 렌더링용
- WebSocket으로 받음

포함 데이터:
- user_pose
- reference_pose
- joint_errors
- feedback
- match_score

---

### B. 리플레이 / Unity용 (extended JSON)
- 세션 종료 후 사용
- 더 정밀한 데이터 포함

포함 데이터:
- joints (position + optional rotation)
- timeline
- section score
- report data

---

## 3) 좌표 vs 각도 처리

프런트에서는:
- 좌표 기반으로 skeleton 렌더링

하지만 시스템 전체는:
- 각도 기반 비교 중심

Unity는:
- 상대 각도 기반 리타겟팅

👉 따라서 프런트에서도 각도 개념을 고려한 구조로 작성

---

## 4) API 중심 설계 (모바일 확장 대비)

- 모든 데이터는 API 또는 WebSocket 기반
- 프런트에서 계산하지 말고 backend 결과 사용
- React Native에서도 그대로 사용할 수 있게 설계

---

# 4. 프런트엔드 구현 요구사항

## 반드시 구현할 화면

### 1. practice (연습 화면) → 가장 중요
구성:

- 카메라 화면
- 기준 안무 고스트 오버레이
- 사용자 skeleton overlay
- 틀린 부위 (빨간색)
- 실시간 점수
- 실시간 피드백 메시지

### 동작 규칙

- joint_errors.status === 'wrong' → 빨간색 표시
- match_score 실시간 표시
- feedback 메시지 카드로 표시

---

### 2. report (리포트 화면)
- 전체 점수
- 구간별 점수
- 가장 많이 틀린 구간
- 가장 많이 틀린 관절

---

### 3. replay (리플레이 화면)
- 실제 영상 X
- 3D 느낌 skeleton 기반 UI
- 타임라인 이동 가능
- 틀린 구간 자동 강조

---

### 4. avatar (보상 화면)
- 점수 80 이상일 때 활성화
- 아바타 선택 UI
- 무대 선택 UI
- 의상 선택 UI
- 퍼포먼스 생성 버튼

---

# 5. Unity 연동 고려사항 (프런트도 이해해야 함)

## 1) Retargeting
- 절대 좌표 사용 X
- 상대 각도 기반

## 2) Export 구조
- backend → JSON export
- Unity → animation으로 변환

## 3) 프런트 역할
- export 요청 API 호출
- render 상태 표시
- 결과 영상 표시

---

# 6. 모바일 확장 전략

## 1차
- Next.js 웹앱
- 반응형 UI
- PWA 고려

## 2차
- React Native 확장
- 동일 API 사용

👉 따라서 프런트 코드는 모바일 전환을 고려해서 작성

---

# 7. DB 구조 인식 (프런트에서 알아야 함)

프런트는 아래 데이터 구조를 기준으로 API를 사용해야 한다.

- users
- dance_references
- practice_sessions
- session_frames
- analysis_reports
- avatar_renders

👉 프런트는 session_id 기반으로 모든 데이터를 연결

---

# 8. 구현 순서 (Claude Code 반드시 따를 것)

1. joint naming 기반 skeleton renderer 구현
2. WebSocket 연결 hook 구현
3. practice 화면 완성
4. joint_errors → 시각화 연결
5. report 화면 구현
6. replay 화면 구현
7. avatar 보상 화면 구현
8. 전체 상태관리 구조 정리

---

# 9. 코드 구조 요구사항

반드시 아래 구조 사용

```bash
app/
  practice/page.tsx
  report/[sessionId]/page.tsx
  replay/[sessionId]/page.tsx
  avatar/page.tsx

components/
  CameraStage.tsx
  SkeletonOverlay.tsx
  GhostGuideOverlay.tsx
  FeedbackPanel.tsx

hooks/
  useWebSocketDance.ts

store/
  danceStore.ts

lib/
  drawSkeleton.ts
  api.ts
  types.ts
