'use client'

/**
 * components/CameraStage.tsx
 * ─────────────────────────────────────────────────────────────────
 * 카메라 비디오 + canvas 레이어 스택
 *
 * 구조:
 *   <div> (container, position: relative)
 *     <video>                ← useLiveDanceSession의 videoRef 연결
 *     <GhostGuideOverlay>    ← 기준 안무 ghost canvas (children으로)
 *     <SkeletonOverlay>      ← 사용자 skeleton canvas (children으로)
 *     <div>                  ← UI 오버레이 (점수, 피드백 등)
 *   </div>
 *
 * canvas 오버레이들은 .canvas-stage 클래스로 position:absolute + inset:0
 * ResizeObserver 없이 CSS 100%/100%로 자동 맞춤 — syncCanvasSize는 RAF 내부에서 호출
 * ─────────────────────────────────────────────────────────────────
 */

import React from 'react'

// ─── Props ────────────────────────────────────────────────────────

interface CameraStageProps {
  /** useLiveDanceSession에서 받은 videoRef */
  videoRef: React.RefObject<HTMLVideoElement | null>
  /** 카메라 스트림 준비 완료 */
  isReady: boolean
  /** 카메라 에러 메시지 */
  error: string | null
  /** 미러 모드 (비디오만 반전, canvas는 drawSkeleton의 mirror 옵션으로 처리) */
  mirror: boolean
  /** 녹화 중 REC 표시 */
  isRecording?: boolean
  /** 오버레이 canvas들 (SkeletonOverlay, GhostGuideOverlay) + HUD 요소 */
  children?: React.ReactNode
}

// ─── 하위 UI ─────────────────────────────────────────────────────

function CameraLoading() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f] z-20">
      <div className="relative w-20 h-20 mb-5">
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: 'rgba(176,65,255,0.18)' }}
        />
        <div
          className="relative w-full h-full rounded-full flex items-center justify-center"
          style={{ border: '2px solid rgba(176,65,255,0.45)' }}
        >
          <span className="text-3xl">📷</span>
        </div>
      </div>
      <p className="text-gray-300 font-semibold text-sm">카메라 준비 중...</p>
      <p className="text-gray-600 text-xs mt-1">잠시만 기다려 주세요</p>
    </div>
  )
}

function CameraError({ error }: { error: string }) {
  const isPermission =
    error.includes('NotAllowed') ||
    error.includes('권한') ||
    error.includes('permission') ||
    error.includes('Permission')

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f] z-20 px-8 text-center">
      <div className="text-5xl mb-4">📷</div>
      <p className="text-white font-bold text-lg mb-2">
        {isPermission ? '카메라 권한이 필요해요' : '카메라를 켤 수 없어요'}
      </p>
      <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">{error}</p>
      {isPermission && (
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-full text-sm font-bold"
          style={{ background: 'linear-gradient(135deg,#b041ff,#ff2d78)', color: '#fff' }}
        >
          다시 시도
        </button>
      )}
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────

export function CameraStage({
  videoRef,
  isReady,
  error,
  mirror,
  isRecording = false,
  children,
}: CameraStageProps) {
  return (
    <div className="relative w-full h-full bg-[#0a0a0f] overflow-hidden">
      {/* 카메라 비디오 — mirror는 CSS scaleX로 처리 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
      />

      {/* canvas 오버레이 (GhostGuideOverlay, SkeletonOverlay) + HUD */}
      {isReady && children}

      {/* 로딩 / 에러 UI */}
      {error && <CameraError error={error} />}
      {!error && !isReady && <CameraLoading />}

      {/* REC 인디케이터 */}
      {isRecording && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-30 pointer-events-none">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#ff3b3b', boxShadow: '0 0 6px #ff3b3b' }}
          />
          <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">
            REC
          </span>
        </div>
      )}

      {/* 가장자리 비네팅 */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.6) 100%)',
        }}
      />
    </div>
  )
}
