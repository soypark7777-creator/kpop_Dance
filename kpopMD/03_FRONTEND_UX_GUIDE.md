# 🎨 프런트엔드 & UX 개발 규칙서 (FRONTEND + UX GUIDE)

> 인코딩: UTF-8 | 대상: Frontend 개발자 + UX 디자이너 | 스택: Next.js 14 / TypeScript / Tailwind CSS

---

## 1. 기술 스택 및 버전

```
Next.js        14.x (App Router)
TypeScript     5.x
Tailwind CSS   3.x
Zustand        4.x (상태관리)
React Query    5.x (서버 상태)
Framer Motion  11.x (애니메이션)
Chart.js       4.x (차트)
```

---

## 2. 폴더 구조

```
frontend/
├─ app/
│  ├─ layout.tsx            ← 공통 레이아웃 + 네비게이션
│  ├─ page.tsx              ← 홈 / 랜딩
│  ├─ practice/
│  │  └─ page.tsx           ← 연습 화면 (핵심!)
│  ├─ report/
│  │  └─ [sessionId]/
│  │     └─ page.tsx        ← 리포트 화면
│  ├─ replay/
│  │  └─ [sessionId]/
│  │     └─ page.tsx        ← 리플레이 화면
│  ├─ avatar/
│  │  └─ page.tsx           ← 아바타 보상 화면
│  └─ admin/                ← 관리자 페이지 (보호된 라우트)
│     ├─ page.tsx
│     ├─ dance/page.tsx
│     ├─ users/page.tsx
│     └─ sessions/page.tsx
│
├─ components/
│  ├─ layout/
│  │  ├─ Navbar.tsx         ← 공통 네비게이션 바
│  │  └─ MobileNav.tsx      ← 모바일 하단 네비게이션
│  ├─ practice/
│  │  ├─ CameraStage.tsx
│  │  ├─ SkeletonOverlay.tsx
│  │  ├─ GhostGuideOverlay.tsx
│  │  ├─ FeedbackPanel.tsx
│  │  ├─ ScoreBar.tsx
│  │  ├─ ErrorJointBadge.tsx
│  │  └─ MobileBottomControls.tsx
│  ├─ report/
│  │  ├─ SectionScoreChart.tsx
│  │  └─ JointErrorMap.tsx
│  ├─ replay/
│  │  └─ ReplayTimeline.tsx
│  ├─ avatar/
│  │  └─ AvatarRewardCard.tsx
│  └─ common/
│     ├─ DanceCard.tsx
│     ├─ StreakCard.tsx
│     └─ RankBadge.tsx
│
├─ hooks/
│  ├─ useLiveDanceSession.ts
│  └─ useWebSocketDance.ts
│
├─ store/
│  └─ danceStore.ts         ← Zustand 전역 상태
│
├─ lib/
│  ├─ api.ts                ← API 요청 함수 모음
│  ├─ types.ts              ← 타입 정의 (Joint 이름 기준)
│  └─ drawSkeleton.ts       ← Canvas Skeleton 렌더러
│
└─ styles/
   └─ globals.css           ← 전역 스타일 + CSS 변수
```

---

## 3. UX 설계 최우선 규칙 (초안 잡기 전 반드시 확인)

### 3-1. 타겟 사용자 정의
```
주 타겟: 13-29세 K-pop 팬 / 댄스 학습자
기기:    모바일 우선, 태블릿/PC 확장
언어:    한국어 기본, 영어 부분 지원
감성:    네온 퍼포먼스 + K-pop 스튜디오 + 게임화
```

### 3-2. UX 설계 최우선 원칙 5가지
```
1. Mobile-First: 모든 화면은 세로 모바일(375px)에서 먼저 설계
2. Touch-Friendly: 버튼 최소 44px × 44px 이상
3. 즉각적 피드백: 모든 인터랙션에 0.1초 이내 시각적 반응
4. 성장 가시화: 점수/배지/스트릭을 항상 눈에 보이게
5. 실수 허용: 틀린 관절 표시는 질책이 아닌 가이드 느낌으로
```

---

## 4. 디자인 시스템 (CSS 변수 기준)

