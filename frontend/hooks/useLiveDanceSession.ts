/**
 * hooks/useLiveDanceSession.ts
 * ─────────────────────────────────────────────────────────────────
 * 연습 세션의 전체 생명주기를 관리하는 훅
 *
 * 역할:
 * 1. 카메라 권한 요청 및 미디어 스트림 초기화
 * 2. sessionApi.start() 호출 → session_id 발급
 * 3. useWebSocketDance.connect() 호출 → SSE 실시간 분석 시작
 * 4. 일시정지 / 재개 처리
 * 5. sessionApi.end() 호출 → 분석 리포트 수신 → store에 저장
 * 6. 언마운트 시 카메라 / WebSocket 정리
 *
 * 사용:
 *   const session = useLiveDanceSession()
 *   session.startSession(danceReferenceId)
 *   session.pauseSession()
 *   session.resumeSession()
 *   session.endSession()
 *
 * practice/page.tsx 에서 단독으로 사용
 * 다른 페이지에서는 이 훅을 사용하지 않음
 * ─────────────────────────────────────────────────────────────────
 */

'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useDanceStore } from '@/store/danceStore'
import { useWebSocketDance } from '@/hooks/useWebSocketDance'
import { sessionApi } from '@/lib/api'

// ═══════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════

export interface CameraState {
  stream: MediaStream | null
  error: string | null
  isReady: boolean
  isRequesting: boolean
}

export interface UseLiveDanceSessionReturn {
  // 카메라
  cameraState: CameraState
  videoRef: React.RefObject<HTMLVideoElement | null>
  requestCamera: () => Promise<void>
  releaseCamera: () => void
  // 세션 제어
  startSession: (danceReferenceId: number) => Promise<void>
  pauseSession: () => void
  resumeSession: () => void
  endSession: () => Promise<void>
  // 카운트다운
  countdown: number | null
  // 에러
  sessionError: string | null
  clearSessionError: () => void
}

// ═══════════════════════════════════════════════════════
// 카메라 설정
// ═══════════════════════════════════════════════════════

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width:       { ideal: 1280 },
    height:      { ideal: 720 },
    facingMode:  'user',  // 전면 카메라
    frameRate:   { ideal: 30 },
  },
  audio: false,
}

/** 카운트다운 초 (3, 2, 1 후 실제 시작) */
const COUNTDOWN_SECONDS = 3

// ═══════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════

