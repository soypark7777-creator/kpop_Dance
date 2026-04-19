# 운영 환경 배포 가이드

이 문서는 로컬 개발이 아니라, 실제 배포나 시연 전에 어떤 설정을 확인해야 하는지 정리한 것이다.

## 1. 백엔드 환경변수

백엔드 `.env` 또는 서버 환경변수에서 아래 값을 확인한다.

```env
SECRET_KEY=change-this-in-production
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/avatar_dance_db?charset=utf8mb4
CORS_ORIGINS=http://localhost:3000
ADMIN_BOOTSTRAP_EMAIL=admin@kpopdance.local
ADMIN_BOOTSTRAP_PASSWORD=change-me-admin
JWT_TTL_MINUTES=120
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=60
MAX_VIDEO_UPLOAD_MB=250
VIDEO_PREVIEW_FRAME_COUNT=12
VIDEO_PREVIEW_FPS=1
VIDEO_UPLOAD_DIR=storage/video_uploads
```

## 2. 프런트 환경변수

프런트 `.env.local` 또는 배포 환경에서 아래 값을 확인한다.

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
NEXT_PUBLIC_MOCK_MODE=false
```

## 3. 로컬 실행 순서

```powershell
# 백엔드
cd C:\PROJECT\Kpop_Dance\backend
python run.py

# 프런트
cd C:\PROJECT\Kpop_Dance\frontend
npm.cmd run dev
```

## 4. 운영 점검 항목

1. `/api/health` 가 `ok`를 반환하는지 확인
2. `/auth`에서 회원가입과 로그인이 되는지 확인
3. 홈에서 사용자 정보와 최근 기록이 보이는지 확인
4. `/practice`에서 실시간 SSE가 연결되는지 확인
5. `/upload`에서 영상 업로드와 분석 리포트 이동이 되는지 확인
6. `/admin`에서 사용자와 세션 편집이 되는지 확인

## 5. 배포 시 주의할 점

- `SECRET_KEY`는 반드시 바꾼다.
- 관리자 기본 비밀번호도 운영에서는 변경한다.
- `NEXT_PUBLIC_MOCK_MODE=false` 인지 확인한다.
- CORS 허용 도메인을 실제 프런트 주소로 맞춘다.
- 업로드 폴더와 리포트 저장 폴더의 쓰기 권한을 확인한다.
- Nginx 또는 프록시를 쓰면 SSE 버퍼링을 꺼야 한다.

## 6. 다음 단계

- Unity 클라이언트를 연결하면 export JSON 검증까지 이어간다.
- 실제 사람 영상 샘플을 더 추가하면 MediaPipe 비교 정확도를 더 확인할 수 있다.
