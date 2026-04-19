# 관리자 계정 생성/초기화 가이드

이 문서는 관리자 계정을 어떻게 만들고, 언제 초기화해야 하는지 초보자도 바로 볼 수 있게 정리한 문서입니다.

## 1. 기본 관리자 계정

현재 프로젝트에는 기본 관리자 계정이 미리 잡혀 있습니다.

- 이메일: `admin@kpopdance.local`
- 비밀번호: `change-me-admin`

이 계정은 환경변수로도 바꿀 수 있습니다.

## 2. 환경변수로 바꾸는 값

백엔드 `.env` 또는 서버 환경변수에서 아래 값을 바꿉니다.

- `ADMIN_BOOTSTRAP_EMAIL`
- `ADMIN_BOOTSTRAP_PASSWORD`

예시:

```env
ADMIN_BOOTSTRAP_EMAIL=admin@kpopdance.local
ADMIN_BOOTSTRAP_PASSWORD=change-me-admin
```

## 3. 동작 방식

1. 관리자가 로그인합니다.
2. DB에 해당 이메일 사용자가 없으면 부트스트랩 계정으로 로그인합니다.
3. DB에 일반 사용자만 있으면 일반 로그인 흐름이 우선됩니다.
4. 로그인 성공 시 관리자 토큰이 발급됩니다.
5. `/admin` 페이지와 관리자 API는 `is_admin` 권한을 추가로 검사합니다.

## 4. 초기화가 필요한 경우

- 개발 중 관리자 비밀번호를 바꾸고 싶을 때
- 테스트 계정을 새로 만들고 싶을 때
- DB를 초기화해서 처음 상태로 다시 보고 싶을 때

이럴 때는 아래를 다시 맞추면 됩니다.

- 데이터베이스의 `users` 테이블
- `.env`의 관리자 부트스트랩 값
- 프런트의 관리자 로그인 기본값

## 5. 프런트에서 확인하는 위치

- `/auth` 페이지에서 관리자 로그인 가능
- 홈 상단에 관리자일 때 `Admin` 링크 표시
- `/admin` 페이지에서 관리자 대시보드 진입

## 6. DB 초기화 명령어

새로 시작하거나 로컬 DB를 다시 맞출 때는 아래 순서로 진행하면 됩니다.

```powershell
# 1) MySQL 접속 후 데이터베이스 생성
mysql -u root -p
CREATE DATABASE IF NOT EXISTS avatar_dance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE avatar_dance_db;

# 2) 스키마 반영
mysql -u root -p avatar_dance_db < backend/sql/schema.sql

# 3) 백엔드 의존성 설치
cd C:\PROJECT\Kpop_Dance\backend
python -m pip install -r requirements.txt

# 4) 마이그레이션 초기화가 필요한 경우
flask --app run.py db init
flask --app run.py db migrate -m "initial schema"
flask --app run.py db upgrade
```

만약 `flask db`를 아직 쓰지 않는 방식이면, `schema.sql`만 적용해도 현재 앱은 동작합니다.

## 7. 주의할 점

- 관리자 계정은 일반 회원가입으로 만들지 않는 것이 좋습니다.
- 관리자 권한은 `is_admin=true`와 토큰 검증이 함께 맞아야 동작합니다.
- 운영 환경에서는 기본 비밀번호를 반드시 바꿔야 합니다.
