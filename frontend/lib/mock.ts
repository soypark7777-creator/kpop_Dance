/**
 * lib/mock.ts
 * ─────────────────────────────────────────────────────────────────
 * Mock 데이터 — 백엔드 연결 전 프런트엔드 개발용
 * api.ts에서 MOCK_MODE=true 일 때 이 데이터를 반환함
 *
 * 백엔드 연결 시: api.ts의 MOCK_MODE를 false로 변경하면 됨
 * ─────────────────────────────────────────────────────────────────
 */

import type {
  User,
  DanceReference,
  PracticeSession,
  AnalysisReport,
  SessionFrame,
  AvatarItem,
  AvatarRender,
  LiveFrameData,
  PoseData,
  JointErrors,
  SectionScore,
  StartSessionResponse,
  EndSessionResponse,
} from './types'

// ═══════════════════════════════════════════════════════
// 1. USER
// ═══════════════════════════════════════════════════════

export const MOCK_USER: User = {
  id: 1,
  email: 'soypark777@gmail.com',
  nickname: 'SoyDancer',
  avatar_id: 'avatar_001',
  points: 2480,
  is_admin: false,
  status: 'active',
  rank: 'dancer',
  streak_days: 7,
  created_at: '2024-11-01T00:00:00Z',
}

// ═══════════════════════════════════════════════════════
// 2. DANCE REFERENCES (안무 목록)
// ═══════════════════════════════════════════════════════

export const MOCK_DANCE_REFERENCES: DanceReference[] = [
  {
    id: 1,
    title: 'Pink Venom',
    artist_name: 'BLACKPINK',
    difficulty: 'hard',
    duration_seconds: 187,
    thumbnail_url: '/mock/thumbs/pink-venom.jpg',
    preview_video_url: '/mock/videos/pink-venom-preview.mp4',
    reference_json_path: '/storage/dance_reference/pink-venom.json',
    created_at: '2024-10-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Hype Boy',
    artist_name: 'NewJeans',
    difficulty: 'normal',
    duration_seconds: 185,
    thumbnail_url: '/mock/thumbs/hype-boy.jpg',
    preview_video_url: '/mock/videos/hype-boy-preview.mp4',
    reference_json_path: '/storage/dance_reference/hype-boy.json',
    created_at: '2024-10-05T00:00:00Z',
  },
  {
    id: 3,
    title: 'Spicy',
    artist_name: 'aespa',
    difficulty: 'expert',
    duration_seconds: 196,
    thumbnail_url: '/mock/thumbs/spicy.jpg',
    preview_video_url: '/mock/videos/spicy-preview.mp4',
    reference_json_path: '/storage/dance_reference/spicy.json',
    created_at: '2024-10-10T00:00:00Z',
  },
  {
    id: 4,
    title: 'I AM',
    artist_name: 'IVE',
    difficulty: 'normal',
    duration_seconds: 212,
    thumbnail_url: '/mock/thumbs/i-am.jpg',
    reference_json_path: '/storage/dance_reference/i-am.json',
    created_at: '2024-10-15T00:00:00Z',
  },
  {
    id: 5,
    title: 'Dynamite',
    artist_name: 'BTS',
    difficulty: 'easy',
    duration_seconds: 199,
    thumbnail_url: '/mock/thumbs/dynamite.jpg',
    reference_json_path: '/storage/dance_reference/dynamite.json',
    created_at: '2024-10-20T00:00:00Z',
  },
]

// ═══════════════════════════════════════════════════════
// 3. PRACTICE SESSIONS (최근 연습 기록)
// ═══════════════════════════════════════════════════════

