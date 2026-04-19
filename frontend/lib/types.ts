/**
 * lib/types.ts
 * ─────────────────────────────────────────────────────────────────
 * My Avatar Dance Master — 전체 시스템 공통 타입 정의
 *
 * 주의사항:
 * - JointName은 백엔드(MediaPipe), Unity, 프런트 모두 동일해야 함
 * - 절대 임의로 변경 금지
 * - 실시간용(LiveFrameData)과 리플레이용(SessionFrame) 포맷을 분리함
 * ─────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════
// 1. JOINT NAMING (백엔드 / Unity / 프런트 공통)
// ═══════════════════════════════════════════════════════

export const JOINT_NAMES = [
  'nose',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
] as const

export type JointName = (typeof JOINT_NAMES)[number]

/**
 * 스켈레톤 렌더링 시 연결할 관절 쌍
 * drawSkeleton.ts에서 사용
 */
export const SKELETON_CONNECTIONS: [JointName, JointName][] = [
  // 상체 — 어깨
  ['left_shoulder', 'right_shoulder'],
  // 목/얼굴
  ['nose', 'left_shoulder'],
  ['nose', 'right_shoulder'],
  // 왼팔
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  // 오른팔
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  // 몸통
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  // 왼다리
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  // 오른다리
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
]

// ═══════════════════════════════════════════════════════
// 2. POSE DATA (관절 좌표)
// ═══════════════════════════════════════════════════════

/** 단일 관절의 정규화된 2D/3D 좌표 (0.0 ~ 1.0) */
export interface JointPoint {
  x: number           // 정규화된 x (0: 왼쪽, 1: 오른쪽)
  y: number           // 정규화된 y (0: 위, 1: 아래)
  z?: number          // 깊이 (선택적)
  visibility?: number // 0.0~1.0, MediaPipe visibility 값
}

/** Unity export용 — 위치 + 회전(optional) */
export interface JointPointExtended extends JointPoint {
  rotation?: {
    x: number
    y: number
    z: number
    w?: number  // quaternion w component
  }
  angle?: number  // 해당 관절의 각도(도)
}

/** 전체 포즈 데이터 — 관절명 → 좌표 매핑 */
export type PoseData = Partial<Record<JointName, JointPoint>>

/** Unity export용 확장 포즈 */
export type PoseDataExtended = Partial<Record<JointName, JointPointExtended>>

// ═══════════════════════════════════════════════════════
// 3. JOINT ERROR (관절 오류 판정)
// ═══════════════════════════════════════════════════════

export type JointStatus = 'correct' | 'wrong' | 'missing'

export interface JointError {
  joint: JointName
  status: JointStatus
  angle_diff?: number   // 기준 포즈와의 각도 차이(도) — 15도 이상이면 wrong
  direction?: string    // "올려요" | "내려요" | "왼쪽으로" — UI 피드백용
}

/** 전체 관절 오류 맵 */
export type JointErrors = Partial<Record<JointName, JointError>>

// ═══════════════════════════════════════════════════════
// 4. FEEDBACK MESSAGE (실시간 피드백)
// ═══════════════════════════════════════════════════════

export type FeedbackLevel = 'perfect' | 'good' | 'needs_fix'

export interface FeedbackMessage {
  level: FeedbackLevel
  text: string           // "완벽해요!" | "좋아요!" | "왼팔을 올려요"
  target_joint?: JointName  // 문제가 된 관절 (선택적)
  timestamp: number      // unix ms
}

// ═══════════════════════════════════════════════════════
// 5. REALTIME DATA — WebSocket 실시간 프레임 (lightweight)
// ═══════════════════════════════════════════════════════

/**
 * WebSocket으로 매 프레임 수신하는 실시간 데이터
 * 가볍게 유지할 것 — 렌더링 성능에 영향
 */
export interface LiveFrameData {
  session_id: string
  timestamp: number         // unix ms
  user_pose: PoseData       // 사용자의 현재 포즈
  reference_pose: PoseData  // 기준 안무 포즈 (같은 프레임)
  joint_errors: JointErrors // 관절별 오류 판정 결과
  feedback: FeedbackMessage // 이번 프레임 피드백
  match_score: number       // 0~100, DTW 기반 유사도 점수
  is_recording: boolean     // 현재 녹화(분석) 중인지
  section_index?: number    // 현재 구간 인덱스
}

// ═══════════════════════════════════════════════════════
// 6. SESSION FRAME — 리플레이 / Unity export용 (extended)
// ═══════════════════════════════════════════════════════

