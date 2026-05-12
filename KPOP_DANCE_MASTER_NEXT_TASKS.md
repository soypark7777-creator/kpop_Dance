# 🎵 K-pop Dance Clone / My Avatar Dance Master
# NEXT TASKS & OPERATION CHECKLIST
# Updated: 2026-05-12

---

# ✅ 현재 구현 완료 상태

## Frontend
- [x] Home
- [x] Practice
- [x] Report
- [x] Replay
- [x] Avatar
- [x] Admin UI
- [x] Zustand state
- [x] SSE 연결 구조
- [x] Mock fallback 구조
- [x] Mobile responsive UI

## Backend
- [x] Flask 기본 구조
- [x] MySQL 연결
- [x] API 공통 응답 포맷
- [x] Session API
- [x] Analysis API
- [x] SSE Stream API
- [x] session_frames 저장
- [x] analysis_reports 생성

## AI / Pose
- [x] Frontend MediaPipe Pose
- [x] Pose frame 전송 API
- [x] Angle 기반 점수 계산
- [x] SSE 실시간 feedback
- [x] Reference JSON 생성 도구
- [x] Reference JSON validation 도구

---

# 🚨 지금 앱이 실제로 동작하는 흐름

```text
기준 영상(mp4)
→ Reference JSON 생성
→ DB reference_json_path 등록

사용자 연습 시작
→ Frontend MediaPipe Pose
→ /api/session/frame
→ Backend 점수 계산
→ SSE feedback 반환
→ session_frames 저장

연습 종료
→ analysis_reports 생성
→ report/replay/avatar 연결
✅ 운영 전 필수 체크리스트
1. 서버 상태 확인
Backend
 Flask 실행 성공
 /api/health 응답 확인
 MySQL 연결 성공
 migrations 정상 적용
 CORS 정상 허용

테스트:

curl http://127.0.0.1:5000/api/health
Frontend
 npm run dev 성공
 NEXT_PUBLIC_API_URL 확인
 NEXT_PUBLIC_MOCK_MODE=false 확인
 practice 페이지 진입 가능
2. SSE 연결 체크
 session/start 성공
 stream_url 반환 확인
 EventSource 연결 성공
 실시간 점수 변화 확인
 feedback 실시간 반영
 연결 종료 시 crash 없음

확인할 필드:

session_id
match_score
user_pose
reference_pose
feedback
joint_errors
3. MediaPipe 체크
 카메라 권한 요청 정상
 브라우저 호환 확인
 MediaPipe 초기화 성공
 pose 추출 FPS 확인
 visibility 정상
 페이지 이탈 시 카메라 종료
4. Reference JSON 체크
 extract_reference_pose.py 실행 성공
 validate_reference_json.py PASS
 reference_json_path 등록 확인
 reference_pose_service 로딩 성공
 nearest frame 조회 성공
5. 점수 계산 체크
 angle_service 계산 정상
 average_error 계산 정상
 score clamp 정상
 joint_errors 생성 정상
 feedback 생성 정상
6. Report 체크
 report 페이지 직접 접근 가능
 total_score 표시
 weakest_section 표시
 wrong_joints 표시
 replay 버튼 이동 정상
7. Replay 체크
 frame 조회 성공
 replay canvas 표시
 timeline 정상 이동
 speed control 정상
 빈 frame crash 없음
8. Avatar 체크
 80점 미만 lock
 80점 이상 unlock
 render 상태 표시
 export API 연결 정상


🔥 앞으로 가장 중요한 작업 순서
Phase 1
Reference JSON 품질 향상

우선순위:

 기준 안무 FPS 보정
 noise smoothing
 low visibility interpolation
 nearest frame 최적화
 section 자동 분할

추가 예정:

 pose smoothing
 Kalman filter
 DTW 기반 timing alignment
Phase 2
점수 알고리즘 고도화

현재:

angle_diff 기반 단순 점수

다음 목표:

 DTW timing 보정
 motion similarity 계산
 section별 점수
 rhythm penalty
 combo accuracy
 body balance score
 left/right symmetry 분석
Phase 3
Replay 고도화
 reference skeleton overlay
 wrong joint 강조
 frame diff heatmap
 slow motion replay
 AI coach timeline
Phase 4
Avatar / Unity 연동
 Unity export API
 FBX animation export
 avatar motion retargeting
 stage camera movement
 cinematic replay
Phase 5
콘텐츠 시스템
 dance pack
 beginner course
 K-pop challenge mode
 ranking system
 daily mission
 reward items
 premium unlock
Phase 6
관리자 기능 강화
 reference video upload UI
 JSON validation UI
 section editor
 manual keyframe editor
 score tuning panel
 analytics dashboard


🚨 현재 리스크
높은 우선순위
1. 모바일 성능

문제:

MediaPipe CPU 사용량 높음

대응:

 FPS 제한
 throttling
 visibility threshold 조정
2. 조명/카메라 환경

문제:

pose 흔들림

대응:

 smoothing
 confidence filtering
 low light 안내 UI
3. 기준 안무 품질

문제:

잘못 만든 reference JSON은 전체 score 품질 저하

대응:

 validation 강화
 관리자 preview 추가
4. SSE 연결 안정성

문제:

모바일 background 상태

대응:

 reconnect
 heartbeat
 session recovery

📦 앞으로 추가될 가능성이 높은 기술
 Redis queue
 Celery background worker
 WebRTC
 GPU inference server
 ONNX pose model
 TensorRT
 Unity animation pipeline
 
🧪 추천 테스트 순서
로컬 테스트
mock=false
→ practice
→ report
→ replay
→ avatar
실제 기준 안무 테스트
mp4
→ reference json 생성
→ dance_reference 등록
→ 실제 춤 따라하기
→ score 확인
모바일 테스트
 iPhone Safari
 Android Chrome
 camera permission
 background recovery


🎯 최종 목표
K-pop 안무 기준 데이터 생성
→ 사용자가 따라 춤
→ 실시간 AI 피드백
→ 점수 분석
→ replay
→ avatar performance
→ Unity export


📌 추천 다음 작업

가장 추천되는 다음 우선순위:

1️⃣ Reference JSON 품질 향상
2️⃣ DTW timing alignment
3️⃣ replay overlay 고도화
4️⃣ Unity avatar motion export
5️⃣ ranking/challenge 시스템

🚀 장기 목표
"AI 기반 K-pop 퍼포먼스 트레이닝 플랫폼"
실시간 자세 교정
안무 학습
리플레이 분석
AI 코치
아바타 퍼포먼스
SNS 공유
랭킹 경쟁
Creator dance pack marketplace