```css
/* styles/globals.css */
:root {
  /* 주요 컬러 — K-pop 네온 감성 */
  --color-primary:    #A855F7;   /* 보라 (메인) */
  --color-secondary:  #EC4899;   /* 핑크 (액센트) */
  --color-accent:     #06B6D4;   /* 시안 (포인트) */
  --color-success:    #22C55E;   /* 초록 (정확) */
  --color-warning:    #F59E0B;   /* 노랑 (주의) */
  --color-error:      #EF4444;   /* 빨강 (오류) */
  --color-bg-dark:    #0F0A1A;   /* 배경 다크 */
  --color-bg-card:    #1A1030;   /* 카드 배경 */
  --color-text:       #F8F8FF;   /* 본문 텍스트 */
  --color-text-muted: #9CA3AF;   /* 서브 텍스트 */

  /* 타이포그래피 */
  --font-primary: 'Pretendard', 'Noto Sans KR', sans-serif;
  --font-display: 'Pretendard', sans-serif;

  /* 레이아웃 */
  --nav-height: 64px;
  --mobile-nav-height: 72px;
  --border-radius: 12px;
  --border-radius-lg: 20px;
}
```

---

## 5. 네비게이션 바 통일 규칙

```tsx
// components/layout/Navbar.tsx
// 모든 페이지에서 동일한 네비게이션 사용
// 데스크탑: 상단 고정 / 모바일: 하단 고정

const NAV_ITEMS = [
  { href: '/',         label: '홈',    icon: HomeIcon     },
  { href: '/practice', label: '연습',  icon: PlayIcon     },
  { href: '/replay',   label: '리플레이', icon: ReplayIcon },
  { href: '/avatar',   label: '아바타', icon: StarIcon    },
] as const;
```

> **네비게이션 규칙**
> - 데스크탑: 상단 `<header>` 고정, height: 64px
> - 모바일: 하단 `<nav>` 고정, height: 72px, safe-area-inset 처리
> - 활성 탭: primary 색상 + 하단 indicator
> - 아이콘 + 라벨 조합 (아이콘만 사용 금지)

---

## 6. 각 페이지 UX 설계 규칙

### 홈 페이지 (`/`)
```
필수 섹션:
1. Hero — 슬로건 + "오늘 연습 시작" CTA (primary 버튼, 전체 너비)
2. 오늘의 스트릭 카드 (StreakCard)
3. 내 랭크 배지 (RankBadge)
4. 인기 안무 카드 리스트 (DanceCard — 가로 스크롤)
5. 최근 점수 요약

UX 주의:
- CTA 버튼은 스크롤 없이 바로 보여야 함 (above the fold)
- 카드는 터치 기준 최소 높이 120px
- 스트릭 0일: 격려 메시지, 1일+: 불꽃 이모지 강조
```

### 연습 페이지 (`/practice`) — 가장 중요
```
레이아웃:
┌─────────────────────────┐
│  현재 구간 + 점수       │ (상단 HUD)
├─────────────────────────┤
│                         │
│   카메라 뷰             │
│   + Skeleton Overlay    │ (중앙 메인)
│   + Ghost Guide         │
│                         │
├─────────────────────────┤
│  피드백 메시지          │ (피드백 패널)
├─────────────────────────┤
│  [시작] [일시정지] [종료]│ (하단 고정 컨트롤)
└─────────────────────────┘

UX 규칙:
- 오류 관절: 빨간색 (#EF4444) 강조
- 정확한 관절: 초록색 (#22C55E)
- 점수 변화: 숫자 애니메이션 (spring 효과)
- 피드백: 슬라이드 인 애니메이션, 3초 후 자동 사라짐
- 연결 끊김: 상단에 warning 배너 표시
```

### 리포트 페이지 (`/report/[sessionId]`)
```
섹션:
1. 전체 점수 (크게 표시, 점수에 따라 색상 변화)
   - 90+: 금색 / 70-89: 은색 / 50-69: 동색 / 50 미만: 회색
2. 구간별 점수 차트 (Chart.js 바 차트)
3. 가장 많이 틀린 관절 Top 3 (인체 다이어그램 또는 배지)
4. 코치 코멘트 카드 (격려 + 개선 포인트)
5. 하단 CTA: [다시 연습] [리플레이 보기] [아바타 만들기(80+)]
```