/**
 * 세션 종료 후 리플레이 또는 Unity export에 사용하는 프레임
 * DB의 session_frames 테이블과 1:1 대응
 */
export interface SessionFrame {
  id: number
  session_id: string
  frame_index: number
  timestamp_seconds: number
  pose_json: PoseDataExtended  // 사용자 포즈 (위치 + optional 회전)
  score: number                // 해당 프레임의 점수
}

// ═══════════════════════════════════════════════════════
// 7. SECTION SCORE (구간 점수)
// ═══════════════════════════════════════════════════════

export interface SectionScore {
  section_index: number
  section_name: string    // "인트로" | "1절" | "후렴" | "브릿지" ...
  start_time: number      // 초
  end_time: number        // 초
  score: number           // 0~100
}

// ═══════════════════════════════════════════════════════
// 8. ANALYSIS REPORT (오답 노트 리포트)
// ═══════════════════════════════════════════════════════

export interface ReportJson {
  coach_comment: string       // "전반적으로 팔 동작이 약해요"
  improvement_tips: string[]  // ["왼팔을 더 높이 올리세요", ...]
  best_section: SectionScore  // 가장 잘한 구간
  motion_similarity?: number
  average_score?: number
  scoring_profile_name?: string
  scoring_profile_description?: string
}

/** DB의 analysis_reports 테이블과 1:1 대응 */
export interface AnalysisReport {
  id: number
  session_id: string
  total_score: number
  weakest_section: SectionScore
  most_wrong_joints: JointName[]  // 틀린 횟수 top3 관절
  average_angle_error: number     // 평균 각도 오차(도)
  motion_similarity?: number
  section_scores: SectionScore[]
  report_json: ReportJson
  created_at: string
}

// ═══════════════════════════════════════════════════════
// 9. DANCE REFERENCE (안무 목록)
// ═══════════════════════════════════════════════════════

export type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'expert'

/** DB의 dance_references 테이블과 1:1 대응 */
export interface DanceReference {
  id: number
  title: string
  artist_name: string
  difficulty: DifficultyLevel
  duration_seconds: number
  thumbnail_url: string
  preview_video_url?: string
  reference_json_path: string  // 백엔드 기준 안무 JSON 경로
  created_at: string
}

// ═══════════════════════════════════════════════════════
// 10. USER (사용자 프로필)
// ═══════════════════════════════════════════════════════

export type UserRank = 'rookie' | 'dancer' | 'performer' | 'star' | 'legend'
export type UserStatus = 'active' | 'inactive' | 'suspended'

/** DB의 users 테이블과 1:1 대응 */
export interface User {
  id: number
  email: string
  nickname: string
  avatar_id: string
  points: number
  is_admin?: boolean
  status: UserStatus
  rank: UserRank
  streak_days: number   // 연속 연습 일수 (DB 외 계산값)
  created_at: string
}

// ═══════════════════════════════════════════════════════
// 11. PRACTICE SESSION (연습 세션)
// ═══════════════════════════════════════════════════════

export type SessionStatus = 'in_progress' | 'completed' | 'aborted'

/** DB의 practice_sessions 테이블과 1:1 대응 */
export interface PracticeSession {
  id: number
  user_id: number
  dance_reference_id: number
  dance_reference?: DanceReference  // join 결과
  started_at: string
  ended_at?: string
  total_score?: number
  lowest_section_score?: number
  unlock_avatar_render: boolean  // total_score >= 80이면 true
  session_status: SessionStatus
  motion_similarity?: number
  average_angle_error?: number
  unstable_joint_count?: number
  most_wrong_joints?: JointName[]
  created_at: string
}

// ═══════════════════════════════════════════════════════
// 12. AVATAR (아바타 / 무대 / 의상)
// ═══════════════════════════════════════════════════════

export type RenderStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type AvatarItemType = 'avatar' | 'stage' | 'costume'

/** UI에서 선택 가능한 아이템 카드 */
export interface AvatarItem {
  id: string
  name: string
  type: AvatarItemType
  rarity: ItemRarity
  thumbnail_url: string
  description?: string
  is_locked: boolean
  required_score?: number   // 이 점수 이상이어야 unlock
  required_points?: number  // 포인트 구매 필요
  preview_url?: string
}

/** 아바타 퍼포먼스 생성 선택 상태 */
export interface AvatarSelections {
  avatar_id: string | null
  stage_theme_id: string | null
  costume_id: string | null
}

