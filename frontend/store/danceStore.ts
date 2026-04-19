/**
 * store/danceStore.ts
 * ─────────────────────────────────────────────────────────────────
 * My Avatar Dance Master — Zustand 전역 상태 스토어
 *
 * 3개의 slice 개념으로 분리:
 *
 * [A] LiveSessionSlice  — practice 중 실시간 상태
 *     - WebSocket으로 매 프레임 업데이트
 *     - match_score, joint_errors, feedback, pose 데이터
 *
 * [B] ReportSlice       — 세션 종료 후 리포트 + 리플레이
 *     - AnalysisReport, SessionFrame[], replay 컨트롤 상태
 *
 * [C] UserSlice         — 유저 정보 + 선택 상태
 *     - User, 선택된 안무, 아바타 선택 상태
 *
 * 원칙:
 * - 프런트에서 계산 X → 백엔드 결과를 store에 그대로 저장
 * - 페이지는 store에서 읽고, 쓰는 건 hook(useLiveDanceSession 등)을 통해서만
 * ─────────────────────────────────────────────────────────────────
 */

import { create } from 'zustand'
import { subscribeWithSelector, devtools } from 'zustand/middleware'

import type {
  User,
  DanceReference,
  PracticeSession,
  AnalysisReport,
  SessionFrame,
  AvatarSelections,
  LiveFrameData,
  JointErrors,
  FeedbackMessage,
  PoseData,
  PracticeStatus,
  ReplayStatus,
  WsConnectionStatus,
} from '@/lib/types'

// ═══════════════════════════════════════════════════════
// A. LiveSessionSlice — 실시간 연습 상태
// ═══════════════════════════════════════════════════════

interface LiveSessionState {
  // 세션 메타
  sessionId: string | null
  practiceStatus: PracticeStatus
  wsConnectionStatus: WsConnectionStatus
  countdown: number | null          // 카운트다운 남은 초 (3, 2, 1, null)

  // 실시간 분석 데이터 (매 프레임 업데이트)
  matchScore: number                // 0~100
  jointErrors: JointErrors          // 관절별 오류 상태
  feedback: FeedbackMessage | null  // 현재 피드백 메시지
  userPose: PoseData | null         // 사용자 현재 포즈
  referencePose: PoseData | null    // 기준 안무 현재 포즈
  currentSectionIndex: number       // 현재 구간 인덱스
  isRecording: boolean              // 분석 중 여부

  // 설정
  isMirrorMode: boolean     // 좌우 반전 (미러 모드)
  showSkeleton: boolean     // skeleton 표시/숨김
  showGhostGuide: boolean   // ghost guide 표시/숨김
  ghostOpacity: number      // ghost guide 투명도 (0~1)
}

interface LiveSessionActions {
  setSessionId: (id: string | null) => void
  setPracticeStatus: (status: PracticeStatus) => void
  setWsConnectionStatus: (status: WsConnectionStatus) => void
  setCountdown: (count: number | null) => void
  // 실시간 프레임 데이터 한 번에 업데이트
  applyLiveFrame: (frame: LiveFrameData) => void
  // 개별 업데이트 (필요 시)
  setMatchScore: (score: number) => void
  setJointErrors: (errors: JointErrors) => void
  setFeedback: (msg: FeedbackMessage | null) => void
  setUserPose: (pose: PoseData | null) => void
  setReferencePose: (pose: PoseData | null) => void
  // 설정 토글
  toggleMirrorMode: () => void
  toggleSkeleton: () => void
  toggleGhostGuide: () => void
  setGhostOpacity: (opacity: number) => void
  // 세션 초기화
  resetLiveSession: () => void
}

type LiveSessionSlice = LiveSessionState & LiveSessionActions

const liveSessionInitial: LiveSessionState = {
  sessionId:           null,
  practiceStatus:      'idle',
  wsConnectionStatus:  'disconnected',
  countdown:           null,
  matchScore:          0,
  jointErrors:         {},
  feedback:            null,
  userPose:            null,
  referencePose:       null,
  currentSectionIndex: 0,
  isRecording:         false,
  isMirrorMode:        true,   // 기본 미러 모드 ON
  showSkeleton:        true,
  showGhostGuide:      true,
  ghostOpacity:        0.45,
}

// ═══════════════════════════════════════════════════════
// B. ReportSlice — 리포트 + 리플레이 상태
// ═══════════════════════════════════════════════════════

