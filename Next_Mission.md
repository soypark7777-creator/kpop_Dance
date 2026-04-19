
## 프로젝트 문서들:
- AVATAR_DANCE_MASTER_INSTRUCTIONS.md
- frontend_instruction.md
- INSTRUCTION.md
- backend_instruction.md

이 문서들을 기준으로, My Avatar Dance Master의 프런트엔드를 먼저 구현하려고 한다.
백엔드는 나중에 Codex로 붙일 예정이므로, 지금은 Next.js + TypeScript + Tailwind CSS 기반으로 mock 데이터 중심의 프런트엔드를 먼저 완성하고 싶다.

목표:
- K-pop 트레이닝 앱처럼 세련된 UI
- 청소년/청년층이 좋아할 몰입감 있는 UX
- practice / report / replay / avatar 흐름 완성
- 웹 우선 + 모바일 반응형
- 나중에 Flask backend와 쉽게 연결 가능한 구조

먼저 다음을 해줘:
1. 구현 순서 제안
2. 필요한 파일 목록
3. 타입/상태 구조 제안
4. mock 데이터 전략
5. 백엔드 연결 포인트 정리

아직 코드는 쓰지 말고, 실행 계획부터 정리해줘.


## 4단계 프롬프트
이제 핵심인 practice 페이지를 구현해줘.

구현할 파일:
- app/practice/page.tsx
- components/CameraStage.tsx
- components/SkeletonOverlay.tsx
- components/GhostGuideOverlay.tsx
- components/FeedbackPanel.tsx
- components/ScoreBar.tsx
- components/ErrorJointBadge.tsx
- components/MobileBottomControls.tsx
- lib/drawSkeleton.ts

반드시 구현할 것:
1. 카메라 화면 영역
2. 기준 안무 고스트 오버레이
3. 사용자 skeleton overlay
4. 틀린 부위 빨간색 표시 구조
5. 실시간 점수 바
6. 피드백 패널
7. 모바일 하단 컨트롤
8. mirror mode, ghost on/off 같은 UI 토글 구조

중요:
- 실제 백엔드 연결 전이므로 mock live data로 동작하게 해줘
- useWebSocketDance와 danceStore 구조를 사용하게 해줘
- skeleton 그리기는 canvas 기반으로 분리해줘
- 나중에 backend의 lightweight JSON을 그대로 받을 수 있게 설계해줘
- Practice 화면은 가장 몰입감 있게 만들어줘
- 청소년/청년층이 “이 앱 써보고 싶다”는 느낌이 들게 해줘
- 모바일 세로 화면도 고려해줘
- 코드 생략 없이 전부 출력해줘

## 5단계 프롬프트
이제 report 페이지를 구현해줘.

구현할 파일:
- app/report/[sessionId]/page.tsx
- components/SectionScoreChart.tsx

반드시 포함할 것:
- 전체 점수
- weakest_section
- most_wrong_joints
- 평균 오차 요약
- 구간별 점수 차트
- 다시 연습 버튼
- replay 보기 버튼
- avatar 보상 페이지로 이어지는 CTA

추가하면 좋은 요소:
- 코치 코멘트 카드
- 가장 잘한 구간 vs 가장 약한 구간 비교
- 점수에 따른 시각적 강조
- 성취 배지

중요:
- mock report 데이터로 먼저 구성
- 나중에 analysis_reports API로 연결하기 쉽게 타입 맞춰줘
- 모바일에서도 읽기 쉽게 해줘
- 고급스럽고 분석 리포트다운 느낌을 살려줘
- 모든 파일 내용을 생략 없이 출력해줘

## 6단계 프롬프트
것:
- 실제 영상 대이제 replay 페이지를 구현해줘.

구현할 파일:
- app/replay/[sessionId]/page.tsx
- components/ReplayTimeline.tsx

반드시 포함할 신 3D 느낌의 skeleton 기반 리플레이 UI
- user skeleton vs reference skeleton 비교 가능 구조
- 타임라인 이동
- 틀린 구간 강조
- 특정 구간 jump 재생 UI
- 속도 조절 UI placeholder

중요:
- mock replay 데이터 사용
- 향후 backend extended JSON과 연결 가능한 구조
- Unity export 전 미리보기 같은 느낌도 약간 반영
- K-pop 퍼포먼스 분석 느낌의 UI로 만들어줘
- 코드 생략 없이 전부 출력해줘

## 7단계 프롬프트
이제 avatar 페이지를 구현해줘.

구현할 파일:
- app/avatar/page.tsx
- components/AvatarRewardCard.tsx

반드시 포함할 것:
- 점수 80 이상일 때 활성화되는 구조
- 아바타 선택 카드
- 무대 선택 카드
- 의상 선택 카드
- 퍼포먼스 생성 버튼
- render 상태 표시 영역

추가하면 좋은 요소:
- locked / unlocked 상태
- rarity 느낌
- 포인트/프리미엄 확장 가능한 UI
- 첫 무대 생성 CTA
- reward reveal 느낌의 시각 효과

중요:
- mock 데이터 기반
- 나중에 avatar_renders API와 연결 가능하게 구조화
- 청소년/청년층이 좋아할 게임형 보상 화면처럼 만들어줘
- 모바일에서도 카드 선택이 편해야 함
- 코드 생략 없이 전부 출력해줘

## 8단계 프롬프트
이제 지금까지 만든 프런트엔드를 전체 점검하고, 백엔드 연결 준비 상태로 정리해줘.

다음 작업을 해줘:
1. 중복 타입 정리
2. 상태관리 정리
3. mock 데이터 위치 정리
4. API 연결 포인트 주석 정리
5. WebSocket 연결 시 실제 backend lightweight JSON을 바로 받을 수 있도록 구조 점검
6. report / replay / avatar 페이지가 session_id 기준으로 연결되도록 점검
7. 모바일 반응형 점검
8. 컴포넌트 책임 분리 재점검

그리고 마지막에 아래 내용도 정리해줘:
- Codex가 구현해야 할 API 목록
- 각 API의 요청/응답 예시
- 프런트가 기대하는 데이터 계약
- 통합 시 가장 먼저 연결해야 할 순서

코드 수정이 필요한 파일은 수정본까지 모두 출력해줘.

## 9단계 프롬프트
이제 현재 프런트엔드 구조를 기준으로, 나중에 Codex가 Flask 백엔드를 구현할 수 있도록 API 계약 문서를 정리해줘.

정리할 것:
1. POST /api/session/start
2. GET /api/stream/live 또는 WebSocket endpoint
3. POST /api/session/end
4. GET /api/analysis/:session_id
5. GET /api/avatar/export/:session_id
6. GET /api/references
7. GET /api/references/:id

각 항목마다:
- 목적
- request body / params
- response example
- 프런트에서 어떤 화면이 이 데이터를 쓰는지
- 필수 필드 / 선택 필드
- mock 데이터와 실제 데이터 차이

문서 형식으로 정리해줘.

## 그 다음 Codex로 넘어갈 때 쓰는 연결 문장
현재 프런트엔드는 mock 데이터 기반으로 완성되어 있다.
이제 프런트가 기대하는 API 계약에 맞춰 Flask + MySQL 백엔드를 구현해줘.

우선순위:
1. session start/end
2. live stream endpoint
3. analysis report endpoint
4. avatar export endpoint
5. dance reference endpoint

중요:
- 프런트의 타입 구조와 응답 필드명을 유지할 것
- lightweight JSON과 extended JSON 구조를 분리할 것
- SSE 또는 WebSocket 연결이 가능하도록 할 것
- 나중에 Unity export와 모바일 앱 확장을 고려할 것