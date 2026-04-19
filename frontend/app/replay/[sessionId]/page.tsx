/**
 * app/replay/[sessionId]/page.tsx — Skeleton Replay Studio
 *
 * Canvas 기반 관절 리플레이 (User vs Reference 비교)
 * - 오버레이 / 분할 / 단독 뷰 모드
 * - 틀린 구간 강조 + 구간 점프
 * - 재생 속도 조절
 * - mock 데이터 기반, 향후 backend JSON 연결 가능 구조
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams }    from 'next/navigation'
import Link             from 'next/link'

import { useDanceStore, useReplayState } from '@/store/danceStore'
import { ReplayTimeline }               from '@/components/ReplayTimeline'
import { BottomNav }                    from '@/components/BottomNav'

import {
  createMockSessionFrames,
  MOCK_ANALYSIS_REPORT,
} from '@/lib/mock'

import {
  drawUserSkeleton,
  drawGhostSkeleton,
  syncCanvasSize,
} from '@/lib/drawSkeleton'

import {
  getScoreColor,
  getScoreLabel,
  type PoseData,
  type JointErrors,
  type SectionScore,
} from '@/lib/types'

// ═══════════════════════════════════════════════════════
// Mock helpers (mirrors mock.ts local functions for replay)
// ═══════════════════════════════════════════════════════

/** 기준 안무 포즈 생성 (노이즈 없는 순수 애니메이션) */
function getMockReferencePose(frameIndex: number): PoseData {
  const t           = (frameIndex / 30) * Math.PI
  const armOffset   = Math.sin(t) * 0.08
  const kneeOffset  = Math.abs(Math.sin(t * 0.5)) * 0.05
  return {
    nose:           { x: 0.50, y: 0.12, visibility: 0.99 },
    left_shoulder:  { x: 0.38, y: 0.28, visibility: 0.99 },
    right_shoulder: { x: 0.62, y: 0.28, visibility: 0.99 },
    left_elbow:     { x: 0.28, y: 0.42 - armOffset,       visibility: 0.95 },
    right_elbow:    { x: 0.72, y: 0.42 + armOffset,       visibility: 0.95 },
    left_wrist:     { x: 0.20, y: 0.55 - armOffset * 1.3, visibility: 0.90 },
    right_wrist:    { x: 0.80, y: 0.55 + armOffset * 1.3, visibility: 0.90 },
    left_hip:       { x: 0.41, y: 0.54, visibility: 0.99 },
    right_hip:      { x: 0.59, y: 0.54, visibility: 0.99 },
    left_knee:      { x: 0.39, y: 0.72 + kneeOffset, visibility: 0.97 },
    right_knee:     { x: 0.61, y: 0.72 - kneeOffset, visibility: 0.97 },
    left_ankle:     { x: 0.38, y: 0.90, visibility: 0.95 },
    right_ankle:    { x: 0.62, y: 0.90, visibility: 0.95 },
  }
}

/** 프레임 인덱스 기반 결정적(deterministic) 관절 오류 생성 */
function getMockJointErrors(frameIndex: number): JointErrors {
  const t      = frameIndex
  const errors: JointErrors = {}
  if (Math.sin(t / 8) > 0.4) {
    errors.left_elbow = { joint: 'left_elbow',  status: 'wrong', angle_diff: 18, direction: '올려요'    }
  }
  if (Math.sin(t / 12 + 1) > 0.5) {
    errors.right_knee = { joint: 'right_knee',  status: 'wrong', angle_diff: 20, direction: '더 굽혀요' }
  }
  if (Math.sin(t / 15 + 2) > 0.6) {
    errors.left_wrist = { joint: 'left_wrist',  status: 'wrong', angle_diff: 16, direction: '바깥으로'  }
  }
  return errors
}

// ═══════════════════════════════════════════════════════
// Canvas 배경: 원근 격자 + 어두운 그라디언트
// ═══════════════════════════════════════════════════════

function drawCanvasBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  ctx.clearRect(0, 0, w, h)

  // 베이스 그라디언트
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#060310')
  bg.addColorStop(0.55, '#0a0618')
  bg.addColorStop(1, '#040210')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // 중앙 보라 글로우
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.32, 0, w * 0.5, h * 0.32, w * 0.72)
  glow.addColorStop(0, 'rgba(176, 65, 255, 0.07)')
  glow.addColorStop(0.5, 'rgba(176, 65, 255, 0.025)')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)

  // 하단 청록 바닥 글로우
  const floorGlow = ctx.createRadialGradient(w * 0.5, h, 0, w * 0.5, h, w * 0.8)
  floorGlow.addColorStop(0, 'rgba(0, 229, 255, 0.04)')
  floorGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = floorGlow
  ctx.fillRect(0, 0, w, h)

  // 원근 바닥 격자
  const vanishX = w * 0.5
  const vanishY = h * 0.58

  ctx.save()
  ctx.lineWidth = 0.5

  // 수평선 (소실점으로 좁아지는 느낌)
  const hLines = 8
  for (let i = 0; i <= hLines; i++) {
    const t = i / hLines
    const y = vanishY + (h - vanishY) * t
    const a = 0.035 + t * 0.055
    ctx.strokeStyle = `rgba(176, 65, 255, ${a})`
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }

  // 수직 수렴선
  const vLines = 10
  for (let i = 0; i <= vLines; i++) {
    const xBottom = (i / vLines) * w
    ctx.strokeStyle = 'rgba(176, 65, 255, 0.04)'
    ctx.beginPath()
    ctx.moveTo(xBottom, h)
    ctx.lineTo(vanishX, vanishY)
    ctx.stroke()
  }

  ctx.restore()
}

// ═══════════════════════════════════════════════════════
// 섹션 점수 뱃지 색상 헬퍼
// ═══════════════════════════════════════════════════════

function scoreBg(score: number): string {
  if (score >= 85) return 'rgba(34,197,94,0.10)'
  if (score >= 70) return 'rgba(245,158,11,0.10)'
  return 'rgba(239,68,68,0.10)'
}
function scoreBorder(score: number): string {
  if (score >= 85) return 'rgba(34,197,94,0.28)'
  if (score >= 70) return 'rgba(245,158,11,0.28)'
  return 'rgba(239,68,68,0.28)'
}

// ═══════════════════════════════════════════════════════
// View Mode 타입
// ═══════════════════════════════════════════════════════

type ViewMode = 'overlay' | 'split' | 'user' | 'ref'

const VIEW_MODES: { key: ViewMode; label: string; icon: string }[] = [
  { key: 'overlay', label: '오버레이', icon: '⊕' },
  { key: 'split',   label: '분할 비교', icon: '⊞' },
  { key: 'user',    label: '내 동작',   icon: '🙋' },
  { key: 'ref',     label: '기준',      icon: '👻' },
]

// ════════════════════════════════════════════════════
// 메인 페이지
// ════════════════════════════════════════════════════

