'use client'

/**
 * components/GhostGuideOverlay.tsx
 * ─────────────────────────────────────────────────────────────────
 * 기준 안무 ghost skeleton canvas 오버레이
 * 반투명 보라색으로 "따라야 할 자세"를 표시
 *
 * 성능: Ref-based RAF 패턴
 * - referencePose, ghostOpacity 변화를 ref로 추적
 * - RAF 루프는 마운트 시 한 번만 시작
 * ─────────────────────────────────────────────────────────────────
 */

import { useRef, useEffect } from 'react'
import { useDanceStore } from '@/store/danceStore'
import { drawGhostSkeleton, clearCanvas, syncCanvasSize } from '@/lib/drawSkeleton'
import type { PoseData } from '@/lib/types'

interface GhostGuideOverlayProps {
  mirror?: boolean
}

export function GhostGuideOverlay({ mirror = true }: GhostGuideOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  // ── 최신 값을 ref에 저장 ──────────────────────────────────────
  const referencePoseRef = useRef<PoseData | null>(null)
  const ghostOpacityRef  = useRef(0.45)
  const mirrorRef        = useRef(mirror)

  useEffect(() => {
    // 초기값
    const state = useDanceStore.getState()
    referencePoseRef.current = state.referencePose
    ghostOpacityRef.current  = state.ghostOpacity
    mirrorRef.current        = mirror

    // 변경 구독
    const unsub = useDanceStore.subscribe((s) => {
      referencePoseRef.current = s.referencePose
      ghostOpacityRef.current  = s.ghostOpacity
    })
    return unsub
  }, [])

  useEffect(() => {
    mirrorRef.current = mirror
  }, [mirror])

  // ── RAF 루프 ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const render = () => {
      if (canvas.parentElement) {
        syncCanvasSize(canvas, canvas.parentElement)
      }
      clearCanvas(canvas)
      if (referencePoseRef.current) {
        drawGhostSkeleton(canvas, referencePoseRef.current, {
          alpha:  ghostOpacityRef.current,
          mirror: mirrorRef.current,
        })
      }
      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="canvas-stage"
      style={{ zIndex: 11 }}
      aria-hidden="true"
    />
  )
}
