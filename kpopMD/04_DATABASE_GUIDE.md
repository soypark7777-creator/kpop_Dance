# 🗄️ 데이터베이스 설계 규칙서 (DATABASE GUIDE)

> 인코딩: UTF-8 | DB: MySQL 8.x + MySQL Workbench | 관리: 관리자 계정 전용

---

## 1. MySQL Workbench 기본 설정

```
Host:       localhost (또는 서버 IP)
Port:       3306
Username:   root (개발) / admin (프로덕션)
Database:   avatar_dance_db
Charset:    utf8mb4
Collation:  utf8mb4_unicode_ci
```

### 연결 문자열
```
# Python PyMySQL
mysql+pymysql://user:password@localhost:3306/avatar_dance_db?charset=utf8mb4

# MySQL Workbench 연결
mysql -u root -p --default-character-set=utf8mb4 avatar_dance_db
```

---

## 2. 데이터베이스 생성

```sql
-- sql/init.sql
CREATE DATABASE IF NOT EXISTS avatar_dance_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE avatar_dance_db;
```

---

## 3. 전체 테이블 스키마

```sql
-- =========================================
-- 1. users — 사용자 계정
-- =========================================
CREATE TABLE IF NOT EXISTS users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email           VARCHAR(255)    NOT NULL,
  password_hash   VARCHAR(255)    NOT NULL,
  nickname        VARCHAR(50)     NOT NULL,
  avatar_id       VARCHAR(50)     DEFAULT NULL,
  points          INT UNSIGNED    NOT NULL DEFAULT 0,
  status          ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_nickname (nickname),
  INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 2. dance_references — 기준 안무 데이터
-- =========================================
CREATE TABLE IF NOT EXISTS dance_references (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title               VARCHAR(200)    NOT NULL,
  artist_name         VARCHAR(100)    NOT NULL,
  difficulty          ENUM('easy','normal','hard','expert') NOT NULL DEFAULT 'normal',
  duration_seconds    INT UNSIGNED    NOT NULL DEFAULT 0,
  thumbnail_url       VARCHAR(500)    DEFAULT NULL,
  reference_json_path VARCHAR(500)    NOT NULL,
  preview_video_url   VARCHAR(500)    DEFAULT NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_dance_title (title),
  INDEX idx_dance_difficulty (difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 3. practice_sessions — 연습 세션
-- =========================================
CREATE TABLE IF NOT EXISTS practice_sessions (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id               BIGINT UNSIGNED NOT NULL,
  dance_reference_id    BIGINT UNSIGNED NOT NULL,
  started_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at              DATETIME        DEFAULT NULL,
  total_score           DECIMAL(5,2)    DEFAULT NULL,
  lowest_section_score  DECIMAL(5,2)    DEFAULT NULL,
  unlock_avatar_render  TINYINT(1)      NOT NULL DEFAULT 0,
  session_status        ENUM('active','completed','abandoned') NOT NULL DEFAULT 'active',
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_session_user_id (user_id),
  INDEX idx_session_dance_ref (dance_reference_id),
  INDEX idx_session_status (session_status),
  CONSTRAINT fk_session_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_session_dance
    FOREIGN KEY (dance_reference_id) REFERENCES dance_references(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 4. session_frames — 프레임별 포즈 데이터
-- =========================================
CREATE TABLE IF NOT EXISTS session_frames (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id        BIGINT UNSIGNED NOT NULL,
  frame_index       INT UNSIGNED    NOT NULL,
  timestamp_seconds DECIMAL(10,3)   NOT NULL,
  pose_json         JSON            DEFAULT NULL,
  score             DECIMAL(5,2)    DEFAULT NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_frame_session_id (session_id),
  INDEX idx_frame_session_frame (session_id, frame_index),
  CONSTRAINT fk_frame_session
    FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 5. analysis_reports — 오답 노트 리포트
-- =========================================
CREATE TABLE IF NOT EXISTS analysis_reports (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id          BIGINT UNSIGNED NOT NULL,
  weakest_section     VARCHAR(100)    DEFAULT NULL,
  most_wrong_joints   JSON            DEFAULT NULL,
  average_angle_error DECIMAL(6,3)    DEFAULT NULL,
  report_json         JSON            DEFAULT NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_report_session (session_id),
  CONSTRAINT fk_report_session
    FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 6. avatar_renders — Unity 렌더링 기록
-- =========================================
CREATE TABLE IF NOT EXISTS avatar_renders (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  session_id      BIGINT UNSIGNED NOT NULL,
  avatar_id       VARCHAR(50)     DEFAULT NULL,
  stage_theme_id  VARCHAR(50)     DEFAULT NULL,
  costume_id      VARCHAR(50)     DEFAULT NULL,
  render_status   ENUM('pending','rendering','completed','failed') NOT NULL DEFAULT 'pending',
  output_url      VARCHAR(500)    DEFAULT NULL,
  requested_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    DATETIME        DEFAULT NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_render_user_id (user_id),
  INDEX idx_render_session_id (session_id),
  INDEX idx_render_status (render_status),
  CONSTRAINT fk_render_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_render_session
    FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 7. reward_items — 보상 아이템 정의
-- =========================================
CREATE TABLE IF NOT EXISTS reward_items (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_type     ENUM('avatar','stage','costume','effect') NOT NULL,
  item_name     VARCHAR(100)    NOT NULL,
  price_points  INT UNSIGNED    NOT NULL DEFAULT 0,
  is_premium    TINYINT(1)      NOT NULL DEFAULT 0,
  metadata_json JSON            DEFAULT NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_item_type (item_type),
  INDEX idx_item_premium (is_premium)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 8. user_reward_items — 사용자 보유 아이템
-- =========================================
CREATE TABLE IF NOT EXISTS user_reward_items (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  reward_item_id  BIGINT UNSIGNED NOT NULL,
  acquired_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_item_user_id (user_id),
  INDEX idx_user_item_reward_id (reward_item_id),
  CONSTRAINT fk_user_item_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_item_reward
    FOREIGN KEY (reward_item_id) REFERENCES reward_items(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. 테이블 설계 근거

| 테이블 | 핵심 이유 | JSON 사용 이유 |
|---|---|---|
| `users` | 인증/권한의 기준 테이블 | — |
| `dance_references` | 기준 안무 메타데이터 저장 | reference_json_path: 파일 경로만 저장 |
| `practice_sessions` | 연습 단위 기록 | — |
| `session_frames` | **프레임별 포즈 원시 데이터** | pose_json: 관절별 좌표 JSON |
| `analysis_reports` | **오답 노트** (핵심 산출물) | most_wrong_joints, report_json |
| `avatar_renders` | Unity 렌더 요청/결과 추적 | — |
| `reward_items` | 아이템 카탈로그 | metadata_json: 확장 속성 |
| `user_reward_items` | 사용자-아이템 소유 관계 | — |

---

## 5. 관리자 모드 운영 규칙

### 5-1. MySQL Workbench 관리자 전용 작업
```sql
-- 직접 데이터 조작은 관리자만 MySQL Workbench에서
-- 아래 작업은 Workbench에서만:
-- 1. 스키마 변경 (ALTER TABLE)
-- 2. 대량 데이터 수정
-- 3. 세션 이력 조회/삭제
-- 4. 시스템 모니터링 쿼리
```

### 5-2. 앱 내 관리자 페이지 (`/admin`) 역할
```
/admin/dashboard  — 전체 통계 요약
/admin/dance      — 안무 CRUD (추가/수정/삭제)
/admin/users      — 사용자 조회/상태 변경
/admin/sessions   — 세션 이력 조회
/admin/renders    — 렌더링 현황 조회
/admin/items      — 보상 아이템 CRUD
```

### 5-3. 관리자 보안
```python
# 관리자 라우트 보호 (Flask)
from functools import wraps
from flask import g, abort

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not g.current_user or g.current_user.role != 'admin':
            abort(403)
        return f(*args, **kwargs)
    return decorated
