/**
 * components/ReplayTimeline.tsx
 * K-pop 퍼포먼스 리플레이 타임라인 — 전체 구현
 * Score waveform / 구간 점프 / 속도 조절 / 재생 컨트롤
 */

'use client'

import { useDanceStore, useReplayState } from '@/store/danceStore'
import type { SectionScore } from '@/lib/types'

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const

interface ReplayTimelineProps {
  sectionScores?: SectionScore[]
  totalDuration?: number
}

// ── 구간 점수 색상 ──────────────────────────────────────────────────

function sectionScoreColor(score: number): string {
  if (score >= 85) return '#22c55e'
  if (score >= 70) return '#f59e0b'
  return '#ef4444'
}

// ════════════════════════════════════════════════════
// ReplayTimeline
// ════════════════════════════════════════════════════

export function ReplayTimeline({
  sectionScores = [],
  totalDuration = 0,
}: ReplayTimelineProps) {
  const { frames, status, currentIndex, speed } = useReplayState()
  const { setReplayStatus, setCurrentReplayFrameIndex, setReplaySpeed } = useDanceStore()

  const totalFrames = frames.length
  const currentFrame  = frames[currentIndex]
  const currentTime   = currentFrame?.timestamp_seconds ?? 0
  const lastFrame     = frames[totalFrames - 1]
  const totalTime     = lastFrame?.timestamp_seconds ?? totalDuration

  const progressPct = totalFrames > 1
    ? (currentIndex / (totalFrames - 1)) * 100
    : 0

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const idx = parseInt(e.target.value, 10)
    setCurrentReplayFrameIndex(idx)
    if (status === 'playing') setReplayStatus('paused')
  }

  function stepFrame(delta: number) {
    const next = Math.max(0, Math.min(totalFrames - 1, currentIndex + delta))
    setCurrentReplayFrameIndex(next)
    if (status === 'playing' && Math.abs(delta) === 1) {
      /* allow 1-frame step while playing */
    }
  }

  function togglePlay() {
    if (status === 'ended') {
      setCurrentReplayFrameIndex(0)
      setReplayStatus('playing')
    } else if (status === 'playing') {
      setReplayStatus('paused')
    } else {
      setReplayStatus('playing')
    }
  }

  function jumpToSection(section: SectionScore) {
    if (totalFrames === 0) return
    const idx = frames.findIndex(f => f.timestamp_seconds >= section.start_time)
    setCurrentReplayFrameIndex(idx >= 0 ? idx : 0)
    setReplayStatus('paused')
  }

  // ── Score Waveform (최대 80개 바로 다운샘플) ──────────────────────
  const BAR_COUNT = 80
  const waveformScores: number[] = Array.from({ length: BAR_COUNT }, (_, i) => {
    if (frames.length === 0) return 70 + Math.sin(i / 6) * 20
    const frameIdx = Math.floor((i / BAR_COUNT) * frames.length)
    return frames[Math.min(frameIdx, frames.length - 1)]?.score ?? 0
  })
  const maxScore = Math.max(...waveformScores, 1)

  // ── 구간 마커 위치 ───────────────────────────────────────────────
  const sectionMarkers = totalTime > 0
    ? sectionScores.map(s => ({
        ...s,
        pct: Math.min(99, (s.start_time / totalTime) * 100),
      }))
    : []

  // ── 현재 활성 구간 ──────────────────────────────────────────────
  const activeSection = sectionScores.find(
    s => currentTime >= s.start_time && currentTime < s.end_time
  )

  // ── 재생 버튼 레이블 ─────────────────────────────────────────────
  const playLabel = status === 'playing'
    ? '⏸ 일시정지'
    : status === 'ended'
    ? '↺ 다시보기'
    : '▶ 재생'

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(20, 12, 40, 0.92)',
        border: '1px solid rgba(168, 85, 247, 0.18)',
      }}
    >

      {/* ── 섹션 배지 + Score Wave 헤더 ─────────────────────────────── */}
      <div className="px-4 pt-4 pb-1">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: '#4a4a65' }}
          >
            Score Wave
          </span>
          {activeSection ? (
            <span
              className="text-[9px] font-black px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(176,65,255,0.12)',
                border: '1px solid rgba(176,65,255,0.3)',
                color: '#b041ff',
              }}
            >
              {activeSection.section_name} · {Math.round(activeSection.score)}점
            </span>
          ) : (
            <span className="text-[9px] font-mono" style={{ color: '#4a4a65' }}>
              {formatTime(currentTime)} / {formatTime(totalTime)}
            </span>
          )}
        </div>

        {/* 웨이브폼 바 */}
        <div
          className="relative flex items-end gap-px overflow-hidden"
          style={{ height: '44px' }}
        >
          {waveformScores.map((score, i) => {
            const barPct    = (i / BAR_COUNT) * 100
            const isPast    = barPct <= progressPct
            const isLow     = score < 70
            const heightPct = Math.max(10, (score / maxScore) * 100)

            return (
              <div
                key={i}
                className="flex-1 rounded-t-[1px]"
                style={{
                  height: `${heightPct}%`,
                  background: isPast
                    ? isLow
                      ? 'rgba(239,68,68,0.80)'
                      : 'rgba(176,65,255,0.88)'
                    : 'rgba(255,255,255,0.07)',
                  boxShadow: isPast && !isLow
                    ? '0 0 2px rgba(176,65,255,0.35)'
                    : 'none',
                  transition: 'background 0.1s',
                }}
              />
            )
          })}

          {/* 재생 위치 커서 */}
          <div
            className="absolute top-0 bottom-0 w-[2px] rounded-full pointer-events-none"
            style={{
              left:       `${progressPct}%`,
              background: '#00e5ff',
              boxShadow:  '0 0 8px #00e5ff, 0 0 3px #00e5ff',
              transition: 'left 0.08s linear',
              zIndex:     10,
            }}
          />
        </div>
      </div>

      {/* ── 슬라이더 + 시간 표시 ──────────────────────────────────── */}
      <div className="px-4 pb-2 mt-1.5">
        <div className="relative h-4 flex items-center">
          {/* 트랙 배경 */}
          <div
            className="absolute rounded-full overflow-hidden"
            style={{
              inset:  '5px 0',
              background: 'rgba(255,255,255,0.08)',
            }}
          >
            {/* 진행 fill */}
            <div
              className="h-full rounded-full"
              style={{
                width:      `${progressPct}%`,
                background: 'linear-gradient(90deg, #b041ff 0%, #ff2d78 100%)',
                transition: 'width 0.08s linear',
              }}
            />
            {/* 구간 경계 마커 */}
            {sectionMarkers.map(sec => (
              <div
                key={sec.section_index}
                className="absolute top-0 bottom-0"
                style={{
                  left:       `${sec.pct}%`,
                  width:      '2px',
                  background: 'rgba(0,229,255,0.55)',
                  zIndex:     2,
                }}
              />
            ))}
          </div>

          {/* 실제 input (투명, 클릭 영역) */}
          <input
            type="range"
            min={0}
            max={Math.max(0, totalFrames - 1)}
            value={currentIndex}
            onChange={handleSliderChange}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>

        {/* 시간 표시 */}
        <div
          className="flex items-center justify-between text-[9px] font-mono mt-1"
          style={{ color: '#4a4a65' }}
        >
          <span style={{ color: '#00e5ff' }}>{formatTime(currentTime)}</span>
          <span style={{ color: '#4a4a65' }}>
            {String(currentIndex + 1).padStart(3, '0')}&nbsp;/&nbsp;{String(totalFrames).padStart(3, '0')}
          </span>
          <span>{formatTime(totalTime)}</span>
        </div>
      </div>

      {/* ── 재생 컨트롤 ──────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 pb-3 pt-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* 5프레임 뒤로 */}
        <button
          onClick={() => stepFrame(-5)}
          aria-label="5프레임 뒤로"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280', fontSize: '12px' }}
        >
          ⏮ 5
        </button>

        {/* 1프레임 뒤로 */}
        <button
          onClick={() => stepFrame(-1)}
          aria-label="1프레임 뒤로"
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280', fontSize: '11px' }}
        >
          ◀
        </button>

        {/* 재생 / 일시정지 메인 버튼 */}
        <button
          onClick={togglePlay}
          aria-label={status === 'playing' ? '일시정지' : '재생'}
          className="flex-1 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #b041ff 0%, #ff2d78 100%)',
            boxShadow:  '0 0 18px rgba(176,65,255,0.35)',
            color:      'white',
          }}
        >
          {playLabel}
        </button>

        {/* 1프레임 앞으로 */}
        <button
          onClick={() => stepFrame(1)}
          aria-label="1프레임 앞으로"
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280', fontSize: '11px' }}
        >
          ▶
        </button>

        {/* 5프레임 앞으로 */}
        <button
          onClick={() => stepFrame(5)}
          aria-label="5프레임 앞으로"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280', fontSize: '12px' }}
        >
          5 ⏭
        </button>
      </div>

      {/* ── 재생 속도 ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 pb-3 pt-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span
          className="text-[9px] font-black uppercase tracking-widest shrink-0 mr-1"
          style={{ color: '#4a4a65' }}
        >
          속도
        </span>
        {SPEED_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setReplaySpeed(s)}
            className="flex-1 py-2 rounded-xl text-[10px] font-black transition-all active:scale-95"
            style={{
              background: speed === s
                ? 'rgba(0,229,255,0.12)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${
                speed === s
                  ? 'rgba(0,229,255,0.38)'
                  : 'rgba(255,255,255,0.06)'
              }`,
              color: speed === s ? '#00e5ff' : '#4a4a65',
            }}
          >
            {s}×
          </button>
        ))}
      </div>

      {/* ── 구간 점프 버튼 ────────────────────────────────────────── */}
      {sectionScores.length > 0 && (
        <div
          className="px-4 pb-4 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <p
            className="text-[9px] font-black uppercase tracking-widest mb-2.5"
            style={{ color: '#4a4a65' }}
          >
            구간 이동
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sectionScores.map(sec => {
              const isCurrent = currentTime >= sec.start_time && currentTime < sec.end_time
              const isWeak    = sec.score < 75
              const sColor    = sectionScoreColor(sec.score)
              return (
                <button
                  key={sec.section_index}
                  onClick={() => jumpToSection(sec)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95"
                  style={{
                    background: isCurrent
                      ? 'rgba(176,65,255,0.18)'
                      : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${
                      isCurrent
                        ? 'rgba(176,65,255,0.45)'
                        : isWeak
                        ? 'rgba(239,68,68,0.22)'
                        : 'rgba(255,255,255,0.06)'
                    }`,
                    color: isCurrent ? '#b041ff' : '#6b7280',
                  }}
                >
                  {isWeak && <span style={{ fontSize: '10px' }}>⚠</span>}
                  <span>{sec.section_name}</span>
                  <span className="font-black ml-0.5" style={{ color: sColor }}>
                    {Math.round(sec.score)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
