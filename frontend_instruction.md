# Claude Code 실행 프롬프트
프로젝트명: My Avatar Dance Master

AVATAR_DANCE_MASTER_INSTRUCTIONS.md를 기준으로 **Next.js + TypeScript + Tailwind CSS 기반 프런트엔드**를 구현해줘.

이 서비스는 단순 포즈 인식 화면이 아니라,  
**청소년과 청년층이 K-pop 안무를 재미있게 배우고, 실시간 피드백을 받고, 성장과 보상을 경험하는 AI 댄스 학습 앱**이다.

따라서 프런트엔드는 단순 기능 구현이 아니라 아래 3가지를 모두 만족해야 한다.

1. **K-pop 안무를 배우는 학습 UX**
2. **실시간으로 몰입하게 만드는 퍼포먼스형 UX**
3. **성장과 보상을 느끼게 하는 게임화 UX**

---

# 1. 프로젝트 목표

이 서비스는 다음 흐름을 가진다.

1. 사용자가 K-pop 안무를 따라 춤춘다
2. 실시간으로 포즈를 분석하고 피드백을 받는다
3. 연습 종료 후 오답 노트 리포트를 확인한다
4. 점수가 일정 기준 이상이면 아바타 퍼포먼스를 생성한다
5. 사용자는 점수, 성장 기록, 아바타 보상, 무대/의상 선택을 통해 지속적으로 앱을 사용하게 된다

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
- 랭크/도전/성장 UI
- 청소년·청년층이 좋아할 K-pop 감성 인터랙션

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
- timestamp
- is_recording

### B. 리플레이 / Unity용 (extended JSON)
- 세션 종료 후 사용
- 더 정밀한 데이터 포함

포함 데이터:
- joints (position + optional rotation)
- timeline
- section_scores
- report_data
- weakest_section
- most_wrong_joints

---

## 3) 좌표 vs 각도 처리
프런트에서는:
- 좌표 기반으로 skeleton 렌더링

하지만 시스템 전체는:
- 각도 기반 비교 중심

Unity는:
- 상대 각도 기반 리타겟팅

👉 따라서 프런트에서도 **좌표 렌더링 + 각도 개념을 고려한 UI 구조**로 작성

---

## 4) API 중심 설계 (모바일 확장 대비)
- 모든 데이터는 API 또는 WebSocket 기반
- 프런트에서 계산하지 말고 backend 결과 사용
- React Native에서도 그대로 사용할 수 있게 설계
- fetch 로직과 socket 로직을 분리해 재사용 가능하게 작성

---

# 4. 핵심 제품 컨셉 (청소년/청년층 맞춤)

이 앱은 단순한 운동 앱처럼 보이면 안 된다.  
**K-pop 팬들이 즐길 수 있는 트레이닝 스튜디오 + 퍼포먼스 게임 + 성장형 앱**처럼 보여야 한다.

반드시 반영할 감성:
- 연습 중: “댄스 연습실 + 퍼포먼스 랩”
- 리포트: “프로 댄스 코치의 분석 리포트”
- 보상: “내 아바타가 무대에 서는 순간”
- 전체 톤: “K-pop 트레이닝 앱 + 게임화된 성장 경험”

청소년과 청년층이 좋아할 요소를 반영할 것:
- 실시간 점수 상승 애니메이션
- 오늘의 연습 스트릭
- 연습 완료 배지
- 챌린지 카드
- 아바타/무대 보상 잠금 해제
- 네온 퍼포먼스 감성
- 모바일에서 터치하기 쉬운 인터페이스
- 공유하고 싶어지는 화면 구성

---

# 5. 프런트엔드 구현 요구사항

## 반드시 구현할 화면

### 1. 홈 / 랜딩 페이지 (`app/page.tsx`)
목표:
- 앱 첫 인상
- K-pop 댄스 학습 서비스의 매력을 강하게 전달
- 바로 연습 시작하도록 유도

반드시 포함:
- Hero section
- “오늘의 연습 시작” CTA
- 내 최근 점수 요약
- 인기 안무 카드 / 추천 안무
- 성장 배지 또는 랭크 요약
- 모바일에서도 예쁘고 가독성 좋게

추가하면 좋은 요소:
- “오늘 가장 많이 연습한 안무”
- “이번 주 스트릭”
- “내 아바타 진척도”
- K-pop 팬덤 감성의 슬로건
- 반짝이는 네온 배경 또는 퍼포먼스 라이트 느낌

---

### 2. practice 페이지 (`app/practice/page.tsx`) → 가장 중요
구성:
- 카메라 화면
- 기준 안무 고스트 오버레이 또는 skeleton guide
- 사용자 skeleton overlay
- 틀린 부위 (빨간색)
- 실시간 점수
- 실시간 피드백 메시지
- 현재 구간 정보
- 진행률
- 하단 조작 버튼

동작 규칙:
- `joint_errors.status === 'wrong'` → 빨간색 표시
- `match_score` 실시간 표시
- `feedback` 메시지 카드로 표시

반드시 포함:
- 카메라 permission 처리
- skeleton draw layer
- ghost guide layer
- 실시간 연결 상태 표시
- 시작 / 일시정지 / 종료 버튼
- 모바일 터치 친화적 하단 컨트롤

