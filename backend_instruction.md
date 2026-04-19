# Claude Code / Codex 실행 프롬프트
프로젝트명: My Avatar Dance Master

AVATAR_DANCE_MASTER_INSTRUCTIONS.md를 기준으로 **Python Flask 기반 백엔드**를 구현해줘.

이 프로젝트의 목표는 K-pop 안무 학습 앱의 **실시간 분석 엔진**을 만드는 것이다.  
단순 데모가 아니라, 이후 웹앱 / 모바일 / Unity 아바타 렌더링까지 연결되는 **실서비스형 Flask 백엔드 구조**로 설계해야 한다.

---

## 핵심 목표
다음 기능을 반드시 구현해줘.

1. **MediaPipe Pose 기반 실시간 사용자 포즈 추출**
2. **기준 안무 JSON과 사용자 포즈 비교**
3. **관절별 각도 계산 및 15도 이상 차이 감지**
4. **DTW(Dynamic Time Warping) 기반 타이밍 보정 유사도 계산**
5. **실시간 피드백 메시지 생성**
6. **세션 종료 후 오답 노트 분석 리포트 생성**
7. **Unity 리타겟팅용 joint/rotation export JSON 생성**
8. **SSE(Server-Sent Events) 또는 Flask-SocketIO 기반 실시간 전송 API 구현**
9. **추후 모바일 앱에서도 재사용 가능한 API 구조로 설계**
10. **MySQL 연동 가능 구조로 설계하되, starter 버전은 파일 저장 기반 또는 DB 확장 가능 구조로 작성**

---

## Flask를 사용하는 이유
이번 버전은 **빠른 MVP 제작과 실시간 포즈 분석 파이프라인 검증**이 목적이므로 FastAPI가 아니라 Flask 기반으로 설계한다.

다만 아래 원칙은 반드시 지켜야 한다.

- Flask라도 구조를 느슨하게 만들지 말 것
- Blueprint 기반으로 API 분리
- services / schemas / models / utils 구조 분리
- 실시간 스트림은 SSE 우선
- 추후 Flask-SocketIO 확장 가능하게 구조 잡기
- 프런트엔드 / 모바일 / Unity가 모두 같은 JSON 계약을 쓰도록 설계

---

## 구현 우선순위
다음 순서로 구현해줘.

1. **세션 시작/종료 API**
2. **실시간 포즈 분석 SSE API**
3. **각도 계산 및 wrong joint 판정**
4. **DTW 및 점수 계산**
5. **오답 노트 리포트 생성**
6. **Unity export JSON 생성**

---

## 구조 요구사항
프로젝트 구조는 반드시 아래 원칙을 따라줘.

- `app/api`
- `app/services`
- `app/schemas`
- `app/models`
- `app/utils`

추가 요구사항:
- Pydantic 또는 dataclass 기반 schema 사용
- geometry 유틸로 각도 계산 분리
- dtw_service 분리
- replay_service와 avatar_export_service 분리
- Blueprint 사용
- requirements.txt 포함
- .env.example 포함
- 타입 힌트 충분히 작성
- 예외 처리 충분히 작성
- 유지보수 가능한 구조로 모듈 분리

---

## 백엔드 역할 정의
이 Flask 백엔드는 아래 역할을 수행해야 한다.

### 1. Motion Capture Layer 지원
- 사용자 포즈 추출
- 기준 안무 포즈 로딩

### 2. Analysis Layer 지원
- 관절 각도 계산
- 기준 안무와 비교
- 틀린 부위 감지
- DTW 기반 유사도 계산
- 세션 종료 후 리포트 생성

### 3. Experience Layer 지원
- 프런트엔드가 바로 소비 가능한 실시간 JSON 제공
- feedback, score, joint_errors, report 데이터 제공

### 4. Avatar Rendering Layer 지원
- Unity에서 사용할 수 있는 export JSON 생성
- joint position + optional rotation 저장
- relative angle 기반 확장 고려

---

## 필수 데이터 설계 원칙

### 1. Joint naming 통일
기준 안무와 사용자 포즈는 반드시 같은 관절 이름 체계를 사용해야 한다.

예:
- nose
- left_shoulder
- right_shoulder
- left_elbow
- right_elbow
- left_wrist
- right_wrist
- left_hip
- right_hip
- left_knee
- right_knee
- left_ankle
- right_ankle

### 2. 데이터 포맷은 2단계로 분리

#### A. 실시간 비교용 lightweight JSON
- session_id
- timestamp
- user_pose
- reference_pose
- joint_errors
- feedback
- match_score
- is_recording

#### B. 리플레이 / Unity export용 extended JSON
- session_id
- frame
- timestamp
- joints
- position
- optional rotation
- section_score
- report data

### 3. 비교 로직 원칙
- 단순 x, y, z 절대좌표 비교가 아니라
- **관절 각도 중심 비교**
- timing mismatch는 **DTW로 보정**
- wrong joint 판정은 angle_diff >= 15도 기준

---

## Flask API 요구사항

### 1. `POST /api/session/start`
- 연습 세션 생성
- 기준 안무 ID 지정 가능
- 세션 시작 시 필요한 초기 상태 반환

### 2. `GET /api/stream/live`
- SSE 기반 실시간 분석 스트림
- 프런트엔드가 지속적으로 수신
- 아래 데이터를 전송
  - joint_errors
  - feedback
  - match_score
  - timestamp
  - user_pose
  - reference_pose

### 3. `POST /api/session/end`
- 세션 종료
- DTW 최종 점수 계산
- 오답 노트 리포트 저장
- Unity export 가능 상태로 종료

### 4. `GET /api/analysis/<session_id>`
- weakest_section
- most_wrong_joints
- average_angle_error
- section_scores
- total_score

### 5. `GET /api/avatar/export/<session_id>`
- Unity용 export JSON 반환
- joint position 포함
- 필요 시 rotation 포함

### 6. `GET /api/health`
- 서버 상태 확인

---

## 권장 폴더 구조
아래 구조로 생성해줘.

```bash
backend/
├─ app/
│  ├─ __init__.py
│  ├─ config.py
│  ├─ extensions.py
│  ├─ api/
│  │  ├─ __init__.py
│  │  ├─ session_routes.py
│  │  ├─ stream_routes.py
│  │  ├─ analysis_routes.py
│  │  └─ avatar_routes.py
│  ├─ services/
│  │  ├─ pose_service.py
│  │  ├─ angle_service.py
│  │  ├─ dtw_service.py
│  │  ├─ feedback_service.py
│  │  ├─ replay_service.py
│  │  └─ avatar_export_service.py
│  ├─ models/
│  │  ├─ session.py
│  │  └─ analysis.py
│  ├─ schemas/
│  │  ├─ pose.py
│  │  ├─ session.py
│  │  ├─ analysis.py
│  │  └─ avatar.py
│  └─ utils/
│     ├─ geometry.py
│     ├─ mediapipe_helpers.py
│     └─ timecode.py
├─ storage/
│  ├─ dance_reference/
│  ├─ session_json/
│  └─ replay_exports/
├─ run.py
├─ requirements.txt
└─ .env.example

