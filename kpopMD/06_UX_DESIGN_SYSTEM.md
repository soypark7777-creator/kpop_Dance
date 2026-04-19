# 🎭 UX 디자인 초안 규칙서 (UX DESIGN SYSTEM)

> 인코딩: UTF-8 | 대상: UX 디자이너 + Frontend 개발자

---

## 1. UX 설계 원칙 최우선 순위

```
1순위: 사용 가능성 (Usability)     — 처음 써도 바로 이해되는 UI
2순위: 몰입감 (Engagement)         — K-pop 감성, 게임화 요소
3순위: 성장 가시화 (Growth UX)     — 점수, 배지, 스트릭
4순위: 모바일 친화성 (Mobile UX)   — 세로 화면, 터치 우선
5순위: 접근성 (Accessibility)      — 색상 대비, 텍스트 크기
```

---

## 2. 디자인 토큰 (Design Tokens)

### 색상 팔레트
```
Primary:    #A855F7  (보라 — 메인 액션)
Secondary:  #EC4899  (핑크 — 강조)
Accent:     #06B6D4  (시안 — 포인트)
Success:    #22C55E  (정확 관절 / 성공)
Warning:    #F59E0B  (주의 / 경고)
Error:      #EF4444  (오류 관절 / 실패)

Background: #0F0A1A  (앱 배경 — 짙은 보라 다크)
Card BG:    #1A1030  (카드 배경)
Surface:    #251848  (서피스 레이어)

Text:       #F8F8FF  (본문)
Text Muted: #9CA3AF  (서브)
Text Dim:   #6B7280  (비활성)
```

### 그라데이션
```
Hero Gradient:    linear-gradient(135deg, #A855F7 0%, #EC4899 100%)
Score Gold:       linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)
Neon Glow:        box-shadow: 0 0 20px rgba(168, 85, 247, 0.5)
Card Glow:        box-shadow: 0 4px 24px rgba(168, 85, 247, 0.15)
```

### 타이포그래피
```
폰트 패밀리:  Pretendard, Noto Sans KR, sans-serif
Display:      Bold 32-48px  (점수, 헤드라인)
Heading:      SemiBold 20-28px  (섹션 제목)
Body:         Regular 14-16px  (본문)
Caption:      Regular 12px  (설명, 서브)
Label:        Medium 12-14px  (배지, 태그)
```

### 스페이싱
```
xs:   4px
sm:   8px
md:   16px
lg:   24px
xl:   32px
2xl:  48px
```

### 보더 라디우스
```
Button:   8px
Card:     12px
Modal:    20px
Pill:     9999px
```

---

## 3. 컴포넌트 디자인 기준

### 버튼 규칙
```
Primary Button:
  - 배경: #A855F7 (또는 그라데이션)
  - 텍스트: #FFFFFF, Bold 16px
  - 패딩: 12px 24px
  - 높이 최소: 48px (모바일 터치)
  - 호버: 밝기 10% 올리기
  - 비활성: opacity 0.5

Secondary Button:
  - 배경: transparent
  - 테두리: 1px solid #A855F7
  - 텍스트: #A855F7

Danger Button:
  - 배경: #EF4444
  - 사용: 삭제, 종료 액션
```

### 카드 규칙
```
DanceCard:
  - 크기: 160px × 220px (모바일), 200px × 280px (데스크탑)
  - 배경: #1A1030
  - 테두리: 1px solid rgba(168, 85, 247, 0.2)
  - 호버: border-color #A855F7, glow 효과
  - 썸네일: 상단 60%, 정보 하단 40%

점수 카드:
  - 90+: 금색 테두리 glow
  - 70-89: 은색
  - 50-69: 동색
  - 50 미만: 회색
```

### 배지/태그 규칙
```
랭크 배지: [아이콘 + 텍스트] 형식
  - S랭크: 금색 배경
  - A랭크: 보라 배경
  - B랭크: 파란 배경
  - C랭크: 회색 배경

관절 오류 배지:
  - wrong: #EF4444 배경 + 흰 텍스트
  - ok: #22C55E 배경 + 흰 텍스트
  - 크기: 24px × 24px (최소)
```

---

## 4. 페이지별 레이아웃 Grid 규칙

### 모바일 (375px ~ 768px)
```
Column: 1
Gutter: 16px
Margin: 16px
Safe area bottom: env(safe-area-inset-bottom)
```

### 태블릿 (768px ~ 1024px)
```
Column: 2
Gutter: 24px
Margin: 24px
```

### 데스크탑 (1024px+)
```
Column: 3-4
Max Width: 1280px
Gutter: 32px
Margin: auto (centered)
```

---

## 5. 네비게이션 바 상세 스펙

### 데스크탑 상단 Navbar
```
높이: 64px
배경: rgba(15, 10, 26, 0.95) + backdrop-blur
테두리: border-bottom 1px solid rgba(168, 85, 247, 0.1)

레이아웃:
[로고]         [홈 연습 리플레이 아바타]         [프로필 아이콘]
(왼쪽)              (가운데)                    (오른쪽)

활성 탭:
  - 텍스트 색상: #A855F7
  - 하단 2px solid #A855F7
  - 배경 없음
```

