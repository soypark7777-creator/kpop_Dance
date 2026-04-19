# ✅ 개발 진행 추적 마스터 체크리스트

> 인코딩: UTF-8 | 이 문서는 매 작업 세션마다 실제 구현 상태에 맞춰 갱신

---

## 📊 현재 진행 상태

```
마지막 업데이트: 2026-04-19
전체 진행률:     █████████░ 92% (실사용 흐름 완료, Unity 실연동만 외부 프로젝트 연결 단계)
```

| 영역 | 상태 | 진행률 | 비고 |
|---|---|---|---|
| 문서화/설계 | ✅ 완료 | 100% | kpopMD 문서군 정리 완료 |
| DB 스키마 | ✅ 완료 | 100% | `schema.sql`, 모델, 기본 관계 반영 |
| Backend 기반 | ✅ 완료 | 100% | Flask 앱, extensions, config, utils |
| Backend API | ✅ 완료 | 100% | health, auth, user, session, analysis, avatar, upload, admin |
| Frontend 기반 | ✅ 완료 | 100% | `lib/types.ts`, `lib/api.ts`, mock, store, hooks |
| Frontend 화면 | ✅ 완료 | 100% | 홈, 연습, 리포트, 리플레이, 아바타, 업로드, auth |
| 관리자 페이지 | ✅ 완료 | 100% | 사용자/세션/업로드/렌더 필터, 상세 수정 |
| 인증/회원가입 | ✅ 완료 | 100% | 로그인 + 회원가입 + 관리자 부트스트랩 계정 |
| 영상 업로드/분석 | ✅ 완료 | 100% | 업로드 -> 프레임 추출 -> 포즈/점수 -> 리포트 |
| Unity 연동 | 🔄 진행중 | 25% | export JSON 생성까지 완료, Unity 클라이언트 접속은 외부 프로젝트 필요 |

---

## 🧭 지금까지 구현된 핵심 흐름

1. 홈 화면에서 연습, 업로드, 로그인/가입으로 이동할 수 있다.
2. 회원가입 또는 로그인 후 토큰이 브라우저에 저장된다.
3. 연습 세션은 SSE로 실시간 프레임을 받아 점수를 계산한다.
4. 세션 종료 시 분석 리포트와 구간 점수가 생성된다.
5. 업로드 영상은 서버에 저장되고 프레임 추출 후 포즈 분석으로 이어진다.
6. 관리자 페이지에서 사용자, 세션, 업로드, 렌더 결과를 조회하고 수정할 수 있다.

---

## ✅ 구현 완료 체크

### Backend
- [x] `GET /api/health`
- [x] `POST /api/auth/login`
- [x] `POST /api/auth/register`
- [x] `GET /api/auth/me`
- [x] `GET /api/users/me`
- [x] `GET /api/users/me/sessions`
- [x] `GET /api/dance-references`
- [x] `GET /api/dance-references/<id>`
- [x] `POST /api/session/start`
- [x] `POST /api/session/end`
- [x] `GET /api/session/<session_id>`
- [x] `GET /api/session/<session_id>/frames`
- [x] `GET /api/stream/live`
- [x] `GET /api/analysis/<session_id>`
- [x] `GET /api/avatar/items`
- [x] `POST /api/avatar/render`
- [x] `GET /api/avatar/render/<render_id>`
- [x] `GET /api/avatar/export/<session_id>`
- [x] `POST /api/uploads/video`
- [x] `GET /api/uploads/video/<upload_id>`
- [x] `GET /api/uploads/video/<upload_id>/file`
- [x] `GET /api/uploads/video/<upload_id>/frames/<frame_name>`
- [x] `GET /api/admin/dashboard`
- [x] `GET /api/admin/users`
- [x] `PATCH /api/admin/users/<user_id>`
- [x] `GET /api/admin/sessions`
- [x] `PATCH /api/admin/sessions/<session_id>`
- [x] `GET /api/admin/renders`
- [x] `GET /api/admin/rewards`

### Frontend
- [x] 홈 화면
- [x] 연습 화면
- [x] 리포트 화면
- [x] 리플레이 화면
- [x] 아바타 화면
- [x] 업로드 화면
- [x] 로그인/회원가입 화면
- [x] 관리자 화면
- [x] 공통 내비게이션/카드/차트/오버레이 컴포넌트
- [x] `lib/api.ts` 토큰 래핑
- [x] mock 모드와 실제 API 모드 전환

---

## ✅ 최근 완료

- [x] 실제 모바일/태블릿 UX 최종 점검
  - 홈/로그인/관리자/리포트/업로드가 반응형으로 동작
  - 하단 네비, 로그인 버튼, 관리자 진입 버튼까지 모바일 기준 확인
- [x] 운영 환경 배포용 설정 정리
  - 배포용 환경변수, 실행 명령, 초기화 가이드를 문서로 정리
- [x] MediaPipe vs fallback 비교 재검증
  - 현재 저장소의 샘플 프레임으로 비교 경로 재확인
  - 실영상 샘플은 추가 확보 시 한 번 더 확인 권장

---

## ⏳ 다음 작업

- [ ] Unity 클라이언트 실연동
  - Unity 프로젝트를 연결해서 `/api/avatar/export/<session_id>` JSON을 실제 애니메이션으로 재생
- [ ] 실제 영상 샘플로 MediaPipe vs fallback 비교 추가 검증
  - 사람이 촬영한 실제 춤 영상으로 다시 비교해서 결과 차이 기록
- [ ] 운영 환경 배포 후 smoke test
  - 백엔드 / 프런트 / 로그인 / 업로드 / 리포트 / 관리자 기본 동작 확인

---

## 🔐 인증 테스트 시나리오

1. `/auth`에서 새 계정을 만든다.
2. 같은 계정으로 다시 로그인한다.
3. 홈에서 사용자 정보와 연습 기록이 보이는지 확인한다.
4. 관리자 계정으로 로그인해 `/admin` 접근이 되는지 확인한다.
5. 브라우저 개발자 도구에서 `Authorization: Bearer ...` 헤더가 붙는지 확인한다.