/** DB의 avatar_renders 테이블과 1:1 대응 */
export interface AvatarRender {
  id: number
  user_id: number
  session_id: number
  avatar_id: string
  stage_theme_id: string
  costume_id: string
  render_status: RenderStatus
  output_url?: string
  requested_at: string
  completed_at?: string
  created_at: string
}

export type VideoUploadStatus =
  | 'uploaded'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'extraction_unavailable'

export interface VideoUploadFramePreview {
  frame_index: number
  timestamp_seconds: number
  file_name: string
  file_url: string
}

export interface VideoUploadJob {
  id: string
  user_id: number
  dance_reference_id?: number | null
  session_id?: string | null
  original_filename: string
  stored_filename: string
  source_video_url: string
  preview_frames: VideoUploadFramePreview[]
  status: VideoUploadStatus
  frame_extraction_available: boolean
  source_frame_count: number
  source_fps: number
  source_duration_seconds?: number | null
  extracted_frame_count: number
  notes?: string | null
  message?: string | null
  analysis_ready?: boolean
  analysis_source?: string | null
  analysis_session_id?: string | null
  report_url?: string | null
  analysis_report?: AnalysisReport | null
  created_at: string
  updated_at: string
}

// ═══════════════════════════════════════════════════════
// 13. API RESPONSE WRAPPERS
// ═══════════════════════════════════════════════════════

export interface ApiResponse<T> {
  success: true
  data: T
  message?: string
}

export interface ApiError {
  success: false
  error: string
  code?: string
  status?: number
}

export type ApiResult<T> = ApiResponse<T> | ApiError

// 세션 시작 API 요청/응답
export interface StartSessionRequest {
  dance_reference_id: number
  user_id?: number  // 인증 구현 전 optional
}

export interface StartSessionResponse {
  session_id: string
  dance_reference: DanceReference
  ws_url: string    // WebSocket 연결 URL
  started_at: string
}

// 세션 종료 API 요청/응답
export interface EndSessionRequest {
  session_id: string
}

export interface EndSessionResponse {
  session: PracticeSession
  report: AnalysisReport
  unlock_avatar_render: boolean
}

// 아바타 렌더 요청
export interface RequestAvatarRenderRequest {
  session_id: string | number
  avatar_id: string
  stage_theme_id: string
  costume_id: string
}

export interface AuthLoginRequest {
  email: string
  password: string
}

export interface AuthLoginResponse {
  access_token: string
  token_type: 'Bearer'
  user: User
}

export interface AuthRegisterRequest {
  email: string
  password: string
  password_confirm?: string
  nickname: string
  avatar_id?: string
}

export type AuthRegisterResponse = AuthLoginResponse

export interface AdminDashboardCounts {
  users: number
  admins: number
  sessions: number
  completed_sessions: number
  reports: number
  renders: number
  rewards: number
  dance_references: number
}

export interface AdminDashboard {
  counts: AdminDashboardCounts
  recent_sessions: PracticeSession[]
  top_dances: Array<{
    id: number
    title: string
    session_count: number
  }>
}

export interface AdminSession {
  id: number
  user_id: number
  dance_reference_id: number
  started_at: string
  ended_at?: string
  total_score?: number
  lowest_section_score?: number
  unlock_avatar_render: boolean
  session_status: SessionStatus | 'active' | 'completed' | 'abandoned'
  motion_similarity?: number
  average_angle_error?: number
  unstable_joint_count?: number
  most_wrong_joints?: JointName[]
  created_at: string
}

export interface AdminSessionUpdateRequest {
  session_status?: 'active' | 'completed' | 'abandoned'
  started_at?: string
  ended_at?: string
  total_score?: number
  lowest_section_score?: number
  unlock_avatar_render?: boolean
}

export interface AdminRender {
  id: number
  user_id: number
  session_id: number
  avatar_id: string
  stage_theme_id: string
  costume_id: string
  render_status: RenderStatus
  output_url?: string
  requested_at: string
  completed_at?: string
  created_at: string
}

export interface AdminReward {
  id: number
  item_type: AvatarItemType | 'effect'
  item_name: string
  price_points: number
  is_premium: boolean
  metadata_json: Record<string, unknown>
  created_at: string | null
}

export interface AdminUploadJob {
  id: string
  user_id: number
  dance_reference_id?: number | null
  session_id?: string | null
  original_filename: string
  stored_filename: string
  source_video_url: string
  preview_frames: VideoUploadFramePreview[]
  status: VideoUploadStatus
  frame_extraction_available: boolean
  source_frame_count: number
  source_fps: number
  source_duration_seconds?: number | null
  extracted_frame_count: number
  notes?: string | null
  message?: string | null
  analysis_ready?: boolean
  analysis_source?: string | null
  analysis_session_id?: string | null
  report_url?: string | null
  analysis_report?: AnalysisReport | null
  analysis_session?: PracticeSession | null
  frame_count?: number
  created_at: string
  updated_at: string
}