interface ReportState {
  currentReport: AnalysisReport | null
  // 리플레이
  replayFrames: SessionFrame[]
  replayStatus: ReplayStatus
  currentReplayFrameIndex: number
  replaySpeed: number          // 1.0 = 보통, 0.5 = 느리게, 2.0 = 빠르게
  highlightWrongSections: boolean
}

interface ReportActions {
  setCurrentReport: (report: AnalysisReport | null) => void
  setReplayFrames: (frames: SessionFrame[]) => void
  setReplayStatus: (status: ReplayStatus) => void
  setCurrentReplayFrameIndex: (index: number) => void
  setReplaySpeed: (speed: number) => void
  toggleHighlightWrongSections: () => void
  resetReport: () => void
}

type ReportSlice = ReportState & ReportActions

const reportInitial: ReportState = {
  currentReport:            null,
  replayFrames:             [],
  replayStatus:             'idle',
  currentReplayFrameIndex:  0,
  replaySpeed:              1.0,
  highlightWrongSections:   true,
}

// ═══════════════════════════════════════════════════════
// C. UserSlice — 유저 + 선택 상태
// ═══════════════════════════════════════════════════════

interface UserState {
  user: User | null
  selectedDance: DanceReference | null
  lastCompletedSession: PracticeSession | null
  // 아바타 선택
  avatarSelections: AvatarSelections
  // UI 상태
  isLoading: boolean
  globalError: string | null
}

interface UserActions {
  setUser: (user: User | null) => void
  setSelectedDance: (dance: DanceReference | null) => void
  setLastCompletedSession: (session: PracticeSession | null) => void
  setAvatarSelections: (selections: Partial<AvatarSelections>) => void
  resetAvatarSelections: () => void
  setIsLoading: (loading: boolean) => void
  setGlobalError: (error: string | null) => void
}

type UserSlice = UserState & UserActions

const userInitial: UserState = {
  user:                   null,
  selectedDance:          null,
  lastCompletedSession:   null,
  avatarSelections: {
    avatar_id:      null,
    stage_theme_id: null,
    costume_id:     null,
  },
  isLoading:    false,
  globalError:  null,
}

// ═══════════════════════════════════════════════════════
// 통합 Store
// ═══════════════════════════════════════════════════════

type DanceStore = LiveSessionSlice & ReportSlice & UserSlice

export const useDanceStore = create<DanceStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({

      // ─── LiveSessionSlice ────────────────────────────────

      ...liveSessionInitial,

      setSessionId: (id) => set({ sessionId: id }, false, 'setSessionId'),

      setPracticeStatus: (status) =>
        set({ practiceStatus: status }, false, 'setPracticeStatus'),

      setWsConnectionStatus: (status) =>
        set({ wsConnectionStatus: status }, false, 'setWsConnectionStatus'),

      setCountdown: (count) =>
        set({ countdown: count }, false, 'setCountdown'),

      /**
       * 실시간 프레임 데이터 한 번에 적용
       * WebSocket 메시지 수신 시 호출 — 최소한의 렌더 트리거를 위해 한 번에 set
       */
      applyLiveFrame: (frame) =>
        set(
          {
            matchScore:          frame.match_score,
            jointErrors:         frame.joint_errors,
            feedback:            frame.feedback,
            userPose:            frame.user_pose,
            referencePose:       frame.reference_pose,
            currentSectionIndex: frame.section_index ?? 0,
            isRecording:         frame.is_recording,
          },
          false,
          'applyLiveFrame'
        ),

      setMatchScore:    (score)  => set({ matchScore: score },       false, 'setMatchScore'),
      setJointErrors:   (errors) => set({ jointErrors: errors },     false, 'setJointErrors'),
      setFeedback:      (msg)    => set({ feedback: msg },           false, 'setFeedback'),
      setUserPose:      (pose)   => set({ userPose: pose },          false, 'setUserPose'),
      setReferencePose: (pose)   => set({ referencePose: pose },     false, 'setReferencePose'),

      toggleMirrorMode:  () => set((s) => ({ isMirrorMode: !s.isMirrorMode }),   false, 'toggleMirrorMode'),
      toggleSkeleton:    () => set((s) => ({ showSkeleton: !s.showSkeleton }),   false, 'toggleSkeleton'),
      toggleGhostGuide:  () => set((s) => ({ showGhostGuide: !s.showGhostGuide }), false, 'toggleGhostGuide'),
      setGhostOpacity:   (opacity) => set({ ghostOpacity: opacity },             false, 'setGhostOpacity'),

      resetLiveSession: () =>
        set({ ...liveSessionInitial }, false, 'resetLiveSession'),

      // ─── ReportSlice ─────────────────────────────────────

      ...reportInitial,

      setCurrentReport: (report) =>
        set({ currentReport: report }, false, 'setCurrentReport'),

      setReplayFrames: (frames) =>
        set({ replayFrames: frames }, false, 'setReplayFrames'),

      setReplayStatus: (status) =>
        set({ replayStatus: status }, false, 'setReplayStatus'),

      setCurrentReplayFrameIndex: (index) =>
        set({ currentReplayFrameIndex: index }, false, 'setCurrentReplayFrameIndex'),

      setReplaySpeed: (speed) =>
        set({ replaySpeed: speed }, false, 'setReplaySpeed'),

      toggleHighlightWrongSections: () =>
        set(
          (s) => ({ highlightWrongSections: !s.highlightWrongSections }),
          false,
          'toggleHighlightWrongSections'
        ),

      resetReport: () => set({ ...reportInitial }, false, 'resetReport'),

      // ─── UserSlice ───────────────────────────────────────

      ...userInitial,

      setUser: (user) => set({ user }, false, 'setUser'),

      setSelectedDance: (dance) =>
        set({ selectedDance: dance }, false, 'setSelectedDance'),

      setLastCompletedSession: (session) =>
        set({ lastCompletedSession: session }, false, 'setLastCompletedSession'),

      setAvatarSelections: (partial) =>
        set(
          (s) => ({
            avatarSelections: { ...s.avatarSelections, ...partial },
          }),
          false,
          'setAvatarSelections'
        ),

      resetAvatarSelections: () =>
        set(
          { avatarSelections: { avatar_id: null, stage_theme_id: null, costume_id: null } },
          false,
          'resetAvatarSelections'
        ),

      setIsLoading: (loading) =>
        set({ isLoading: loading }, false, 'setIsLoading'),

      setGlobalError: (error) =>
        set({ globalError: error }, false, 'setGlobalError'),
    })),
    { name: 'DanceStore' }  // Redux DevTools에서 표시될 이름
  )
)

