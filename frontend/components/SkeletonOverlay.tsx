'use client'

/**
 * components/SkeletonOverlay.tsx
 * ─────────────────────────────────────────────────────────────────
 * 사용자 skeleton을 canvas에 렌더링
 *
 * - 정확한 관절: 청록색 (#00e5ff)
 * - 틀린 관절: 빨간 글로우 (#ff3b3b)
 * - 감지 안 됨: 회색 (#444466)
 *
 * 성능: Ref-based RAF 패턴
 * - RAF 루프는 마운트 시 한 번만 시작 (의존성 배열 비어 있음)
 * - userPose, jointErrors, mirror 값은 ref로 참조 → 매 67ms 리렌더 없음
 * ─────────────────────────────────────────────────────────────────
 */

import { useRef, useEffect } from 'react'
import { useDanceStore } from '@/store/danceStore'
import { drawUserSkeleton, clearCanvas, syncCanvasSize } from '@/lib/drawSkeleton'
import type { PoseData, JointErrors } from '@/lib/types'

interface SkeletonOverlayProps {
  mirror?: boolean
}

export function SkeletonOverlay({ mirror = true }: SkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  // ── 최신 값을 ref에 저장 (RAF 루프가 재시작 없이 읽을 수 있게) ──
  const userPoseRef    = useRef<PoseData | null>(null)
  const jointErrorsRef = useRef<JointErrors>({})
  const mirrorRef      = useRef(mirror)

  // store 구독 — 값이 바뀔 때마다 ref를 업데이트 (리렌더 없이)
  useEffect(() => {
    // 초기값 로드
    const state = useDanceStore.getState()
    userPoseRef.current    = state.userPose
    jointErrorsRef.current = state.jointErrors
    mirrorRef.current      = mirror

    // 이후 변경 구독
    const unsub = useDanceStore.subscribe((s) => {
      userPoseRef.current    = s.userPose
      jointErrorsRef.current = s.jointErrors
    })
    return unsub
  }, [])  // 마운트 시 한 번만

  // mirror prop 변경 반영
  useEffect(() => {
    mirrorRef.current = mirror
  }, [mirror])

  // ── RAF 루프 — 마운트/언마운트 한 번만 ─────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const render = () => {
      if (canvas.parentElement) {
        syncCanvasSize(canvas, canvas.parentElement)
      }
      clearCanvas(canvas)
      if (userPoseRef.current) {
        drawUserSkeleton(canvas, userPoseRef.current, jointErrorsRef.current, {
          mirror: mirrorRef.current,
          glowEffect: true,
        })
      }
      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [])  // 의존성 없음 — RAF 루프는 한 번만 시작

  return (
    <canvas
      ref={canvasRef}
      className="canvas-stage"
      style={{ zIndex: 12 }}
      aria-hidden="true"
    />
  )
}