export function useLiveDanceSession(): UseLiveDanceSessionReturn {
  const router = useRouter()
  const { connect, disconnect } = useWebSocketDance()

  const {
    setPracticeStatus,
    setSessionId,
    setCountdown,
    setLastCompletedSession,
    setCurrentReport,
    resetLiveSession,
    selectedDance,
  } = useDanceStore()

  // ── 카메라 상태 ─────────────────────────────────────
  const [cameraState, setCameraState] = useState<CameraState>({
    stream:       null,
    error:        null,
    isReady:      false,
    isRequesting: false,
  })
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // ── 세션 상태 ───────────────────────────────────────
  const [countdown, setLocalCountdown] = useState<number | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentSessionIdRef = useRef<string | null>(null)
  const currentDanceRefIdRef = useRef<number | null>(null)

  // ── 카메라 요청 ─────────────────────────────────────

  const requestCamera = useCallback(async () => {
    setCameraState((prev) => ({ ...prev, isRequesting: true, error: null }))

    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)
      streamRef.current = stream

      // video element에 스트림 연결
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameraState({
        stream,
        error:        null,
        isReady:      true,
        isRequesting: false,
      })
    } catch (err) {
      const errorMsg =
        err instanceof DOMException
          ? err.name === 'NotAllowedError'
            ? '카메라 권한이 거부되었어요. 브라우저 설정에서 카메라를 허용해주세요.'
            : err.name === 'NotFoundError'
              ? '카메라를 찾을 수 없어요. 카메라가 연결되어 있는지 확인해주세요.'
              : `카메라 오류: ${err.message}`
          : '카메라를 시작할 수 없어요.'

      setCameraState({
        stream:       null,
        error:        errorMsg,
        isReady:      false,
        isRequesting: false,
      })
    }
  }, [])

  const releaseCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraState({
      stream:       null,
      error:        null,
      isReady:      false,
      isRequesting: false,
    })
  }, [])

  // ── 카운트다운 ──────────────────────────────────────

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }, [])

  const startCountdown = useCallback(
    (onComplete: () => void) => {
      clearCountdown()

      let count = COUNTDOWN_SECONDS
      setLocalCountdown(count)
      setCountdown(count)
      setPracticeStatus('countdown')

      countdownTimerRef.current = setInterval(() => {
        count -= 1
        if (count > 0) {
          setLocalCountdown(count)
          setCountdown(count)
        } else {
          clearCountdown()
          setLocalCountdown(null)
          setCountdown(null)
          onComplete()
        }
      }, 1000)
    },
    [clearCountdown, setCountdown, setPracticeStatus]
  )

  // ── 세션 시작 ────────────────────────────────────────

  const startSession = useCallback(
    async (danceReferenceId: number) => {
      setSessionError(null)
      setPracticeStatus('ready')
      currentDanceRefIdRef.current = danceReferenceId

      try {
        // 1. 카메라가 준비 안 됐으면 먼저 요청
        if (!cameraState.isReady) {
          await requestCamera()
        }

        // 2. 백엔드에 세션 시작 요청
        // TODO(real API): POST /api/session/start must return session_id and stream_url.
        setPracticeStatus('ready')
        const response = await sessionApi.start({ dance_reference_id: danceReferenceId })
        const sessionId = response.session_id
        currentSessionIdRef.current = sessionId
        setSessionId(sessionId)

        // 3. 카운트다운 후 SSE 연결 + 녹화 시작
        startCountdown(() => {
          setPracticeStatus('recording')
          connect(sessionId)
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : '세션을 시작할 수 없어요.'
        setSessionError(msg)
        setPracticeStatus('idle')
        currentSessionIdRef.current = null
        setSessionId(null)
      }
    },
    [
      cameraState.isReady,
      connect,
      requestCamera,
      setSessionId,
      setPracticeStatus,
      startCountdown,
    ]
  )

  // ── 일시정지 / 재개 ─────────────────────────────────

  const pauseSession = useCallback(() => {
    setPracticeStatus('paused')
    // WebSocket은 유지하되 store 상태만 paused로 변경
    // 실제 녹화 중지는 백엔드에 별도 신호를 보낼 수 있음
  }, [setPracticeStatus])

  const resumeSession = useCallback(() => {
    setPracticeStatus('recording')
  }, [setPracticeStatus])

  // ── 세션 종료 ────────────────────────────────────────

  const endSession = useCallback(async () => {
    const sessionId = currentSessionIdRef.current
    if (!sessionId) return

    setPracticeStatus('ended')
    disconnect()
    clearCountdown()

    try {
      // TODO(real API): POST /api/session/end should persist analysis_reports before navigation.
      const response = await sessionApi.end({ session_id: sessionId })

      // store에 결과 저장
      setLastCompletedSession(response.session)
      setCurrentReport(response.report)

      // 리포트 페이지로 이동
      router.push(`/report/${sessionId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '세션 종료 중 오류가 발생했어요.'
      setSessionError(msg)
      // 에러가 나도 리포트 페이지로 이동 (mock 데이터로 표시)
      router.push(`/report/${sessionId}`)
    } finally {
      currentSessionIdRef.current = null
    }
  }, [
    disconnect,
    clearCountdown,
    setLastCompletedSession,
    setCurrentReport,
    setPracticeStatus,
    router,
  ])

  const clearSessionError = useCallback(() => setSessionError(null), [])

  // ── 언마운트 시 정리 ─────────────────────────────────

  useEffect(() => {
    return () => {
      clearCountdown()
      disconnect()
      releaseCamera()
      resetLiveSession()
    }
  }, [clearCountdown, disconnect, releaseCamera, resetLiveSession])

  // ── video element에 stream 연결 (ref 변경 시) ────────
  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {
        // 자동 재생 정책으로 인한 에러는 무시 (사용자 인터랙션 후 재시도)
      })
    }
  }, [cameraState.isReady])

  return {
    cameraState,
    videoRef,
    requestCamera,
    releaseCamera,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    countdown,
    sessionError,
    clearSessionError,
  }
}
