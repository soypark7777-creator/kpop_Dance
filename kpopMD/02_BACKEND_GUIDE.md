# 🐍 백엔드 개발 규칙서 (BACKEND GUIDE)

> 인코딩: UTF-8 | 대상: Backend 개발자 | 스택: Python 3.11+ / Flask / MySQL

---

## 1. 기술 스택 및 버전

```
Python         3.11+
Flask          3.x
Flask-CORS     4.x
Flask-Migrate  4.x (Alembic 기반)
SQLAlchemy     2.x
PyMySQL        1.x
python-dotenv  1.x
Pydantic       2.x
MediaPipe      0.10+
NumPy          1.26+
SciPy          1.x (DTW 계산)
Gunicorn       21.x (프로덕션)
```

---

## 2. 폴더 구조 및 역할

```
backend/
├─ app/
│  ├─ __init__.py         ← Application Factory (create_app 함수)
│  ├─ config.py           ← 환경별 설정 클래스
│  ├─ extensions.py       ← db, cors, migrate 등 확장 초기화
│  │
│  ├─ api/                ← Blueprint 라우트 모음
│  │  ├─ __init__.py
│  │  ├─ session_routes.py    ← 세션 시작/종료
│  │  ├─ stream_routes.py     ← SSE 실시간 스트림
│  │  ├─ analysis_routes.py   ← 리포트 조회
│  │  └─ avatar_routes.py     ← Unity export
│  │
│  ├─ services/           ← 핵심 비즈니스 로직
│  │  ├─ pose_service.py      ← MediaPipe 포즈 추출
│  │  ├─ angle_service.py     ← 관절 각도 계산
│  │  ├─ dtw_service.py       ← DTW 유사도 계산
│  │  ├─ feedback_service.py  ← 피드백 메시지 생성
│  │  ├─ replay_service.py    ← 리플레이 데이터 처리
│  │  └─ avatar_export_service.py ← Unity export JSON
│  │
│  ├─ models/             ← SQLAlchemy ORM 모델
│  │  ├─ base.py              ← Base 클래스 + Mixin
│  │  ├─ user.py
│  │  ├─ dance_reference.py
│  │  ├─ practice_session.py
│  │  ├─ session_frame.py
│  │  ├─ analysis_report.py
│  │  └─ avatar_render.py
│  │
│  ├─ schemas/            ← Pydantic 스키마 (request/response 검증)
│  │  ├─ pose.py
│  │  ├─ session.py
│  │  ├─ analysis.py
│  │  └─ avatar.py
│  │
│  ├─ repositories/       ← DB 접근 추상화 레이어
│  │  ├─ user_repository.py
│  │  └─ session_repository.py
│  │
│  └─ utils/              ← 공통 유틸리티
│     ├─ geometry.py          ← 3D 각도 계산
│     ├─ mediapipe_helpers.py ← MediaPipe 래퍼
│     ├─ timecode.py          ← 타임스탬프 처리
│     └─ response.py          ← 공통 응답 포맷터
│
├─ storage/               ← 파일 저장 (로컬/S3 대응)
│  ├─ dance_reference/        ← 기준 안무 JSON
│  ├─ session_json/           ← 세션 프레임 데이터
│  └─ replay_exports/         ← Unity export JSON
│
├─ migrations/            ← Flask-Migrate 마이그레이션
├─ sql/
│  └─ schema.sql          ← MySQL 테이블 정의
├─ run.py                 ← 앱 실행 진입점
├─ requirements.txt
└─ .env.example
```

---

## 3. Application Factory 패턴 필수

```python
# app/__init__.py
# -*- coding: utf-8 -*-
from flask import Flask
from .extensions import db, cors, migrate
from .config import config_map

def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_map[config_name])

    # 확장 초기화
    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    migrate.init_app(app, db)

    # Blueprint 등록
    from .api import session_routes, stream_routes, analysis_routes, avatar_routes
    app.register_blueprint(session_routes.bp, url_prefix="/api")
    app.register_blueprint(stream_routes.bp, url_prefix="/api")
    app.register_blueprint(analysis_routes.bp, url_prefix="/api")
    app.register_blueprint(avatar_routes.bp, url_prefix="/api")

    return app
```

---

## 4. 핵심 API 엔드포인트 정의

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/health` | 서버 상태 확인 |
| POST | `/api/session/start` | 연습 세션 시작 |
| POST | `/api/session/end` | 연습 세션 종료 |
| GET | `/api/stream/live` | SSE 실시간 분석 스트림 |
| GET | `/api/analysis/<session_id>` | 오답 노트 리포트 조회 |
| GET | `/api/avatar/export/<session_id>` | Unity export JSON |
| GET | `/api/dance-references` | 안무 목록 |
| GET | `/api/dance-references/<id>` | 안무 상세 |

---

## 5. 핵심 비즈니스 로직 구현 순서

```
1단계: 세션 시작 API (POST /api/session/start)
   └─ 세션 ID 발급, 기준 안무 JSON 로딩

