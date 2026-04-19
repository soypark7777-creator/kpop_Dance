# 🕺 My Avatar Dance Master — 프로젝트 전체 개요

> 인코딩: UTF-8 | 작성일: 2026-04 | 버전: v1.0

---

## 📌 앱 한 줄 소개

**K-pop 안무를 AI가 분석하고, 오답 노트를 생성하고, 내 아바타가 무대에서 춤추는 통합 댄스 학습 플랫폼**

---

## 🔁 전체 서비스 흐름 (사용자 여정)

```
[홈/랜딩] → [안무 선택] → [연습 시작]
     ↓              ↓             ↓
[랭크/배지]    [안무 상세정보]  [카메라 ON + MediaPipe]
                               ↓
                    [실시간 포즈 캡처 → Backend 전송]
                               ↓
                    [관절 각도 분석 + DTW 보정]
                               ↓
                    [joint_errors + feedback JSON → 프런트]
                               ↓
                    [Skeleton 오버레이 + 점수 실시간 표시]
                               ↓
                    [연습 종료 → 오답 노트 리포트 생성]
                               ↓
               ┌───────────────┴───────────────┐
          [점수 < 80]                     [점수 ≥ 80]
               ↓                               ↓
         [다시 연습]               [아바타 퍼포먼스 생성 진입]
                                              ↓
                                  [아바타 / 무대 / 의상 선택]
                                              ↓
                                  [Unity 렌더링 요청 → 결과 영상]
```

---

## 🏗️ 4-레이어 아키텍처

| 레이어 | 역할 | 담당 |
|---|---|---|
| **Motion Capture Layer** | 사용자 포즈 추출, 기준 안무 로딩 | MediaPipe + Backend |
| **Analysis Layer** | 관절 각도 계산, DTW 점수, 리포트 생성 | Flask Backend |
| **Experience Layer** | 실시간 피드백 UI, 리포트, 리플레이, 보상 | Next.js Frontend |
| **Avatar Rendering Layer** | Unity 리타겟팅, 본 매핑, 무대/의상 렌더 | Unity |

---

## 🗂️ 주요 화면 목록

| 화면 | 경로 | 설명 |
|---|---|---|
| 홈 | `/` | 최근 점수, 인기 안무, 스트릭 요약 |
| 연습 | `/practice` | 카메라 + 실시간 분석 (핵심 화면) |
| 리포트 | `/report/[sessionId]` | 세션 종료 후 오답 노트 |
| 리플레이 | `/replay/[sessionId]` | Skeleton 기반 복습 타임라인 |
| 아바타 | `/avatar` | 보상 선택 및 Unity 렌더 요청 |

---

## 🧩 핵심 데이터 흐름

```
사용자 포즈 (x,y,z 좌표)
    → 관절 각도 계산 (geometry.py)
    → 기준 안무 각도와 비교
    → angle_diff ≥ 15° → wrong joint 판정
    → DTW로 타이밍 오차 보정
    → match_score 계산
    → 실시간 SSE/WebSocket으로 프런트 전송
    → 세션 종료 → analysis_report 저장 → Unity export JSON 생성
```

---

## 🗄️ 데이터베이스 테이블 구조 (MySQL Workbench 기준)

```
users
  └─ practice_sessions (user_id FK)
       ├─ session_frames (session_id FK)
       ├─ analysis_reports (session_id FK)
       └─ avatar_renders (session_id FK, user_id FK)

dance_references
  └─ practice_sessions (dance_reference_id FK)

reward_items
  └─ user_reward_items (reward_item_id FK, user_id FK)
```

---

## 💰 외부 API 비용 안내 (유료 주의)

| 서비스 | 무료 여부 | 비용 | 대안 |
|---|---|---|---|
| **MediaPipe** (Google) | ✅ 완전 무료 | $0 | 없음 (기본 사용) |
| **MySQL Workbench** | ✅ 완전 무료 | $0 | 없음 |
| **Next.js** | ✅ 완전 무료 | $0 | 없음 |
| **Flask** | ✅ 완전 무료 | $0 | 없음 |
| **Vercel (배포)** | ⚠️ 제한 무료 | Pro: $20/월 | Railway, Render |
| **AWS/GCP (서버)** | ⚠️ 유료 | EC2 t3.small ~$15/월 | Railway $5/월 |
| **Unity** | ⚠️ 조건부 무료 | 연 $10만 이하 무료 | 없음 |
| **OpenAI API** | ❌ 유료 | GPT-4o: $5/1M tokens | **이 프로젝트에서 미사용** |
| **Anthropic API** | ❌ 유료 | Claude: $3~15/1M tokens | **이 프로젝트에서 미사용** |

> ⚠️ **중요**: 이 프로젝트는 외부 유료 AI API를 사용하지 않음.  
> MediaPipe는 로컬 실행 기반으로 완전 무료임.  
> 서버 비용만 발생하며, 초기에는 로컬 개발 환경에서 $0 운영 가능.

---

## 🔑 Joint Naming 규칙 (전 시스템 통일 — 절대 변경 금지)

```
nose
left_shoulder / right_shoulder
left_elbow / right_elbow
left_wrist / right_wrist
left_hip / right_hip
left_knee / right_knee
left_ankle / right_ankle
```

> 이 이름은 Backend(Python), Frontend(TypeScript), Unity(C#) 모두 동일하게 사용해야 함.

---

## 📐 설계 시 주의사항 TOP 10

1. **절대좌표 비교 금지** → 반드시 관절 각도 기반 비교
2. **유료 API 연결 금지** → MediaPipe 로컬 처리 유지
3. **Joint 이름 임의 변경 금지** → 위 naming 규칙 고수
4. **프런트에서 계산 금지** → 모든 분석은 Backend 결과 사용
5. **실시간 JSON과 Unity export JSON 혼용 금지** → 반드시 분리
6. **DB 직접 접근 UI 금지** → 관리자 페이지 통해서만 접근
7. **한글 인코딩** → 모든 파일 UTF-8로 저장
8. **환경변수** → .env 파일로 분리, 절대 코드에 하드코딩 금지
9. **CORS 설정** → Flask-CORS 반드시 포함
10. **MySQL charset** → utf8mb4, collation utf8mb4_unicode_ci 고정
