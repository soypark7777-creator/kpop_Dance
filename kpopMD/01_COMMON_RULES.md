# 📋 공통 개발 규칙서 (COMMON RULES)

> 인코딩: UTF-8 | 이 문서는 백엔드/프런트엔드/디자이너 모두 숙지 필수

---

## 1. 인코딩 규칙

```
모든 파일: UTF-8 (BOM 없음)
MySQL: CHARACTER SET utf8mb4, COLLATE utf8mb4_unicode_ci
Python: # -*- coding: utf-8 -*- (파일 상단 명시)
JSON 응답: Content-Type: application/json; charset=UTF-8
HTML meta: <meta charset="UTF-8" />
```

> ✅ **UTF-8 체크리스트**
> - [ ] MySQL 테이블 생성 시 `DEFAULT CHARSET=utf8mb4`
> - [ ] Python 파일 상단 인코딩 선언
> - [ ] Next.js `layout.tsx` meta charset 확인
> - [ ] .env 파일 UTF-8 저장 확인 (VSCode 우하단 인코딩 확인)
> - [ ] JSON 응답 헤더 UTF-8 포함

---

## 2. 환경변수 관리 규칙

```bash
# .env.example (공개 가능, 값 없음)
FLASK_ENV=development
FLASK_SECRET_KEY=your-secret-key-here
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/avatar_dance
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DB=avatar_dance_db
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
```

> ⛔ **절대 금지**: .env 파일을 git에 커밋하지 말 것
> `.gitignore`에 반드시 포함:
> ```
> .env
> .env.local
> .env.production
> *.env
> ```

---

## 3. 데이터베이스 규칙 (MySQL Workbench 기준)

### 3-1. 기본 설정
```sql
-- 모든 테이블 공통 설정
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 모든 테이블 공통 컬럼
created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### 3-2. PK 규칙
```sql
-- 일관성: BIGINT UNSIGNED AUTO_INCREMENT
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY
```

### 3-3. FK 규칙
```sql
-- 반드시 인덱스 + 제약조건 명시
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
```

### 3-4. 관리자 모드 원칙
- DB 직접 접근은 **MySQL Workbench 관리자 계정**으로만
- 앱 내 관리자 페이지(`/admin`)를 통해 CRUD
- 일반 사용자는 DB 직접 접근 불가
- 관리자 계정은 별도 환경변수 관리

---

## 4. API 응답 포맷 통일 규칙

```json
// 성공 응답
{
  "success": true,
  "data": { ... },
  "message": "처리 완료",
  "timestamp": "2026-04-18T12:00:00Z"
}

// 오류 응답
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "세션을 찾을 수 없습니다.",
    "detail": "session_id: xxx"
  },
  "timestamp": "2026-04-18T12:00:00Z"
}

// 페이지네이션 응답
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

---

## 5. Joint Naming 규칙 (절대 변경 금지)

```typescript
// lib/types.ts — 이 파일이 전체 시스템의 기준
export const JOINT_NAMES = [
  'nose',
  'left_shoulder', 'right_shoulder',
  'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist',
  'left_hip', 'right_hip',
  'left_knee', 'right_knee',
  'left_ankle', 'right_ankle',
] as const;

export type JointName = typeof JOINT_NAMES[number];
```

---

## 6. 데이터 포맷 분리 규칙

### A. 실시간용 (Lightweight JSON) — SSE/WebSocket
```json
{
  "session_id": "uuid",
  "timestamp": 1.23,
  "is_recording": true,
  "match_score": 82.5,
  "feedback": "왼쪽 팔꿈치를 더 높이 올려주세요",
  "user_pose": { "left_shoulder": [0.5, 0.3, 0.0], "..." : "..." },
  "reference_pose": { "left_shoulder": [0.5, 0.2, 0.0], "..." : "..." },
  "joint_errors": {
    "left_elbow": { "status": "wrong", "angle_diff": 22.5 },
    "right_shoulder": { "status": "ok", "angle_diff": 3.1 }
  }
}
```

### B. 리플레이/Unity용 (Extended JSON) — REST API
```json
{
  "session_id": "uuid",
  "frames": [
    {
      "frame": 0,
      "timestamp": 0.0,
      "joints": {
        "left_shoulder": {
          "position": [0.5, 0.3, 0.0],
          "rotation": [0, 0, 0, 1]
        }
      },
      "section_score": 88.0
    }
  ],
  "report": {
    "weakest_section": "verse_2",
    "most_wrong_joints": ["left_elbow", "right_knee"],
    "average_angle_error": 12.4,
    "total_score": 82.5
  }
}
```

---

## 7. Git 브랜치 전략

```
main          ← 배포 가능 상태 (보호)
  └─ develop  ← 통합 개발 브랜치
       ├─ feature/backend-session-api
       ├─ feature/frontend-practice-page
       ├─ feature/mediapipe-integration
       └─ fix/utf8-encoding-issue
```

> **커밋 메시지 규칙**
> ```
> feat: 세션 시작 API 추가
> fix: UTF-8 인코딩 오류 수정
> refactor: pose_service 모듈 분리
> docs: API 명세 업데이트
> test: 각도 계산 유닛 테스트 추가
> ```

---

## 8. 수정/추가/삭제 가능 구조 설계 원칙

모든 핵심 데이터는 CRUD가 가능해야 함.

| 기능 | 방법 |
|---|---|
| 안무 추가/수정/삭제 | 관리자 페이지 `/admin/dance` |
| 사용자 관리 | 관리자 페이지 `/admin/users` |
| 아이템 관리 | 관리자 페이지 `/admin/items` |
| 세션 기록 조회 | 관리자 페이지 `/admin/sessions` |
| 아바타 렌더 현황 | 관리자 페이지 `/admin/renders` |

```
// API 설계 기본 패턴 (RESTful)
GET    /api/dance-references          ← 목록 조회
GET    /api/dance-references/:id      ← 단건 조회
POST   /api/dance-references          ← 생성
PUT    /api/dance-references/:id      ← 전체 수정
PATCH  /api/dance-references/:id      ← 부분 수정
DELETE /api/dance-references/:id      ← 삭제 (soft delete 권장)
```

---

## 9. 보안 규칙

```
인증: JWT 토큰 기반 (Bearer Token)
비밀번호: bcrypt 해싱 (절대 평문 저장 금지)
CORS: 허용 origin 명시적 지정
SQL: SQLAlchemy ORM 사용 (raw SQL injection 방지)
파일 업로드: 확장자 검증 + 사이즈 제한
Rate Limit: API 요청 횟수 제한 (Flask-Limiter)
HTTPS: 프로덕션 배포 시 필수
```

---

## 10. 개발 진행 체크리스트 (작업 시 매번 확인)

### 작업 시작 전
- [ ] 현재 브랜치 확인 (`git branch`)
- [ ] `develop` 브랜치에서 분기했는지 확인
- [ ] .env 파일 설정 완료 확인

### 작업 중
- [ ] UTF-8 인코딩 유지 확인
- [ ] Joint 이름 규칙 준수 확인
- [ ] API 응답 포맷 통일 확인
- [ ] 타입 힌트 작성 (Python + TypeScript)
- [ ] 에러 처리 코드 포함 확인

### 작업 완료 후
- [ ] 로컬에서 실행 테스트
- [ ] API 엔드포인트 동작 확인
- [ ] MySQL Workbench에서 DB 상태 확인
- [ ] PR 생성 전 코드 리뷰 요청
