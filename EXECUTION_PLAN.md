# 🎵 K-pop Dance Clone - 실행 계획서 (2026-05-12)

## 📊 현황 분석

### ✅ 완료된 작업
- **프런트엔드 UI/UX**: 1~4단계 (practice, report, replay, avatar 페이지 구현)
- **상태관리**: Zustand 기반 danceStore, useWebSocketDance 훅
- **Mock 데이터**: lib/mock.ts에 모든 테스트 데이터 준비
- **타입 시스템**: lib/types.ts에 통일된 타입 정의
- **반응형 디자인**: 웹/모바일 대응
- **컴포넌트 완성**: CameraStage, SkeletonOverlay, FeedbackPanel 등

### 📋 현재 상태
| 영역 | 상태 | 진행도 |
|------|------|--------|
| 프런트엔드 | ✅ 완료 | 100% |
| 백엔드 API | ⏳ 미구현 | 0% |
| 데이터베이스 | 📝 설계됨 | 20% |
| Unity 연동 | ❌ 미작업 | 0% |
| 배포 | ❌ 미작업 | 0% |

---

## 🎯 다음 3단계 액션 플랜

### **Phase 1: 백엔드 API 계약 정리 & 8단계 완료**
**목표**: 프런트-백 간 명확한 데이터 계약 수립  
**담당**: Claude (또는 Codex)  
**예상 소요시간**: 4-6시간

#### 1-1. 8단계 프런트엔드 최종 정리
```
작업 항목:
□ 중복 타입 정리 (lib/types.ts)
□ 상태관리 흐름 정리 (store/danceStore.ts)
□ Mock 데이터 위치 명확화
□ API 연결 포인트에 주석 추가
□ WebSocket 구조 재검토
□ 페이지 간 session_id 흐름 검증
□ 모바일 반응형 최종 점검
```

#### 1-2. 9단계 API 계약 문서 작성
```
작성할 API 문서 (BACKEND_API_CONTRACT.md):

1. POST /api/session/start
   - 목적: 연습 세션 시작
   - Request: { userId, danceId, difficulty }
   - Response: { sessionId, startTime, referenceData }
   
2. WebSocket /api/stream/live
   - 역할: 실시간 스켈레톤 & 점수 스트림
   - Message format: { timestamp, joints, score, feedback }
   - Mock → Real 데이터 구조 동일

3. POST /api/session/end
   - Request: { sessionId, totalScore }
   - Response: { analysisReady }

4. GET /api/analysis/:session_id
   - 사용처: report 페이지
   - Response: { totalScore, weakSections, wrongJoints, timeline }

5. GET /api/avatar/export/:session_id
   - 사용처: avatar 페이지 + Unity export
   - Response: { avatar, stage, costume, renderStatus }

6. GET /api/references
7. GET /api/references/:id
```

---

### **Phase 2: 백엔드 구현 (Codex 담당 또는 Claude)**
**목표**: Flask + MySQL 백엔드 완성  
**예상 소요시간**: 16-24시간  
**우선순위**: 

```
1️⃣ session start/end + 데이터 저장
2️⃣ live stream endpoint (SSE 또는 WebSocket)
3️⃣ analysis report 계산 로직
4️⃣ avatar export API
5️⃣ reference dance API
```

#### 2-1. 데이터베이스 스키마 확정
```
필수 테이블:
- users (id, username, email, score_total)
- sessions (id, user_id, dance_id, start_time, end_time, total_score)
- session_frames (session_id, timestamp, joints_json, score)
- dance_references (id, song, difficulty, skeleton_json)
- avatar_renders (session_id, avatar_id, stage_id, status)
```

#### 2-2. 핵심 엔드포인트 구현
- MediaPipe 또는 OpenPose 연동
- 점수 계산 알고리즘 (kpopMD/09_BACKEND_SCORING_FLOW.md 참조)
- 스트림 처리 (SSE 또는 WebSocket)

---

### **Phase 3: 통합 테스트 & 배포**
**목표**: 실제 데이터로 전체 플로우 검증  
**예상 소요시간**: 8-12시간