### 모바일 하단 Nav
```
높이: 56px + safe-area-inset-bottom
배경: rgba(15, 10, 26, 0.98)
테두리: border-top 1px solid rgba(168, 85, 247, 0.1)
position: fixed bottom-0

아이템 배치: 4개 균등 배분
각 아이템: [아이콘 24px] + [라벨 10px]
활성: 아이콘 색상 #A855F7 + scale(1.1)
비활성: #6B7280
```

---

## 6. 화면 전환 애니메이션 규칙

```typescript
// Framer Motion 기준 전환 효과

// 페이지 진입
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -20 }
};
const pageTransition = { duration: 0.3, ease: 'easeInOut' };

// 점수 숫자 애니메이션
// spring 효과: stiffness 100, damping 10

// 피드백 패널 슬라이드
// y: 100% → 0 (슬라이드 업), duration: 0.25s

// 관절 오류 하이라이트
// border glow 펄스 애니메이션, 1s 주기
```

---

## 7. 각 화면 UX 흐름 프롬프트 작성법

### 템플릿
```
화면명: [페이지명]
경로: [URL 경로]

사용자 목표:
- [이 화면에서 사용자가 달성하려는 것]

주요 액션:
1. [첫 번째 액션]
2. [두 번째 액션]

성공 상태:
- [화면이 정상 동작할 때 보여야 할 것]

에러 상태:
- [네트워크 오류 시] → [대체 UI]
- [데이터 없음 시] → [빈 상태 UI]
- [권한 없음 시] → [잠금 UI]

로딩 상태:
- [데이터 로딩 중] → [Skeleton UI / Spinner]

전환:
- [이 화면에서 이동 가능한 다음 화면]
```

### 예시: 연습 화면 프롬프트
```
화면명: 연습 화면
경로: /practice

사용자 목표:
- K-pop 안무를 따라 춤추면서 실시간 피드백을 받는다

주요 액션:
1. 시작 버튼 클릭 → 카메라 활성화 + MediaPipe 시작
2. 연습 중 → 틀린 관절 빨간 표시 + 피드백 메시지 수신
3. 종료 버튼 클릭 → 리포트 페이지로 이동

성공 상태:
- 카메라 화면에 Skeleton 오버레이 표시
- 실시간 점수 업데이트 (0-100)
- 피드백 메시지 슬라이드 인/아웃

에러 상태:
- 카메라 권한 거부 → "카메라 접근을 허용해주세요" 안내 화면
- 서버 연결 끊김 → 상단 warning 배너 + 재연결 버튼
- MediaPipe 로딩 실패 → 재시도 버튼

로딩 상태:
- 카메라 초기화 중 → 검은 화면 + "카메라 준비 중..." 스피너

전환:
- 종료 → /report/[sessionId]
- 점수 80+ 종료 → /report/[sessionId] + 아바타 CTA 활성화
```

---

## 8. 접근성 (Accessibility) 기준

```
색상 대비:
  - 일반 텍스트: 최소 4.5:1 (WCAG AA)
  - 큰 텍스트: 최소 3:1
  - 관절 오류 빨간색: 흰 텍스트와 조합

터치 타겟:
  - 최소 44px × 44px (Apple HIG 기준)
  - 핵심 버튼: 48px × 48px 이상

텍스트:
  - 최소 12px (caption)
  - 기본 14-16px
  - 한국어 폰트 명시 (Pretendard / Noto Sans KR)

aria 속성:
  - 버튼: aria-label 필수
  - 점수: aria-live="polite" (실시간 업데이트)
  - 에러: role="alert"
```

---

## 9. 빈 상태 (Empty State) 디자인 규칙

```
모든 빈 상태에는 다음을 포함:
1. 아이콘 또는 일러스트 (64-96px)
2. 제목 (16-18px Bold)
3. 설명 (14px Muted)
4. 액션 버튼 (Primary)

예:
- 연습 기록 없음: 🕺 "아직 연습한 기록이 없어요" + "첫 연습 시작하기" 버튼
- 안무 없음: 🎵 "안무 데이터를 불러오는 중..." + 스켈레톤 UI
- 아바타 미잠금: 🔒 "80점 이상이면 아바타를 깨울 수 있어요!" + "다시 도전하기" 버튼
```

---

## 10. 디자인 검토 체크리스트

### 화면 초안 완성 후 확인사항
- [ ] 모바일(375px) 에서 레이아웃 무너짐 없는지
- [ ] 모든 버튼 터치 타겟 44px 이상인지
- [ ] 색상 대비 4.5:1 이상인지
- [ ] 빈 상태 UI 정의했는지
- [ ] 로딩 상태 UI 정의했는지
- [ ] 에러 상태 UI 정의했는지
- [ ] 네비게이션 바 통일됐는지
- [ ] 한국어 폰트 적용됐는지
- [ ] CSS 변수 사용했는지 (하드코딩 색상 금지)
- [ ] 애니메이션이 과하지 않은지 (감소 모션 설정 고려)