export default function ReplayPage() {
  const params    = useParams<{ sessionId: string }>()
  const sessionId = params?.sessionId ?? 'mock_session_101'

  const report        = MOCK_ANALYSIS_REPORT
  const sectionScores: SectionScore[] = report.section_scores
  const totalDuration = sectionScores.at(-1)?.end_time ?? 0

  // ── Zustand 상태 ─────────────────────────────────────────
  const { frames, status, currentIndex, speed } = useReplayState()
  const {
    setReplayFrames,
    setReplayStatus,
    setCurrentReplayFrameIndex,
  } = useDanceStore()

  // ── 로컬 UI 상태 ─────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('overlay')

  // ── Canvas Refs ───────────────────────────────────────────
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const userCanvasRef    = useRef<HTMLCanvasElement>(null)
  const refCanvasRef     = useRef<HTMLCanvasElement>(null)

  // ── 재생 루프: interval 재생성 없이 최신 speed를 읽기 위한 ref ──
  const speedRef = useRef(speed)
  useEffect(() => { speedRef.current = speed }, [speed])

  // ── 1. Mock 프레임 초기화 ────────────────────────────────
  useEffect(() => {
    const mockFrames = createMockSessionFrames(sessionId)
    setReplayFrames(mockFrames)
    setReplayStatus('idle')
    setCurrentReplayFrameIndex(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // ── 2. 재생 루프 (setInterval + getState로 stale closure 방지) ──
  useEffect(() => {
    if (status !== 'playing') return

    const fps      = Math.max(1, 15 * speedRef.current)
    const interval = Math.round(1000 / fps)

    const id = setInterval(() => {
      const store = useDanceStore.getState()
      const cur   = store.currentReplayFrameIndex
      const total = store.replayFrames.length
      if (total === 0) return

      if (cur >= total - 1) {
        store.setReplayStatus('ended')
        store.setCurrentReplayFrameIndex(total - 1)
      } else {
        store.setCurrentReplayFrameIndex(cur + 1)
      }
    }, interval)

    return () => clearInterval(id)
  }, [status, speed])

  // ── 3. Canvas 렌더링 (frame / viewMode 변경마다 실행) ────
  const renderFrame = useCallback(() => {
    const frame = frames[currentIndex]
    if (!frame) return

    const userPose: PoseData   = frame.pose_json
    const refPose: PoseData    = getMockReferencePose(frame.frame_index)
    const errors: JointErrors  = getMockJointErrors(frame.frame_index)

    function renderOnCanvas(
      canvasRef: React.RefObject<HTMLCanvasElement | null>,
      drawFn: (canvas: HTMLCanvasElement) => void
    ) {
      const canvas = canvasRef.current
      if (!canvas) return
      const parent = canvas.parentElement as HTMLElement | null
      if (!parent) return
      syncCanvasSize(canvas, parent)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      drawCanvasBackground(ctx, canvas.width, canvas.height)
      drawFn(canvas)
    }

    if (viewMode === 'overlay') {
      renderOnCanvas(overlayCanvasRef, c => {
        drawGhostSkeleton(c, refPose, { color: '#7b5cff', alpha: 0.52 })
        drawUserSkeleton(c, userPose, errors)
      })
    } else if (viewMode === 'user') {
      renderOnCanvas(overlayCanvasRef, c => {
        drawUserSkeleton(c, userPose, errors)
      })
    } else if (viewMode === 'ref') {
      renderOnCanvas(overlayCanvasRef, c => {
        drawGhostSkeleton(c, refPose, { color: '#00e5ff', alpha: 0.92, boneWidth: 3.5, jointRadius: 9 })
      })
    } else if (viewMode === 'split') {
      renderOnCanvas(userCanvasRef, c => {
        drawUserSkeleton(c, userPose, errors)
      })
      renderOnCanvas(refCanvasRef, c => {
        drawGhostSkeleton(c, refPose, { color: '#7b5cff', alpha: 0.92, boneWidth: 3.5, jointRadius: 9 })
      })
    }
  }, [currentIndex, frames, viewMode])

  useEffect(() => {
    renderFrame()
  }, [renderFrame])

  // ── 파생 값 ─────────────────────────────────────────────
  const currentFrame    = frames[currentIndex]
  const currentScore    = currentFrame?.score ?? 0
  const currentTime     = currentFrame?.timestamp_seconds ?? 0
  const currentErrors   = currentFrame ? getMockJointErrors(currentFrame.frame_index) : {}
  const wrongJoints     = Object.values(currentErrors).filter(e => e?.status === 'wrong')
  const activeSection   = sectionScores.find(
    s => currentTime >= s.start_time && currentTime < s.end_time
  )

  function jumpToSectionFromGrid(sec: SectionScore) {
    const idx = frames.findIndex(f => f.timestamp_seconds >= sec.start_time)
    setCurrentReplayFrameIndex(idx >= 0 ? idx : 0)
    setReplayStatus('paused')
  }

  // ════════════════════════════════════════════════════
  // JSX
  // ════════════════════════════════════════════════════

  return (
    <main
      className="min-h-dvh pb-28 md:pb-0"
      style={{ background: 'linear-gradient(180deg, #0F0A1A 0%, #060210 100%)' }}
    >
      {/* ── 상단 헤더 ───────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-5 py-3"
        style={{
          background:           'rgba(15, 10, 26, 0.94)',
          backdropFilter:       'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          borderBottom:         '1px solid rgba(168, 85, 247, 0.1)',
        }}
      >
        <Link
          href={`/report/${sessionId}`}
          className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: '#6b7280' }}
        >
          ← 리포트
        </Link>

        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: status === 'playing' ? '#ff2d78' : '#b041ff',
              boxShadow:  status === 'playing'
                ? '0 0 8px #ff2d78'
                : '0 0 6px #b041ff',
              animation: status === 'playing' ? 'pulse 1s infinite' : 'none',
            }}
          />
          <p className="text-[10px] font-black uppercase tracking-widest text-white">
            Replay Studio
          </p>
        </div>

        <Link
          href="/practice"
          className="text-sm font-semibold transition-colors"
          style={{ color: '#6b7280' }}
        >
          연습 →
        </Link>
      </div>

      {/* ── 메인 콘텐츠 ─────────────────────────────────── */}
      <div className="px-4 pt-5 pb-6 space-y-4 max-w-lg mx-auto">

        {/* 페이지 타이틀 */}
        <div>
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-1"
            style={{ color: '#b041ff' }}
          >
            Skeleton Replay
          </p>
          <h1 className="text-xl font-black text-white leading-tight">
            동작 리플레이
          </h1>
          <p className="text-[10px] mt-0.5 font-mono" style={{ color: '#4a4a65' }}>
            {sessionId}
          </p>
        </div>

        {/* ── 뷰 모드 탭 ────────────────────────────────── */}
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border:     '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {VIEW_MODES.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className="flex-1 py-2 rounded-lg transition-all active:scale-95"
              style={{
                background: viewMode === key
                  ? 'linear-gradient(135deg, rgba(176,65,255,0.22), rgba(255,45,120,0.12))'
                  : 'transparent',
                border: `1px solid ${
                  viewMode === key
                    ? 'rgba(176,65,255,0.42)'
                    : 'transparent'
                }`,
              }}
            >
              <span
                className="block text-center text-sm leading-none mb-0.5"
              >
                {icon}
              </span>
              <span
                className="block text-center text-[8px] font-bold leading-none"
                style={{ color: viewMode === key ? '#e8b4ff' : '#4a4a65' }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* ── Canvas 뷰포트 ──────────────────────────────── */}
        {viewMode === 'split' ? (
          /* ── 분할 비교 뷰 ── */
          <div className="flex gap-2">
            {/* 사용자 캔버스 */}
            <div
              className="flex-1 relative rounded-2xl overflow-hidden"
              style={{
                aspectRatio: '9/16',
                background:  '#04020e',
                border:      '1px solid rgba(0,229,255,0.18)',
              }}
            >
              <canvas
                ref={userCanvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ display: 'block' }}
              />
              {/* 현재 점수 오버레이 */}
              <div
                className="absolute top-2 left-2 px-2 py-1 rounded-lg pointer-events-none"
                style={{
                  background: 'rgba(0,0,0,0.55)',
                  border:     '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p
                  className="text-base font-black leading-none"
                  style={{ color: getScoreColor(currentScore) }}
                >
                  {Math.round(currentScore)}
                </p>
              </div>
              {/* 라벨 */}
              <div
                className="absolute bottom-2 left-0 right-0 text-center text-[9px] font-black uppercase tracking-wider pointer-events-none"
                style={{ color: 'rgba(0,229,255,0.65)' }}
              >
                👤 내 동작
              </div>
              {/* 틀린 관절 라벨 */}
              {wrongJoints.length > 0 && (
                <div
                  className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-0.5 px-1 pointer-events-none"
                >
                  {wrongJoints.slice(0, 2).map(err => err && (
                    <div
                      key={err.joint}
                      className="px-1.5 py-0.5 rounded text-[7px] font-bold"
                      style={{
                        background: 'rgba(239,68,68,0.22)',
                        border:     '1px solid rgba(239,68,68,0.4)',
                        color:      '#ef4444',
                      }}
                    >
                      {err.joint.replace('_', ' ')} {err.direction}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 기준 캔버스 */}
            <div
              className="flex-1 relative rounded-2xl overflow-hidden"
              style={{
                aspectRatio: '9/16',
                background:  '#04020e',
                border:      '1px solid rgba(123,92,255,0.22)',
              }}
            >
              <canvas
                ref={refCanvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ display: 'block' }}
              />
              <div
                className="absolute bottom-2 left-0 right-0 text-center text-[9px] font-black uppercase tracking-wider pointer-events-none"
                style={{ color: 'rgba(123,92,255,0.7)' }}
              >
                👻 기준 안무
              </div>
            </div>
          </div>
        ) : (
          /* ── 단독 / 오버레이 뷰 ── */
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              aspectRatio: '3/4',
              background:  '#04020e',
              border:      '1px solid rgba(168,85,247,0.14)',
            }}
          >
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ display: 'block' }}
            />

            {/* 범례 (오버레이 모드만) */}
            {viewMode === 'overlay' && (
              <div
                className="absolute top-3 right-3 flex flex-col gap-1.5 pointer-events-none"
                style={{ zIndex: 10 }}
              >
                {[
                  { color: '#00e5ff', label: '내 동작' },
                  { color: '#7b5cff', label: '기준 안무' },
                ].map(({ color, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(0,0,0,0.55)' }}
                  >
                    <span
                      className="w-3 h-1 rounded-full inline-block shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-[8px] font-bold" style={{ color }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 점수 오버레이 */}
            <div
              className="absolute top-3 left-3 px-2.5 py-2 rounded-xl pointer-events-none"
              style={{
                background: 'rgba(4,2,14,0.72)',
                border:     '1px solid rgba(255,255,255,0.08)',
                zIndex:     10,
              }}
            >
              <p
                className="text-[8px] font-black uppercase tracking-wider mb-0.5"
                style={{ color: '#4a4a65' }}
              >
                Score
              </p>
              <p
                className="text-2xl font-black leading-none"
                style={{ color: getScoreColor(currentScore) }}
              >
                {Math.round(currentScore)}
              </p>
              <p
                className="text-[8px] font-black mt-0.5 uppercase"
                style={{ color: getScoreColor(currentScore) }}
              >
                {getScoreLabel(currentScore)}
              </p>
            </div>

            {/* 현재 구간 배지 */}
            {activeSection && (
              <div
                className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none"
                style={{ zIndex: 10 }}
              >
                <div
                  className="px-3 py-1 rounded-full text-[9px] font-black"
                  style={{
                    background: 'rgba(176,65,255,0.18)',
                    border:     '1px solid rgba(176,65,255,0.38)',
                    color:      '#b041ff',
                  }}
                >
                  {activeSection.section_name}
                </div>
              </div>
            )}

            {/* 틀린 관절 칩 (하단 플로팅) */}
            {wrongJoints.length > 0 && (
              <div
                className="absolute bottom-3 left-0 right-0 flex justify-center flex-wrap gap-1.5 px-3 pointer-events-none"
                style={{ zIndex: 10 }}
              >
                {wrongJoints.map(err => err && (
                  <div
                    key={err.joint}
                    className="px-2 py-0.5 rounded-lg text-[8px] font-bold"
                    style={{
                      background: 'rgba(239,68,68,0.22)',
                      border:     '1px solid rgba(239,68,68,0.45)',
                      color:      '#ef4444',
                    }}
                  >
                    {err.joint.replace(/_/g, ' ')}
                    {err.direction ? ` · ${err.direction}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 현황 스탯 바 ───────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: '현재 점수',
              value: `${Math.round(currentScore)}점`,
              sub:   getScoreLabel(currentScore),
              color: getScoreColor(currentScore),
            },
            {
              label: '프레임',
              value: `${currentIndex + 1} / ${frames.length}`,
              sub:   `${currentFrame?.timestamp_seconds.toFixed(1) ?? '0.0'}s`,
              color: '#00e5ff',
            },
            {
              label: '구간',
              value: activeSection?.section_name ?? '—',
              sub:   activeSection ? `${Math.round(activeSection.score)}점` : '',
              color: '#b041ff',
            },
          ].map(item => (
            <div
              key={item.label}
              className="rounded-xl p-3 text-center"
              style={{
                background: 'rgba(26, 16, 48, 0.7)',
                border:     '1px solid rgba(168, 85, 247, 0.12)',
              }}
            >
              <p
                className="text-[8px] font-black uppercase tracking-wider mb-1"
                style={{ color: '#4a4a65' }}
              >
                {item.label}
              </p>
              <p
                className="text-sm font-black leading-none"
                style={{ color: item.color }}
              >
                {item.value}
              </p>
              {item.sub && (
                <p
                  className="text-[7px] font-bold mt-1 uppercase"
                  style={{ color: item.color, opacity: 0.7 }}
                >
                  {item.sub}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ── ReplayTimeline ─────────────────────────────── */}
        <ReplayTimeline
          sectionScores={sectionScores}
          totalDuration={totalDuration}
        />

        {/* ── 구간별 점수 그리드 ─────────────────────────── */}
        <div>
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-3"
            style={{ color: '#4a4a65' }}
          >
            구간별 점수
          </p>
          <div className="grid grid-cols-3 gap-2">
            {sectionScores.map(sec => (
              <button
                key={sec.section_index}
                onClick={() => jumpToSectionFromGrid(sec)}
                className="rounded-xl p-3 text-left transition-all active:scale-95"
                style={{
                  background: scoreBg(sec.score),
                  border:     `1px solid ${scoreBorder(sec.score)}`,
                }}
              >
                <p
                  className="text-[8px] font-black uppercase tracking-wide mb-1"
                  style={{ color: '#4a4a65' }}
                >
                  {sec.section_name}
                </p>
                <p
                  className="text-xl font-black leading-none"
                  style={{ color: getScoreColor(sec.score) }}
                >
                  {Math.round(sec.score)}
                </p>
                <p
                  className="text-[8px] font-mono mt-1"
                  style={{ color: '#4a4a65' }}
                >
                  {sec.start_time}s–{sec.end_time}s
                </p>
                {sec.score < 75 && (
                  <p
                    className="text-[7px] font-black mt-1"
                    style={{ color: '#ef4444' }}
                  >
                    ⚠ 연습 필요
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── 교정 포인트 패널 ───────────────────────────── */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border:     '1px solid rgba(239, 68, 68, 0.14)',
          }}
        >
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-3"
            style={{ color: '#ef4444' }}
          >
            ⚠ 주요 교정 포인트
          </p>
          <div className="space-y-2.5">
            {report.most_wrong_joints.map((joint, i) => (
              <div key={joint} className="flex items-center gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                  style={{ background: 'rgba(239,68,68,0.18)', color: '#ef4444' }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-xs font-semibold" style={{ color: '#9ca3af' }}>
                  {joint.replace(/_/g, ' ')}
                </span>
                <span className="text-[9px] font-mono" style={{ color: '#4a4a65' }}>
                  틀림 {32 - i * 9}회
                </span>
              </div>
            ))}
          </div>
          <p
            className="text-xs leading-relaxed mt-3 pt-3"
            style={{
              borderTop: '1px solid rgba(239,68,68,0.1)',
              color:     '#6b7280',
            }}
          >
            {report.report_json.coach_comment}
          </p>
        </div>

        {/* ── 개선 팁 패널 ───────────────────────────────── */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(0, 229, 255, 0.04)',
            border:     '1px solid rgba(0, 229, 255, 0.12)',
          }}
        >
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-3"
            style={{ color: '#00e5ff' }}
          >
            💡 개선 팁
          </p>
          <div className="space-y-2">
            {report.report_json.improvement_tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className="text-[10px] mt-0.5 shrink-0 font-black"
                  style={{ color: '#00e5ff' }}
                >
                  →
                </span>
                <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
                  {tip}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA 버튼 ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Link
            href={`/report/${sessionId}`}
            className="py-3.5 rounded-xl text-center font-black text-sm transition-all active:scale-95"
            style={{
              background: 'rgba(176,65,255,0.1)',
              border:     '1px solid rgba(176,65,255,0.3)',
              color:      '#b041ff',
            }}
          >
            📊 리포트 보기
          </Link>
          <Link
            href="/practice"
            className="py-3.5 rounded-xl text-center font-black text-sm text-white transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #b041ff, #ff2d78)',
              boxShadow:  '0 0 20px rgba(176,65,255,0.3)',
            }}
          >
            💃 다시 연습
          </Link>
        </div>

        <Link
          href="/"
          className="block text-center text-sm transition-colors"
          style={{ color: '#4a4a65' }}
        >
          홈으로 →
        </Link>
      </div>

      <BottomNav />
    </main>
  )
}
