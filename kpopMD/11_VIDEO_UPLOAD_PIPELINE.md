# 영상 업로드와 프레임 추출 흐름

이 문서는 `영상 업로드 -> 서버 저장 -> 프레임 추출 -> 포즈 분석 -> 리포트 표시`가 어떤 순서로 움직이는지 초보자도 이해할 수 있게 정리한 문서입니다.

## 1. 사용자가 하는 일

1. 업로드 화면에서 영상을 고릅니다.
2. 기준 안무를 선택합니다.
3. `영상 업로드` 버튼을 누릅니다.

## 2. 프런트에서 일어나는 일

1. 선택한 영상을 `FormData`로 묶습니다.
2. `POST /api/uploads/video`로 서버에 보냅니다.
3. 서버가 돌려준 업로드 결과를 화면에 표시합니다.
4. 추출된 프레임이 있으면 썸네일로 바로 보여줍니다.
5. 분석이 끝나면 `report_url`로 리포트 화면을 엽니다.

## 3. 백엔드에서 일어나는 일

1. 업로드된 파일을 `backend/app/storage/video_uploads/<upload_id>/` 아래에 저장합니다.
2. `metadata.json`에 업로드 정보를 기록합니다.
3. OpenCV가 있으면 영상에서 프레임 미리보기를 추출합니다.
4. 추출한 프레임 이미지를 `frames/` 폴더에 저장합니다.
5. 저장된 프레임을 `pose_service`로 읽습니다.
6. 기준 안무 JSON과 프레임별로 비교해서 점수와 피드백을 만듭니다.
7. 분석 결과를 리포트 형태로 저장하고, `report_url`을 돌려줍니다.

## 4. 결과 데이터

업로드가 끝나면 이런 정보가 생깁니다.

- 업로드 ID
- 원본 파일 이름
- 저장된 영상 URL
- 프레임 추출 상태
- 추출된 프레임 수
- 영상 길이
- 분석 상태
- 리포트 URL
- 프레임 미리보기 목록

## 5. 현재 구현 상태

현재는 다음 흐름까지 연결되어 있습니다.

- 영상 저장
- 프레임 미리보기 추출
- `pose_service` 기반 포즈 읽기
- 기준 안무 JSON과 비교
- `analysis_service` 기반 점수 계산
- 리포트 페이지 연결

## 6. 지금 쓰는 파일

- [백엔드 업로드 라우트](C:/PROJECT/Kpop_Dance/backend/app/api/upload_routes.py)
- [백엔드 업로드 서비스](C:/PROJECT/Kpop_Dance/backend/app/services/video_upload_service.py)
- [백엔드 업로드 분석 서비스](C:/PROJECT/Kpop_Dance/backend/app/services/video_analysis_service.py)
- [백엔드 포즈 서비스](C:/PROJECT/Kpop_Dance/backend/app/services/pose_service.py)
- [프런트 업로드 페이지](C:/PROJECT/Kpop_Dance/frontend/app/upload/page.tsx)
- [프런트 API 래퍼](C:/PROJECT/Kpop_Dance/frontend/lib/api.ts)
- [프런트 타입 정의](C:/PROJECT/Kpop_Dance/frontend/lib/types.ts)

## 7. 다음에 이어서 할 일

1. 업로드된 영상의 실제 프레임을 더 정밀하게 읽기
2. 구간별 점수를 더 세분화하기
3. 리포트 화면에 업로드 영상 전용 요약 카드 추가하기
4. 관리자 화면에서 업로드 분석 실패 목록을 필터링하기