```

---

## 6. 마이그레이션 관리

```bash
# Flask-Migrate 초기화 (최초 1회)
flask db init

# 마이그레이션 생성 (모델 변경 후)
flask db migrate -m "add_user_role_column"

# 마이그레이션 적용
flask db upgrade

# 롤백
flask db downgrade

# 현재 버전 확인
flask db current
```

---

## 7. 자주 쓰는 MySQL Workbench 쿼리 모음

```sql
-- 현재 세션 현황
SELECT ps.id, u.nickname, dr.title, ps.total_score, ps.session_status, ps.created_at
FROM practice_sessions ps
JOIN users u ON ps.user_id = u.id
JOIN dance_references dr ON ps.dance_reference_id = dr.id
ORDER BY ps.created_at DESC
LIMIT 50;

-- 사용자별 평균 점수
SELECT u.nickname, COUNT(ps.id) AS session_count, AVG(ps.total_score) AS avg_score
FROM users u
LEFT JOIN practice_sessions ps ON u.id = ps.user_id
WHERE ps.session_status = 'completed'
GROUP BY u.id
ORDER BY avg_score DESC;

-- 가장 많이 연습한 안무
SELECT dr.title, dr.artist_name, COUNT(ps.id) AS play_count
FROM dance_references dr
LEFT JOIN practice_sessions ps ON dr.id = ps.dance_reference_id
GROUP BY dr.id
ORDER BY play_count DESC
LIMIT 10;

-- 렌더링 대기 중인 목록
SELECT ar.id, u.nickname, ar.render_status, ar.requested_at
FROM avatar_renders ar
JOIN users u ON ar.user_id = u.id
WHERE ar.render_status IN ('pending', 'rendering')
ORDER BY ar.requested_at ASC;
```