// ═══════════════════════════════════════════════════════
// Selector hooks — 컴포넌트에서 사용할 최적화 셀렉터
// 필요한 상태만 subscribe해서 불필요한 리렌더를 방지
// ═══════════════════════════════════════════════════════

/** 실시간 점수만 구독 (ScoreBar 컴포넌트용) */
export const useMatchScore = () =>
  useDanceStore((s) => s.matchScore)

/** 관절 오류만 구독 (SkeletonOverlay 컴포넌트용) */
export const useJointErrors = () =>
  useDanceStore((s) => s.jointErrors)

/** 피드백 메시지만 구독 (FeedbackPanel 컴포넌트용) */
export const useFeedback = () =>
  useDanceStore((s) => s.feedback)

/** 포즈 데이터 구독 (Canvas 컴포넌트용) */
export const usePoseData = () =>
  useDanceStore((s) => ({
    userPose: s.userPose,
    referencePose: s.referencePose,
  }))

/** practice 상태 구독 */
export const usePracticeStatus = () =>
  useDanceStore((s) => s.practiceStatus)

/** 연결 상태 구독 */
export const useWsConnectionStatus = () =>
  useDanceStore((s) => s.wsConnectionStatus)

/** 설정 상태 구독 (MobileBottomControls용) */
export const usePracticeSettings = () =>
  useDanceStore((s) => ({
    isMirrorMode: s.isMirrorMode,
    showSkeleton: s.showSkeleton,
    showGhostGuide: s.showGhostGuide,
    ghostOpacity: s.ghostOpacity,
  }))

/** 리포트 데이터 구독 */
export const useCurrentReport = () =>
  useDanceStore((s) => s.currentReport)

/** 리플레이 상태 구독 */
export const useReplayState = () =>
  useDanceStore((s) => ({
    frames: s.replayFrames,
    status: s.replayStatus,
    currentIndex: s.currentReplayFrameIndex,
    speed: s.replaySpeed,
    highlightWrong: s.highlightWrongSections,
  }))

/** 유저 정보 구독 */
export const useUser = () =>
  useDanceStore((s) => s.user)

/** 선택된 안무 구독 */
export const useSelectedDance = () =>
  useDanceStore((s) => s.selectedDance)

/** 아바타 선택 상태 구독 */
export const useAvatarSelections = () =>
  useDanceStore((s) => s.avatarSelections)