export const MOCK_RECENT_SESSIONS: PracticeSession[] = [
  {
    id: 101,
    user_id: 1,
    dance_reference_id: 1,
    dance_reference: MOCK_DANCE_REFERENCES[0],
    started_at: '2025-04-15T10:00:00Z',
    ended_at: '2025-04-15T10:04:00Z',
    total_score: 85,
    lowest_section_score: 71,
    unlock_avatar_render: true,
    session_status: 'completed',
    created_at: '2025-04-15T10:00:00Z',
  },
  {
    id: 100,
    user_id: 1,
    dance_reference_id: 2,
    dance_reference: MOCK_DANCE_REFERENCES[1],
    started_at: '2025-04-14T11:30:00Z',
    ended_at: '2025-04-14T11:33:30Z',
    total_score: 72,
    lowest_section_score: 58,
    unlock_avatar_render: false,
    session_status: 'completed',
    created_at: '2025-04-14T11:30:00Z',
  },
  {
    id: 99,
    user_id: 1,
    dance_reference_id: 3,
    dance_reference: MOCK_DANCE_REFERENCES[2],
    started_at: '2025-04-13T09:00:00Z',
    ended_at: '2025-04-13T09:05:00Z',
    total_score: 91,
    lowest_section_score: 82,
    unlock_avatar_render: true,
    session_status: 'completed',
    created_at: '2025-04-13T09:00:00Z',
  },
]

// ═══════════════════════════════════════════════════════
// 4. SESSION START RESPONSE
// ═══════════════════════════════════════════════════════

export function createMockStartSessionResponse(
  danceReferenceId: number
): StartSessionResponse {
  const dance = MOCK_DANCE_REFERENCES.find((d) => d.id === danceReferenceId)
    ?? MOCK_DANCE_REFERENCES[0]

  return {
    session_id: `mock_session_${Date.now()}`,
    dance_reference: dance,
    ws_url: 'ws://localhost:5000/ws/live',  // mock에서는 사용 안 함
    started_at: new Date().toISOString(),
  }
}

// ═══════════════════════════════════════════════════════
// 5. ANALYSIS REPORT (오답 노트)
// ═══════════════════════════════════════════════════════

const MOCK_SECTION_SCORES: SectionScore[] = [
  { section_index: 0, section_name: '인트로',   start_time: 0,   end_time: 20,  score: 88 },
  { section_index: 1, section_name: '1절',      start_time: 20,  end_time: 60,  score: 82 },
  { section_index: 2, section_name: '후렴 1',   start_time: 60,  end_time: 95,  score: 91 },
  { section_index: 3, section_name: '2절',      start_time: 95,  end_time: 135, score: 71 },  // weakest
  { section_index: 4, section_name: '후렴 2',   start_time: 135, end_time: 170, score: 85 },
  { section_index: 5, section_name: '아웃트로', start_time: 170, end_time: 187, score: 89 },
]

export const MOCK_ANALYSIS_REPORT: AnalysisReport = {
  id: 1,
  session_id: 'mock_session_101',
  total_score: 85,
  weakest_section: MOCK_SECTION_SCORES[3],  // 2절이 가장 약함
  most_wrong_joints: ['left_elbow', 'right_knee', 'left_wrist'],
  average_angle_error: 12.4,
  section_scores: MOCK_SECTION_SCORES,
  report_json: {
    coach_comment:
      '전반적으로 상당히 좋은 퍼포먼스예요! 특히 후렴 구간 동작이 인상적이었어요. ' +
      '2절에서 왼쪽 팔꿈치 각도가 기준보다 낮아지는 경향이 있어요. 집중적으로 연습해봐요!',
    improvement_tips: [
      '왼팔 팔꿈치를 어깨 높이까지 올려보세요',
      '오른쪽 무릎 굽힘 각도를 조금 더 깊게 유지하세요',
      '2절 도입부 8박자 동작을 느린 버전으로 반복 연습해봐요',
    ],
    best_section: MOCK_SECTION_SCORES[2],  // 후렴 1이 가장 좋음
  },
  created_at: '2025-04-15T10:04:30Z',
}

// ═══════════════════════════════════════════════════════
// 6. SESSION FRAMES (리플레이용)
// ═══════════════════════════════════════════════════════