추가하면 좋은 요소:
- “Perfect / Good / Needs Fix” 상태 배지
- 점수 변화 애니메이션
- 현재 가장 많이 틀리는 관절 badge
- 작은 vibration 느낌의 UI feedback
- practice mode / focus mode 토글
- 좌우 반전 미러 모드 버튼
- skeleton on/off 토글
- ghost guide 투명도 조절

---

### 3. report 페이지 (`app/report/[sessionId]/page.tsx`)
반드시 포함:
- 전체 점수
- 구간별 점수
- weakest_section
- most_wrong_joints
- 평균 오차 또는 정확도 요약
- 다시 연습 버튼
- 리플레이 보기 버튼

추가하면 좋은 요소:
- 코치 코멘트 카드
- “다음에 집중할 포인트”
- 가장 잘한 파트와 가장 약한 파트 비교
- 차트 시각화
- 성취 배지 노출
- 점수에 따른 컬러 변화

---

### 4. replay 페이지 (`app/replay/[sessionId]/page.tsx`)
반드시 포함:
- 실제 영상 사용 X
- 3D 느낌 skeleton 기반 시각화 UI
- 타임라인 이동 가능
- 틀린 구간 자동 강조

추가하면 좋은 요소:
- 사용자 skeleton vs 기준 skeleton 비교 뷰
- 잘못된 구간만 jump 재생
- 속도 조절
- 틀린 관절만 하이라이트
- “이 구간 다시 연습” CTA

---

### 5. avatar 페이지 (`app/avatar/page.tsx`)
반드시 포함:
- 점수 80 이상일 때 활성화
- 아바타 선택 UI
- 무대 선택 UI
- 의상 선택 UI
- 퍼포먼스 생성 버튼
- render 상태 표시

추가하면 좋은 요소:
- locked / unlocked 상태 카드
- stage preview 카드
- costume rarity 느낌
- neon reward reveal animation
- “내 첫 무대 만들기” 감성 CTA
- 향후 유료/포인트 아이템 구조를 고려한 카드 UI

---

# 6. Unity 연동 고려사항 (프런트도 이해해야 함)

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
- 결과가 아직 없을 때는 generating/loading 상태를 고급스럽게 표시

---

# 7. 모바일 확장 전략

## 1차
- Next.js 웹앱
- 반응형 UI
- PWA 고려

## 2차
- React Native 확장
- 동일 API 사용

👉 따라서 프런트 코드는 모바일 전환을 고려해서 작성

반드시 고려할 것:
- mobile-first 요소 일부 반영
- 터치 target 충분히 크게
- 하단 컨트롤 고정
- 세로 화면에서도 무너지지 않는 레이아웃
- iPhone / Android webview를 고려한 안정적인 UI

---

# 8. DB 구조 인식 (프런트에서 알아야 함)

프런트는 아래 데이터 구조를 기준으로 API를 사용해야 한다.

- users
- dance_references
- practice_sessions
- session_frames
- analysis_reports
- avatar_renders

👉 프런트는 `session_id` 기반으로 모든 데이터를 연결  
👉 `dance_reference_id` 기반으로 기준 안무 메타데이터를 불러올 수 있어야 함

---

# 9. 구현 순서 (Claude Code 반드시 따를 것)

1. `lib/types.ts` 에 타입 정의
2. `lib/drawSkeleton.ts` 구현
3. `store/danceStore.ts` 구현
4. `hooks/useWebSocketDance.ts` 구현
5. `components/CameraStage.tsx` 구현
6. `components/SkeletonOverlay.tsx` 구현
7. `components/GhostGuideOverlay.tsx` 구현
8. `components/FeedbackPanel.tsx` 구현
9. `components/ScoreBar.tsx` 구현
10. `components/MobileBottomControls.tsx` 구현
11. `app/practice/page.tsx` 구현
12. `app/report/[sessionId]/page.tsx` 구현
13. `app/replay/[sessionId]/page.tsx` 구현
14. `app/avatar/page.tsx` 구현
15. `app/page.tsx` 홈 구성
16. 전체 상태관리와 반응형 조정
17. UI polish 및 애니메이션 정리

---

# 10. 코드 구조 요구사항

반드시 아래 구조 사용

```bash
frontend/
├─ app/
│  ├─ page.tsx
│  ├─ practice/page.tsx
│  ├─ report/[sessionId]/page.tsx
│  ├─ replay/[sessionId]/page.tsx
│  └─ avatar/page.tsx
├─ components/
│  ├─ CameraStage.tsx
│  ├─ SkeletonOverlay.tsx
│  ├─ GhostGuideOverlay.tsx
│  ├─ FeedbackPanel.tsx
│  ├─ ScoreBar.tsx
│  ├─ ErrorJointBadge.tsx
│  ├─ ReplayTimeline.tsx
│  ├─ AvatarRewardCard.tsx
│  ├─ MobileBottomControls.tsx
│  ├─ DanceCard.tsx
│  ├─ StreakCard.tsx
│  ├─ RankBadge.tsx
│  └─ SectionScoreChart.tsx
├─ hooks/
│  ├─ useLiveDanceSession.ts
│  └─ useWebSocketDance.ts
├─ store/
│  └─ danceStore.ts
├─ lib/
│  ├─ api.ts
│  ├─ types.ts
│  └─ drawSkeleton.ts
└─ styles/