// ═══════════════════════════════════════════════════════
// 14. WEBSOCKET MESSAGE TYPES
// ═══════════════════════════════════════════════════════

export type WsMessageType =
  | 'frame_data'       // 매 프레임 분석 결과
  | 'session_started'  // 세션 시작 확인
  | 'session_ended'    // 세션 종료 확인
  | 'error'            // 서버 오류
  | 'ping'             // 연결 유지

export interface WsBaseMessage {
  type: WsMessageType
  timestamp: number
}

export interface WsFrameMessage extends WsBaseMessage {
  type: 'frame_data'
  payload: LiveFrameData
}

export interface WsSessionStartedMessage extends WsBaseMessage {
  type: 'session_started'
  payload: { session_id: string }
}

export interface WsSessionEndedMessage extends WsBaseMessage {
  type: 'session_ended'
  payload: EndSessionResponse
}

export interface WsErrorMessage extends WsBaseMessage {
  type: 'error'
  payload: { message: string; code?: string }
}

export type WsMessage =
  | WsFrameMessage
  | WsSessionStartedMessage
  | WsSessionEndedMessage
  | WsErrorMessage

// ═══════════════════════════════════════════════════════
// 15. STORE STATE TYPES (Zustand 스토어용)
// ═══════════════════════════════════════════════════════

/** practice 페이지의 연습 상태 */
export type PracticeStatus =
  | 'idle'        // 초기 상태
  | 'selecting'   // 안무 선택 중
  | 'ready'       // 카메라 준비 완료
  | 'countdown'   // 카운트다운 중
  | 'recording'   // 분석 중 (정상 연습)
  | 'paused'      // 일시정지
  | 'ended'       // 연습 종료

/** replay 페이지의 재생 상태 */
export type ReplayStatus = 'idle' | 'playing' | 'paused' | 'ended'

/** WebSocket 연결 상태 */
export type WsConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// ═══════════════════════════════════════════════════════
// 16. UI HELPER TYPES
// ═══════════════════════════════════════════════════════

/** 점수 → 등급 변환 */
export type ScoreGrade = 'perfect' | 'great' | 'good' | 'needs_work'

export function getScoreGrade(score: number): ScoreGrade {
  if (score >= 90) return 'perfect'
  if (score >= 75) return 'great'
  if (score >= 60) return 'good'
  return 'needs_work'
}

export function getScoreLabel(score: number): string {
  const grade = getScoreGrade(score)
  const labels: Record<ScoreGrade, string> = {
    perfect:    'PERFECT',
    great:      'GREAT',
    good:       'GOOD',
    needs_work: 'KEEP GOING',
  }
  return labels[grade]
}

export function getScoreColor(score: number): string {
  const grade = getScoreGrade(score)
  const colors: Record<ScoreGrade, string> = {
    perfect:    '#ffd700',
    great:      '#b041ff',
    good:       '#00e5ff',
    needs_work: '#ff3b3b',
  }
  return colors[grade]
}

/** 난이도 → 한국어 */
export const DIFFICULTY_LABEL: Record<DifficultyLevel, string> = {
  easy:   '쉬움',
  normal: '보통',
  hard:   '어려움',
  expert: '전문가',
}

export const DIFFICULTY_COLOR: Record<DifficultyLevel, string> = {
  easy:   '#22c55e',
  normal: '#3b82f6',
  hard:   '#f59e0b',
  expert: '#ef4444',
}

/** 랭크 → 한국어 */
export const RANK_LABEL: Record<UserRank, string> = {
  rookie:    'Rookie',
  dancer:    'Dancer',
  performer: 'Performer',
  star:      'Star',
  legend:    'Legend',
}

export const RANK_COLOR: Record<UserRank, string> = {
  rookie:    '#9ca3af',
  dancer:    '#3b82f6',
  performer: '#a855f7',
  star:      '#f59e0b',
  legend:    '#ff2d78',
}

/** 희귀도 색상 */
export const RARITY_COLOR: Record<ItemRarity, string> = {
  common:    '#9ca3af',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#f59e0b',
}

export const RARITY_LABEL: Record<ItemRarity, string> = {
  common:    'Common',
  rare:      'Rare',
  epic:      'Epic',
  legendary: 'Legendary',
}