### 리플레이 페이지 (`/replay/[sessionId]`)
```
- Canvas 기반 Skeleton 애니메이션 (영상 X)
- 타임라인 슬라이더로 구간 이동
- 틀린 구간: 빨간 마커 표시
- 재생 속도: 0.5x / 1x / 1.5x
- "이 구간 다시 연습" 버튼 연결
```

### 아바타 페이지 (`/avatar`)
```
- 점수 80 미만: 잠금 화면 + "80점 이상이면 해금!" 안내
- 점수 80 이상: 선택 UI 활성화
  1. 아바타 선택 (캐릭터 카드 그리드)
  2. 무대 선택 (배경 씬 카드)
  3. 의상 선택 (의상 카드, rarity 표시)
  4. [퍼포먼스 생성] 버튼
  5. 렌더링 중: 로딩 애니메이션 + 진행 상태
  6. 완료: 결과 영상/이미지 표시
```

---

## 7. 컴포넌트 프롬프트 작성 규칙

각 컴포넌트를 개발할 때 아래 형식으로 프롬프트를 작성하면 효율적:

```markdown
## 컴포넌트: [컴포넌트명]

### 역할
[한 줄로 설명]

### Props
- propName: type — 설명

### 상태
- stateName: type — 설명

### 동작
1. [조건] → [결과]
2. [이벤트] → [액션]

### 스타일 규칙
- 배경색: var(--color-bg-card)
- 텍스트: var(--color-text)
- 애니메이션: [Framer Motion 효과명]

### 주의사항
- [특이사항]
```

---

## 8. Skeleton 렌더러 핵심 규칙

```typescript
// lib/drawSkeleton.ts
// Canvas 2D 기반 Skeleton 렌더링

const JOINT_CONNECTIONS = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
] as const;

// 오류 관절: 빨간 (#EF4444) / 정상: 초록 (#22C55E) / 기준: 흰색 30% 투명
```

---

## 9. 상태 관리 구조 (Zustand)

```typescript
// store/danceStore.ts
interface DanceStore {
  // 세션 상태
  sessionId: string | null;
  isRecording: boolean;
  sessionStatus: 'idle' | 'active' | 'paused' | 'ended';

  // 실시간 분석 데이터
  matchScore: number;
  jointErrors: Record<JointName, JointError>;
  feedback: string;
  userPose: PoseData | null;
  referencePose: PoseData | null;

  // 리포트 데이터
  reportData: AnalysisReport | null;

  // 아바타 설정
  selectedAvatar: string | null;
  selectedStage: string | null;
  selectedCostume: string | null;
  renderStatus: 'idle' | 'pending' | 'rendering' | 'completed';

  // 액션
  startSession: (danceReferenceId: string) => Promise<void>;
  endSession: () => Promise<void>;
  updateLiveData: (data: LiveStreamData) => void;
  resetSession: () => void;
}
```

---

## 10. 프런트엔드 작업 진행 체크리스트

### Phase 1 — 기반
- [ ] `lib/types.ts` 완성 (Joint 타입 포함)
- [ ] `styles/globals.css` CSS 변수 정의
- [ ] `app/layout.tsx` 공통 레이아웃 + Navbar
- [ ] `store/danceStore.ts` Zustand 스토어

### Phase 2 — 연습 화면
- [ ] `lib/drawSkeleton.ts` Canvas 렌더러
- [ ] `components/practice/CameraStage.tsx`
- [ ] `components/practice/SkeletonOverlay.tsx`
- [ ] `components/practice/GhostGuideOverlay.tsx`
- [ ] `components/practice/FeedbackPanel.tsx`
- [ ] `components/practice/ScoreBar.tsx`
- [ ] `hooks/useWebSocketDance.ts` SSE 연결
- [ ] `app/practice/page.tsx` 전체 조립

### Phase 3 — 나머지 화면
- [ ] `app/report/[sessionId]/page.tsx`
- [ ] `app/replay/[sessionId]/page.tsx`
- [ ] `app/avatar/page.tsx`
- [ ] `app/page.tsx` 홈

### Phase 4 — 관리자 & 마무리
- [ ] `app/admin/` 관리자 페이지
- [ ] 반응형 모바일 최적화
- [ ] 애니메이션 polish
- [ ] 성능 최적화 (이미지, 코드 분할)