/** T자 기본 포즈 좌표 (정규화, 사람이 화면 중앙에 서 있는 형태) */
function makeBasePose(): PoseData {
  return {
    nose:            { x: 0.50, y: 0.12, visibility: 0.99 },
    left_shoulder:   { x: 0.38, y: 0.28, visibility: 0.99 },
    right_shoulder:  { x: 0.62, y: 0.28, visibility: 0.99 },
    left_elbow:      { x: 0.28, y: 0.42, visibility: 0.95 },
    right_elbow:     { x: 0.72, y: 0.42, visibility: 0.95 },
    left_wrist:      { x: 0.20, y: 0.55, visibility: 0.90 },
    right_wrist:     { x: 0.80, y: 0.55, visibility: 0.90 },
    left_hip:        { x: 0.41, y: 0.54, visibility: 0.99 },
    right_hip:       { x: 0.59, y: 0.54, visibility: 0.99 },
    left_knee:       { x: 0.39, y: 0.72, visibility: 0.97 },
    right_knee:      { x: 0.61, y: 0.72, visibility: 0.97 },
    left_ankle:      { x: 0.38, y: 0.90, visibility: 0.95 },
    right_ankle:     { x: 0.62, y: 0.90, visibility: 0.95 },
  }
}

/** 프레임 인덱스 기반으로 약간 움직임이 있는 포즈 생성 */
function makeAnimatedPose(frameIndex: number, isUser: boolean): PoseData {
  const base = makeBasePose()
  const t = (frameIndex / 30) * Math.PI  // 약 3초 주기
  const noise = isUser ? 0.03 : 0         // 사용자 포즈에만 노이즈

  // 팔 동작 시뮬레이션
  const armOffset = Math.sin(t) * 0.08
  const kneeOffset = Math.abs(Math.sin(t * 0.5)) * 0.05
  const randomNoise = () => (Math.random() - 0.5) * noise

  return {
    ...base,
    left_elbow:  { ...base.left_elbow!,  y: (base.left_elbow!.y  - armOffset)   + randomNoise() },
    right_elbow: { ...base.right_elbow!, y: (base.right_elbow!.y + armOffset)   + randomNoise() },
    left_wrist:  { ...base.left_wrist!,  y: (base.left_wrist!.y  - armOffset * 1.3) + randomNoise() },
    right_wrist: { ...base.right_wrist!, y: (base.right_wrist!.y + armOffset * 1.3) + randomNoise() },
    left_knee:   { ...base.left_knee!,   y: (base.left_knee!.y   + kneeOffset)  + randomNoise() },
    right_knee:  { ...base.right_knee!,  y: (base.right_knee!.y  - kneeOffset)  + randomNoise() },
  }
}

/** 30프레임의 mock 리플레이 데이터 생성 */
export function createMockSessionFrames(sessionId: string): SessionFrame[] {
  return Array.from({ length: 90 }, (_, i) => ({
    id: i + 1,
    session_id: sessionId,
    frame_index: i,
    timestamp_seconds: i / 15,  // 15fps
    pose_json: makeAnimatedPose(i, true),
    score: 70 + Math.sin(i / 10) * 20 + Math.random() * 5,
  }))
}

// ═══════════════════════════════════════════════════════
// 7. AVATAR ITEMS (아바타 / 무대 / 의상)
// ═══════════════════════════════════════════════════════