#### 3-1. 통합 테스트 체크리스트
```
□ 회원가입 → 로그인 → 연습 시작
□ 웹캠 → 스켈레톤 감지 → 실시간 점수 표시
□ 연습 종료 → report 페이지 데이터 로드
□ report → replay 페이지 연결
□ replay → avatar 페이지 연결
□ avatar 선택 후 export 트리거
□ 모바일에서 전체 플로우 테스트
```

#### 3-2. 배포 준비
- 환경변수 설정 (.env.local, .env.production)
- 데이터베이스 마이그레이션
- CORS 설정
- 로깅 & 모니터링 설정

---

## 🚀 구체적 다음 스텝

### **🔥 바로 다음 (이번 세션)**

#### 옵션 A: 8단계 완료 (권장)
```
1. 현재 frontend 파일들 전체 스캔
   - lib/types.ts 중복 타입 정리
   - store/danceStore.ts 상태관리 흐름 확인
   - 모든 API 호출 포인트 주석 추가

2. 9단계 API 계약 문서 작성
   - BACKEND_API_CONTRACT.md 생성
   - 각 엔드포인트별 request/response 예시 포함
   - mock 데이터 vs 실제 데이터 차이 명시

3. 최종 검증
   - npm run dev로 프런트엔드 실행
   - practice → report → replay → avatar 플로우 테스트
   - 모바일 반응형 확인
```

#### 옵션 B: 백엔드 API 설계 시작
```
1. BACKEND_API_CONTRACT.md 확정
2. Flask 프로젝트 기본 구조 생성
3. 첫 번째 엔드포인트 (POST /api/session/start) 구현
```

---

## 📝 필요한 산출물 목록

### Phase 1 (이번 주)
- [ ] `BACKEND_API_CONTRACT.md` - API 계약서
- [ ] `lib/types.ts` 정리 버전
- [ ] `API_INTEGRATION_CHECKLIST.md` - 통합 체크리스트

### Phase 2 (1-2주)
- [ ] Flask 백엔드 코드
- [ ] 데이터베이스 마이그레이션 스크립트
- [ ] API 통합 테스트 결과

### Phase 3 (1주)
- [ ] 배포 설정 및 문서
- [ ] 운영 체크리스트

---

## ⚠️ 주의사항 & 리스크

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|----------|
| WebSocket vs SSE 선택 | 🔴 높음 | 프런트에서 둘 다 지원 가능하게 설계 |
| MediaPipe 성능 | 🔴 높음 | Fallback 환경 준비 (kpopMD/12 참조) |
| 실시간 점수 지연 | 🟡 중간 | 프로토콜 최적화 필요 |
| 모바일 브라우저 호환 | 🟡 중간 | iOS 웹캠 권한 문제 사전 확인 |
| 배포 환경 설정 | 🟡 중간 | 체크리스트 먼저 작성 |

---

## 📚 참고 문서

- `Next_Mission.md` - 현재 작업 명세
- `frontend_instruction.md` - 프런트엔드 가이드
- `kpopMD/02_BACKEND_GUIDE.md` - 백엔드 구조
- `kpopMD/09_BACKEND_SCORING_FLOW.md` - 점수 계산 로직
- `kpopMD/15_DEPLOYMENT_GUIDE.md` - 배포 가이드
- `kpopMD/17_UNITY_API_CONTRACT.md` - Unity 연동 API

---

## ✨ 성공 기준

```
Phase 1 완료: API 계약서가 프런트-백 간 명확한 규약이 됨
Phase 2 완료: 실제 백엔드 데이터로 프런트 모든 페이지가 동작
Phase 3 완료: 웹/모바일에서 전체 플로우(회원가입~아바타)가 정상 작동
```

---

**다음 미팅 시점**: API 계약서 완료 후 백엔드 팀(Codex)과 검토 회의
**예상 전체 타임라인**: 4-6주 (팀 규모 및 병렬 작업에 따라)
