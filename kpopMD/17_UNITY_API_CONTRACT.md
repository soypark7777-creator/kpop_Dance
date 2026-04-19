# Unity 연동 API 계약서

이 문서는 Unity 클라이언트가 백엔드와 실제로 어떻게 연결되는지 정리한 약속문서입니다.

초보자 기준으로 보면, Unity는 아래 3가지만 기억하면 됩니다.
- 사용자가 로그인한 뒤
- 댄스 세션을 시작하고
- 실시간 스트림과 최종 리포트를 받아서 화면에 보여준다

---

## 1. 전체 흐름

```text
Unity 실행
  -> 로그인 토큰 확보
  -> 안무 목록 조회
  -> 세션 시작
  -> 실시간 프레임 스트림 수신
  -> 세션 종료
  -> 분석 리포트 조회
  -> Unity export JSON 조회
```

---

## 2. Unity가 꼭 알아야 할 API

### 2-1. 로그인

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

Unity가 백엔드와 직접 대화하려면 먼저 토큰이 있어야 합니다.

로그인 성공 시 응답:
```json
{
  "success": true,
  "data": {
    "access_token": "JWT_TOKEN",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "email": "test.user@example.com",
      "nickname": "TestUser",
      "is_admin": false
    }
  }
}
```

Unity에서는 `access_token`을 저장한 뒤, 이후 요청에 아래 헤더를 붙이면 됩니다.

```http
Authorization: Bearer JWT_TOKEN
```

---

### 2-2. 세션 시작

- `POST /api/session/start`

요청 예시:
```json
{
  "dance_reference_id": 1,
  "user_id": 1
}
```

응답 예시:
```json
{
  "success": true,
  "data": {
    "session_id": "1",
    "dance_reference": {
      "id": 1,
      "title": "Demo Dance",
      "difficulty": "beginner"
    },
    "ws_url": "http://127.0.0.1:5000/api/stream/live?session_id=1",
    "started_at": "2026-04-19T13:25:41Z"
  }
}
```

Unity가 이 API를 호출하면 백엔드가 세션을 만들고, 실시간 스트림 주소를 돌려줍니다.

---

### 2-3. 실시간 스트림

- `GET /api/stream/live?session_id=...`

이 API는 실시간 자세 비교용 스트림입니다.
Unity에서는 다음 방식 중 하나로 연결할 수 있습니다.
- HTTP 스트리밍 소비
- 별도 로컬 프로세스 브리지
- 향후 Unity 네이티브 네트워크 모듈로 처리

스트림에서 중요한 값:
- 현재 프레임
- 좌우 관절 각도
- 기준 안무 각도
- 오류가 큰 관절
- 점수와 피드백

초보자용 해석:
- 이 스트림은 “지금 사용자가 춤을 얼마나 잘 따라하고 있는지”를 실시간으로 알려주는 채널입니다.

---

### 2-4. 세션 종료

- `POST /api/session/end`

요청 예시:
```json
{
  "session_id": "1"
}
```

응답 예시:
```json
{
  "success": true,
  "data": {
    "session": {
      "id": 1,
      "session_status": "completed",
      "total_score": 86.4
    },
    "report": {
      "motion_similarity": 84.2,
      "average_angle_error": 9.6,
      "most_wrong_joints": ["left_elbow", "right_knee"]
    },
    "unlock_avatar_render": true
  }
}
```

세션 종료는 “한 곡의 분석이 끝났다”는 뜻입니다.

---

### 2-5. 분석 리포트 조회

- `GET /api/analysis/<session_id>`

이 API는 최종 점수, 구간별 점수, 흔들린 관절, 피드백을 가져옵니다.

Unity에서는 리포트 화면이나 결과 팝업을 만들 때 이 값을 사용하면 됩니다.

---

### 2-6. 아바타 export

- `GET /api/avatar/export/<session_id>`

이 API는 Unity가 실제 3D 씬에서 쓰기 좋은 형태의 JSON을 돌려줍니다.

Unity에서 주로 쓰는 이유:
- 아바타 선택
- 무대 선택
- 의상 선택
- 최종 리플레이 구성

응답에는 보통 아래 정보가 들어갑니다.
- 세션 정보
- 사용자 정보
- 안무 메타데이터
- 아바타 렌더 정보
- 리포트 요약

---

### 2-7. 업로드 분석

- `POST /api/uploads/video`
- `GET /api/uploads/video/<upload_id>`

영상 파일을 서버에 올려 분석하는 기능입니다.

Unity에서 이 기능을 쓰는 경우:
- 사용자가 녹화한 영상을 다시 분석
- 튜토리얼용 샘플 영상을 비교
- 저장된 영상 기반 리포트 재생

---

## 3. Unity 쪽 구현 순서

### 1단계
- 로그인 화면을 만든다
- 토큰을 저장한다

### 2단계
- 안무 목록을 가져온다
- 사용자가 연습할 곡을 고르게 한다

### 3단계
- `session/start`를 호출한다
- `session_id`를 저장한다

### 4단계
- 실시간 스트림을 받아 자세 데이터를 표시한다
- 점수와 피드백을 HUD에 보여준다

### 5단계
- 세션 종료 시 `session/end`를 호출한다
- 최종 리포트를 보여준다

### 6단계
- `avatar/export/<session_id>`를 받아 Unity 리플레이 씬을 구성한다

---

## 4. Unity에서 자주 쓰는 필드 설명

### `session_id`
- 세션을 구분하는 번호
- 실시간 스트림, 종료, 리포트 조회에 공통으로 사용됨

### `dance_reference_id`
- 어떤 안무를 기준으로 분석할지 지정하는 번호

### `access_token`
- 로그인 후 받은 토큰
- 보호된 API를 호출할 때 필요함

### `motion_similarity`
- 동작 흐름이 얼마나 비슷한지 보여주는 값

### `most_wrong_joints`
- 가장 많이 틀린 관절 이름 목록

### `unlock_avatar_render`
- 아바타 렌더를 열 수 있는지 여부

---

## 5. Unity에서 연결할 때 주의할 점

- `localhost`는 Unity Editor에서는 잘 되지만, 다른 기기에서는 안 될 수 있다.
- 모바일 테스트를 하려면 백엔드 주소를 실제 PC IP로 바꿔야 한다.
- 토큰은 안전하게 저장해야 한다.
- 실시간 스트림이 끊기면 재연결 로직이 필요하다.
- 세션 종료 전에 중복 호출이 들어오지 않도록 막는 것이 좋다.

---

## 6. 초보자용 한 줄 설명

Unity 연동은 결국 “로그인 토큰을 받고, 세션을 시작하고, 실시간 데이터를 받고, 끝나면 리포트를 보여주는 흐름”입니다.

---

## 7. 다음 작업

- Unity C# API wrapper 작성
- Unity 로그인 화면 연결
- Unity 실시간 스트림 수신부 구현
- Unity 리포트 UI 연결
- 실제 기기에서 `localhost` 대신 PC IP로 접속 테스트
