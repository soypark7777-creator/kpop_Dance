# 점수 가중치 초보자 가이드

이 문서는 점수 계산에서 쓰는 숫자를 어디서 바꾸는지 아주 짧게 설명합니다.

## 왜 이게 필요한가

점수 계산식이 코드 안에 완전히 박혀 있으면 나중에 조정하기 어렵습니다.
그래서 자주 바꿀 수 있는 숫자는 설정값으로 빼두었습니다.

## 어디를 보면 되는가

### 1. 환경변수 파일

- [backend/.env.example](C:/PROJECT/Kpop_Dance/backend/.env.example)
- 여기서 `SCORING_*`로 시작하는 값들을 볼 수 있습니다.
- 실제 배포나 로컬 실행에서는 `.env` 파일에 같은 이름으로 넣습니다.

### 2. 설정 읽기 코드

- [backend/app/services/scoring_settings.py](C:/PROJECT/Kpop_Dance/backend/app/services/scoring_settings.py)
- 이 파일이 환경변수를 읽어서 기본값과 합쳐 줍니다.

### 3. 점수 계산 코드

- [backend/app/services/analysis_service.py](C:/PROJECT/Kpop_Dance/backend/app/services/analysis_service.py)
- 실제 점수 공식은 이 파일에서 설정값을 사용합니다.

## 어떤 값을 바꾸면 되는가

- `SCORING_AVERAGE_SCORE_WEIGHT`
  - 프레임 평균 점수가 최종 점수에 얼마나 반영되는지 정합니다.
- `SCORING_MOTION_SIMILARITY_WEIGHT`
  - DTW 기반 동작 유사도가 얼마나 반영되는지 정합니다.
- `SCORING_BALANCE_WEIGHT`
  - 점수가 너무 한쪽으로 치우치지 않도록 하는 보정 비중입니다.
- `SCORING_SECTION_STABILITY_TARGET`
  - 구간 점수 계산에서 기준이 되는 유사도 값입니다.
- `SCORING_SECTION_WEAK_PENALTY`
  - 가장 약한 구간에 들어가는 감점 크기입니다.
- `SCORING_ERROR_*`
  - 평균 오차 계산에서 각 요소가 얼마나 크게 반영되는지 정합니다.

## 초보자용 이해

예를 들어:

- `motion_similarity`를 더 중요하게 보고 싶으면 `SCORING_MOTION_SIMILARITY_WEIGHT`를 올립니다.
- 각도 오차를 더 엄격하게 보고 싶으면 `SCORING_ERROR_JOINT_WEIGHT`를 올립니다.
- 약한 구간 점수를 더 낮게 만들고 싶으면 `SCORING_SECTION_WEAK_PENALTY`를 올립니다.

## 주의할 점

- 숫자를 너무 크게 바꾸면 점수가 쉽게 0점이나 100점에 붙을 수 있습니다.
- 한 번에 하나씩만 바꾸고 결과를 보는 것이 좋습니다.
- 설정값을 바꾼 뒤에는 서버를 다시 시작하는 편이 안전합니다.

## 관리자 프리셋

관리자 화면에는 자주 쓰는 필터 조합도 준비되어 있습니다.

- `고점수 후보`
  - 점수가 높은 세션과 오차가 적은 세션을 함께 봅니다.
- `오차 우선`
  - 평균 오차가 낮은 세션을 먼저 찾을 때 씁니다.
- `팔 교정`
  - 팔꿈치 중심으로 흔들린 세션을 찾습니다.
- `무릎 교정`
  - 무릎 중심으로 흔들린 세션을 찾습니다.
- `균형형`
  - 너무 빡빡하지 않은 중간 기준으로 봅니다.

## 한 줄 요약

점수 가중치는 `.env`의 `SCORING_*` 값으로 바꾸고, 실제 계산은 `analysis_service.py`가 담당합니다.