2단계: SSE 스트림 API (GET /api/stream/live)
   └─ MediaPipe 포즈 추출
   └─ angle_service → 관절 각도 계산
   └─ wrong joint 판정 (angle_diff ≥ 15°)
   └─ feedback_service → 피드백 메시지 생성
   └─ SSE 응답 전송

3단계: 세션 종료 API (POST /api/session/end)
   └─ DTW 최종 점수 계산
   └─ analysis_report 생성 및 DB 저장
   └─ Unity export JSON 생성

4단계: 리포트 조회 API (GET /api/analysis/<session_id>)
5단계: Unity export API (GET /api/avatar/export/<session_id>)
```

---

## 6. 각도 계산 핵심 로직

```python
# utils/geometry.py
# -*- coding: utf-8 -*-
import numpy as np
from typing import Tuple

def calculate_angle(
    a: Tuple[float, float, float],
    b: Tuple[float, float, float],  # 꼭짓점 관절
    c: Tuple[float, float, float]
) -> float:
    """
    세 점으로 관절 각도 계산 (도 단위)
    b가 꼭짓점 (예: 팔꿈치)
    """
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    ba = a - b
    bc = c - b

    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-10)
    angle = np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))
    return float(angle)

def is_wrong_joint(user_angle: float, ref_angle: float, threshold: float = 15.0) -> bool:
    """15도 이상 차이 → wrong joint"""
    return abs(user_angle - ref_angle) >= threshold
```

---

## 7. SSE 실시간 스트림 구현 패턴

```python
# api/stream_routes.py
# -*- coding: utf-8 -*-
import json
from flask import Blueprint, Response, stream_with_context
from ..services.pose_service import get_current_pose
from ..services.angle_service import analyze_pose
from ..services.feedback_service import generate_feedback

bp = Blueprint('stream', __name__)

@bp.route('/stream/live')
def live_stream():
    def event_stream():
        while True:
            try:
                pose_data = get_current_pose()
                analysis = analyze_pose(pose_data)
                feedback = generate_feedback(analysis['joint_errors'])

                data = {
                    "match_score": analysis['match_score'],
                    "joint_errors": analysis['joint_errors'],
                    "feedback": feedback,
                    "user_pose": pose_data['user'],
                    "reference_pose": pose_data['reference'],
                    "timestamp": pose_data['timestamp'],
                    "is_recording": True
                }

                yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(
        stream_with_context(event_stream()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*'
        }
    )
```

---

## 8. DB 모델 작성 규칙 (SQLAlchemy 2.x)

```python
# models/base.py
# -*- coding: utf-8 -*-
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )
```

---

## 9. 작업 진행 추적 체크리스트

### Phase 1 — 기반 구조
- [ ] Flask 앱 팩토리 구조 생성
- [ ] MySQL 연결 설정 (PyMySQL)
- [ ] `.env` 설정 및 `python-dotenv` 적용
- [ ] `schema.sql` 실행 → MySQL Workbench에서 테이블 확인
- [ ] Flask-Migrate 초기화 (`flask db init`)

### Phase 2 — 핵심 API
- [ ] `POST /api/session/start` 구현
- [ ] `GET /api/health` 구현 및 테스트
- [ ] MediaPipe 포즈 추출 동작 확인
- [ ] `geometry.py` 각도 계산 유닛 테스트

### Phase 3 — 분석 엔진
- [ ] `angle_service.py` → wrong joint 판정
- [ ] `dtw_service.py` → DTW 점수 계산
- [ ] `feedback_service.py` → 피드백 메시지 생성
- [ ] `GET /api/stream/live` SSE 동작 확인

### Phase 4 — 리포트 & Export
- [ ] `POST /api/session/end` 구현
- [ ] `analysis_report` DB 저장 확인
- [ ] `GET /api/analysis/<session_id>` 구현
- [ ] `avatar_export_service.py` Unity JSON 생성
- [ ] `GET /api/avatar/export/<session_id>` 구현

### Phase 5 — 관리자 & 보안
- [ ] JWT 인증 미들웨어 추가
- [ ] 관리자 API 엔드포인트 보호
- [ ] Rate Limiting 적용
- [ ] 에러 핸들러 전역 등록

---

## 10. 자주 하는 실수 & 주의사항

| 실수 | 해결책 |
|---|---|
| MediaPipe import 오류 | `pip install mediapipe --break-system-packages` |
| MySQL 한글 깨짐 | `charset=utf8mb4` 연결 설정 확인 |
| SSE 연결 끊김 | `X-Accel-Buffering: no` 헤더 필수 |
| SQLAlchemy 2.x API 오류 | `session.execute(select(...))` 스타일 사용 |
| CORS 오류 | `Flask-CORS` + `origins` 명시 확인 |
| DTW 성능 저하 | 프레임 수 제한 (최대 300프레임 기준) |
| JSON 직렬화 오류 | `ensure_ascii=False` 필수 |