export const MOCK_AVATAR_ITEMS: AvatarItem[] = [
  // 아바타
  {
    id: 'avatar_001',
    name: '기본 댄서',
    type: 'avatar',
    rarity: 'common',
    thumbnail_url: '/mock/avatars/avatar-001.png',
    description: '기본 제공 아바타',
    is_locked: false,
  },
  {
    id: 'avatar_002',
    name: '네온 걸',
    type: 'avatar',
    rarity: 'rare',
    thumbnail_url: '/mock/avatars/avatar-002.png',
    description: '네온 감성의 세련된 댄서',
    is_locked: false,
    required_score: 80,
  },
  {
    id: 'avatar_003',
    name: '홀로그램 퀸',
    type: 'avatar',
    rarity: 'epic',
    thumbnail_url: '/mock/avatars/avatar-003.png',
    description: '미래에서 온 홀로그램 댄서',
    is_locked: true,
    required_points: 1000,
  },
  {
    id: 'avatar_004',
    name: '레전드 아이돌',
    type: 'avatar',
    rarity: 'legendary',
    thumbnail_url: '/mock/avatars/avatar-004.png',
    description: '전설의 아이돌 아바타',
    is_locked: true,
    required_score: 95,
  },

  // 무대
  {
    id: 'stage_001',
    name: '연습실',
    type: 'stage',
    rarity: 'common',
    thumbnail_url: '/mock/stages/stage-001.png',
    description: '기본 연습실 무대',
    is_locked: false,
  },
  {
    id: 'stage_002',
    name: '네온 스테이지',
    type: 'stage',
    rarity: 'rare',
    thumbnail_url: '/mock/stages/stage-002.png',
    description: '화려한 네온 조명의 무대',
    is_locked: false,
    required_score: 75,
  },
  {
    id: 'stage_003',
    name: '우주 스테이지',
    type: 'stage',
    rarity: 'epic',
    thumbnail_url: '/mock/stages/stage-003.png',
    description: '우주를 배경으로 한 환상적인 무대',
    is_locked: true,
    required_points: 800,
  },
  {
    id: 'stage_004',
    name: '월드 투어',
    type: 'stage',
    rarity: 'legendary',
    thumbnail_url: '/mock/stages/stage-004.png',
    description: '수만 명 앞의 월드 투어 무대',
    is_locked: true,
    required_score: 90,
  },

  // 의상
  {
    id: 'costume_001',
    name: '트레이닝 룩',
    type: 'costume',
    rarity: 'common',
    thumbnail_url: '/mock/costumes/costume-001.png',
    description: '편안한 트레이닝 의상',
    is_locked: false,
  },
  {
    id: 'costume_002',
    name: '스타일리시 블랙',
    type: 'costume',
    rarity: 'rare',
    thumbnail_url: '/mock/costumes/costume-002.png',
    description: 'K-pop 스타일 블랙 의상',
    is_locked: false,
    required_score: 80,
  },
  {
    id: 'costume_003',
    name: '크리스탈 드레스',
    type: 'costume',
    rarity: 'epic',
    thumbnail_url: '/mock/costumes/costume-003.png',
    description: '크리스탈로 장식된 화려한 의상',
    is_locked: true,
    required_points: 600,
  },
  {
    id: 'costume_004',
    name: '골드 에디션',
    type: 'costume',
    rarity: 'legendary',
    thumbnail_url: '/mock/costumes/costume-004.png',
    description: '황금빛 레전드 의상',
    is_locked: true,
    required_score: 95,
  },
]

// ═══════════════════════════════════════════════════════
// 8. AVATAR RENDER
// ═══════════════════════════════════════════════════════

export const MOCK_AVATAR_RENDER: AvatarRender = {
  id: 1,
  user_id: 1,
  session_id: 101,
  avatar_id: 'avatar_002',
  stage_theme_id: 'stage_002',
  costume_id: 'costume_002',
  render_status: 'completed',
  output_url: '/mock/renders/render-001.mp4',
  requested_at: '2025-04-15T10:05:00Z',
  completed_at: '2025-04-15T10:05:30Z',
  created_at: '2025-04-15T10:05:00Z',
}

// ═══════════════════════════════════════════════════════
// 9. LIVE FRAME DATA GENERATOR (WebSocket mock용)
// ═══════════════════════════════════════════════════════

let _mockFrameCounter = 0

/**
 * WebSocket mock에서 setInterval로 호출되는 프레임 생성기
 * 현실적인 점수 변동과 관절 오류를 시뮬레이션함
 */
export function generateMockLiveFrame(sessionId: string): LiveFrameData {
  _mockFrameCounter++
  const t = _mockFrameCounter

  // 점수: 사인파 기반으로 65~95 사이를 부드럽게 변동
  const baseScore = 80
  const scoreDelta = Math.sin(t / 20) * 15 + (Math.random() - 0.5) * 5
  const matchScore = Math.max(0, Math.min(100, Math.round(baseScore + scoreDelta)))

  // 관절 오류: 일정 주기로 wrong/correct 전환
  const isLeftElbowWrong = Math.sin(t / 8) > 0.4
  const isRightKneeWrong = Math.sin(t / 12 + 1) > 0.5
  const isLeftWristWrong = Math.sin(t / 15 + 2) > 0.6

  const joint_errors: JointErrors = {}

  if (isLeftElbowWrong) {
    joint_errors.left_elbow = {
      joint: 'left_elbow',
      status: 'wrong',
      angle_diff: 18 + Math.random() * 10,
      direction: '올려요',
    }
  }
  if (isRightKneeWrong) {
    joint_errors.right_knee = {
      joint: 'right_knee',
      status: 'wrong',
      angle_diff: 20 + Math.random() * 8,
      direction: '더 굽혀요',
    }
  }
  if (isLeftWristWrong) {
    joint_errors.left_wrist = {
      joint: 'left_wrist',
      status: 'wrong',
      angle_diff: 16 + Math.random() * 12,
      direction: '바깥으로',
    }
  }

  // 피드백 메시지
  let feedbackLevel: 'perfect' | 'good' | 'needs_fix'
  let feedbackText: string
  if (matchScore >= 90) {
    feedbackLevel = 'perfect'
    feedbackText = '완벽해요! 🔥'
  } else if (matchScore >= 70) {
    feedbackLevel = 'good'
    feedbackText = '좋아요! 계속해요'
  } else if (isLeftElbowWrong) {
    feedbackLevel = 'needs_fix'
    feedbackText = '왼팔 팔꿈치를 올려요'
  } else if (isRightKneeWrong) {
    feedbackLevel = 'needs_fix'
    feedbackText = '오른 무릎을 더 굽혀요'
  } else {
    feedbackLevel = 'needs_fix'
    feedbackText = '동작을 맞춰보세요'
  }

  // 포즈 데이터
  const userPose = makeAnimatedPose(t, true)
  const referencePose = makeAnimatedPose(t, false)  // 노이즈 없는 기준 포즈

  return {
    session_id: sessionId,
    timestamp: Date.now(),
    user_pose: userPose,
    reference_pose: referencePose,
    joint_errors,
    feedback: {
      level: feedbackLevel,
      text: feedbackText,
      timestamp: Date.now(),
    },
    match_score: matchScore,
    is_recording: true,
    section_index: Math.floor(t / 50) % 6,
  }
}

/** mock 프레임 카운터 리셋 (세션 시작 시 호출) */
export function resetMockFrameCounter(): void {
  _mockFrameCounter = 0
}

// ═══════════════════════════════════════════════════════
// 10. END SESSION RESPONSE
// ═══════════════════════════════════════════════════════

export function createMockEndSessionResponse(
  sessionId: string,
  danceReferenceId: number
): EndSessionResponse {
  const dance = MOCK_DANCE_REFERENCES.find((d) => d.id === danceReferenceId)
    ?? MOCK_DANCE_REFERENCES[0]

  const report: AnalysisReport = {
    ...MOCK_ANALYSIS_REPORT,
    session_id: sessionId,
    created_at: new Date().toISOString(),
  }

  const session: PracticeSession = {
    id: Date.now(),
    user_id: 1,
    dance_reference_id: danceReferenceId,
    dance_reference: dance,
    started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    ended_at: new Date().toISOString(),
    total_score: report.total_score,
    lowest_section_score: Math.min(...report.section_scores.map((s) => s.score)),
    unlock_avatar_render: report.total_score >= 80,
    session_status: 'completed',
    created_at: new Date().toISOString(),
  }

  return {
    session,
    report,
    unlock_avatar_render: session.unlock_avatar_render,
  }
}
