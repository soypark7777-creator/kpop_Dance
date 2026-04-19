'use client'

/**
 * app/practice/page.tsx — 연습 핵심 페이지
 *
 * 화면 흐름:
 *   selecting → ready → countdown → recording → paused → ended → /report/[id]
 *
 * 쿼리 파라미터 ?danceId=N 으로 안무를 바로 선택할 수 있음
 * 없으면 안무 선택 화면을 먼저 표시
 */

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

import { useLiveDanceSession } from '@/hooks/useLiveDanceSession'
import { useDanceStore, usePracticeStatus, useWsConnectionStatus } from '@/store/danceStore'
import { CameraStage } from '@/components/CameraStage'
import { SkeletonOverlay } from '@/components/SkeletonOverlay'
import { GhostGuideOverlay } from '@/components/GhostGuideOverlay'
import { FeedbackPanel } from '@/components/FeedbackPanel'
import { ScoreBar } from '@/components/ScoreBar'
import { ErrorJointBadge } from '@/components/ErrorJointBadge'
import { MobileBottomControls } from '@/components/MobileBottomControls'
import { MOCK_DANCE_REFERENCES } from '@/lib/mock'
import type { DanceReference } from '@/lib/types'
import { DIFFICULTY_LABEL, DIFFICULTY_COLOR } from '@/lib/types'

// ════════════════════════════════════════════════════
// 안무 선택 화면
// ════════════════════════════════════════════════════

interface DanceSelectProps {
  onSelect: (dance: DanceReference) => void
}

function DanceSelectScreen({ onSelect }: DanceSelectProps) {
  const DIFFICULTY_ICON: Record<string, string> = {
    easy: '🟢', normal: '🟡', hard: '🟠', expert: '🔴',
  }
  const ARTIST_COLORS: Record<string, string> = {
    BLACKPINK: '#ff2d78',
    NewJeans: '#00e5ff',
    aespa: '#b041ff',
    IVE: '#22c55e',
    BTS: '#f59e0b',
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <main
      className="min-h-dvh flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0d1a 100%)' }}
    >
      {/* 헤더 */}
      <div className="px-5 pt-14 pb-6">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-gray-500 text-sm mb-5 hover:text-gray-300 transition-colors"
        >
          ← 홈
        </a>
        <p className="text-brand-cyan text-xs font-bold uppercase tracking-widest mb-1">
          Practice Studio
        </p>
        <h1 className="text-2xl font-black text-white">
          오늘 뭐 연습할까요?
        </h1>
        <p className="text-gray-500 text-sm mt-1">안무를 선택하면 바로 시작해요</p>
      </div>

      {/* 안무 카드 목록 */}
      <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-3">
        {MOCK_DANCE_REFERENCES.map((dance) => {
          const accentColor = ARTIST_COLORS[dance.artist_name] ?? '#b041ff'
          const diffColor = DIFFICULTY_COLOR[dance.difficulty]
          return (
            <button
              key={dance.id}
              onClick={() => onSelect(dance)}
              className="w-full text-left rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
              style={{
                background: '#13131f',
                border: `1px solid rgba(255,255,255,0.06)`,
              }}
            >
              <div className="flex items-center gap-4 px-4 py-4">
                {/* 썸네일 자리 */}
                <div
                  className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-2xl font-black"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)`,
                    border: `1px solid ${accentColor}33`,
                    color: accentColor,
                  }}
                >
                  {dance.title.slice(0, 1)}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-base font-black text-white truncate">{dance.title}</span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: accentColor }}>
                    {dance.artist_name}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${diffColor}18`,
                        color: diffColor,
                        border: `1px solid ${diffColor}44`,
                      }}
                    >
                      {DIFFICULTY_ICON[dance.difficulty]} {DIFFICULTY_LABEL[dance.difficulty]}
                    </span>
                    <span className="text-[10px] text-gray-600">
                      {formatDuration(dance.duration_seconds)}
                    </span>
                  </div>
                </div>

                {/* 화살표 */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${accentColor}18`, color: accentColor }}
                >
                  ▶
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </main>
  )
}

// ════════════════════════════════════════════════════
// 카운트다운 오버레이
// ════════════════════════════════════════════════════

function CountdownOverlay({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
      {/* 블러 배경 */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(10,10,15,0.6)', backdropFilter: 'blur(4px)' }}
      />
      {/* 숫자 */}
      <div className="relative flex flex-col items-center gap-3">
        <p className="text-white/60 text-sm font-bold tracking-widest uppercase">
          준비하세요
        </p>
        <span
          key={count}
          className="text-9xl font-black leading-none"
          style={{
            background: 'linear-gradient(135deg, #b041ff, #ff2d78)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
            filter: 'drop-shadow(0 0 30px rgba(176,65,255,0.8))',
            animation: 'countPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          {count}
        </span>
        <p className="text-gray-400 text-sm">
          카메라를 향해 서 주세요
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// 일시정지 오버레이
// ════════════════════════════════════════════════════

function PausedOverlay({ onResume, onEnd }: { onResume: () => void; onEnd: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-40">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(10,10,15,0.75)', backdropFilter: 'blur(8px)' }}
      />
      <div className="relative flex flex-col items-center gap-5 px-8 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ background: 'rgba(176,65,255,0.2)', border: '2px solid rgba(176,65,255,0.5)' }}
        >
          ⏸
        </div>
        <div>
          <p className="text-white font-black text-2xl">일시 정지</p>
          <p className="text-gray-500 text-sm mt-1">준비가 되면 다시 시작해요</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={onResume}
            className="btn-primary w-full py-3 text-base font-black"
          >
            ▶ 계속하기
          </button>
          <button
            onClick={onEnd}
            className="btn-ghost w-full py-3 text-sm"
          >
            연습 종료하기
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// WS 연결 상태 인디케이터
// ════════════════════════════════════════════════════

function ConnectionDot() {
  const status = useWsConnectionStatus()
  const config: Record<string, { color: string; label: string; pulse: boolean }> = {
    connected:    { color: '#22c55e', label: 'LIVE', pulse: true },
    connecting:   { color: '#f59e0b', label: 'CONNECTING', pulse: true },
    disconnected: { color: '#6b7280', label: 'OFF', pulse: false },
    error:        { color: '#ef4444', label: 'ERROR', pulse: false },
  }
  const c = config[status] ?? config.disconnected

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full ${c.pulse ? 'animate-pulse' : ''}`}
        style={{ background: c.color, boxShadow: c.pulse ? `0 0 6px ${c.color}` : 'none' }}
      />
      <span className="text-[10px] font-black tracking-widest" style={{ color: c.color }}>
        {c.label}
      </span>
    </div>
  )
}

// ════════════════════════════════════════════════════
// 구간 정보 HUD
// ════════════════════════════════════════════════════

const SECTION_NAMES = ['인트로', '1절', '후렴 1', '2절', '후렴 2', '아웃트로']

function SectionHud() {
  const sectionIndex = useDanceStore((s) => s.currentSectionIndex)
  const name = SECTION_NAMES[sectionIndex] ?? `구간 ${sectionIndex + 1}`
  const total = SECTION_NAMES.length

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
        SECTION
      </span>
      <span className="text-sm font-black text-white">{name}</span>
      {/* 미니 진행 바 */}
      <div className="flex gap-0.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className="h-1 w-4 rounded-full transition-all duration-300"
            style={{
              background:
                i < sectionIndex
                  ? 'rgba(176,65,255,0.8)'
                  : i === sectionIndex
                    ? 'linear-gradient(90deg,#b041ff,#ff2d78)'
                    : 'rgba(255,255,255,0.1)',
              boxShadow: i === sectionIndex ? '0 0 6px rgba(176,65,255,0.8)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// 상태 배지 (Perfect / Good / Needs Fix)
// ════════════════════════════════════════════════════

function StatusBadge() {
  const score = useDanceStore((s) => s.matchScore)

  let label: string
  let color: string
  let bg: string
  let border: string

  if (score >= 90) {
    label = '✨ PERFECT'; color = '#ffd700'; bg = 'rgba(255,215,0,0.12)'; border = 'rgba(255,215,0,0.4)'
  } else if (score >= 70) {
    label = '👍 GOOD'; color = '#00e5ff'; bg = 'rgba(0,229,255,0.1)'; border = 'rgba(0,229,255,0.35)'
  } else {
    label = '⚠ NEEDS FIX'; color = '#ff6b6b'; bg = 'rgba(255,59,59,0.12)'; border = 'rgba(255,59,59,0.4)'
  }

  return (
    <div
      className="px-3 py-1 rounded-full text-xs font-black tracking-wide"
      style={{ background: bg, border: `1px solid ${border}`, color }}
    >
      {label}
    </div>
  )
}

// ════════════════════════════════════════════════════
// Ghost 투명도 슬라이더 패널
// ════════════════════════════════════════════════════

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { ghostOpacity, setGhostOpacity, showGhostGuide } = useDanceStore()

  return (
    <div
      className="absolute bottom-28 left-4 right-4 z-50 rounded-2xl p-4"
      style={{
        background: 'rgba(13,13,26,0.95)',
        border: '1px solid rgba(176,65,255,0.25)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-black text-white">설정</p>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-gray-800 text-gray-400 text-xs flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      {/* Ghost 투명도 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs text-gray-400 font-semibold">가이드 투명도</label>
          <span
            className="text-xs font-black"
            style={{ color: showGhostGuide ? '#b041ff' : '#4b5563' }}
          >
            {showGhostGuide ? `${Math.round(ghostOpacity * 100)}%` : 'OFF'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={ghostOpacity}
          onChange={(e) => setGhostOpacity(parseFloat(e.target.value))}
          disabled={!showGhostGuide}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-30"
          style={{
            background: `linear-gradient(90deg, #b041ff ${ghostOpacity * 100}%, rgba(255,255,255,0.1) ${ghostOpacity * 100}%)`,
          }}
        />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// 연습 화면 (핵심)
// ════════════════════════════════════════════════════

interface PracticeScreenProps {
  dance: DanceReference
  onExit: () => void
}

function PracticeScreen({ dance, onExit }: PracticeScreenProps) {
  const session = useLiveDanceSession()
  const practiceStatus = usePracticeStatus()
  const { showSkeleton, showGhostGuide, isMirrorMode } = useDanceStore()

  const [showSettings, setShowSettings] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  // 페이지 마운트 시 카메라 요청
  useEffect(() => {
    session.requestCamera()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStart = useCallback(async () => {
    setHasStarted(true)
    await session.startSession(dance.id)
  }, [session, dance.id])

  const handlePause = useCallback(() => {
    session.pauseSession()
    setShowSettings(false)
  }, [session])

  const handleResume = useCallback(() => {
    session.resumeSession()
  }, [session])

  const handleEnd = useCallback(async () => {
    setShowSettings(false)
    await session.endSession()
  }, [session])

  const isRecording = practiceStatus === 'recording'
  const isPaused = practiceStatus === 'paused'
  const isCountdown = practiceStatus === 'countdown'
  const isActive = isRecording || isPaused || isCountdown

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: '#0a0a0f' }}
    >
      {/* ── 카메라 영역 (화면 대부분 차지) ────────────── */}
      <div className="relative flex-1 overflow-hidden">
        <CameraStage
          videoRef={session.videoRef}
          isReady={session.cameraState.isReady}
          error={session.cameraState.error}
          mirror={isMirrorMode}
          isRecording={isRecording}
        >
          {/* Ghost Guide Overlay (기준 안무) */}
          {showGhostGuide && <GhostGuideOverlay mirror={isMirrorMode} />}

          {/* Skeleton Overlay (사용자 포즈) */}
          {showSkeleton && <SkeletonOverlay mirror={isMirrorMode} />}

          {/* ── HUD 레이어 ────────────────────────────── */}
          <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 pb-3">
            {/* 상단 HUD */}
            <div className="flex items-start justify-between">
              {/* 좌측: 연결 상태 + 뒤로가기 */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={isActive ? handlePause : onExit}
                  className="pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center text-sm"
                  style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                  aria-label="뒤로 가기"
                >
                  ←
                </button>
                <ConnectionDot />
              </div>

              {/* 중앙: 안무 정보 */}
              <div className="flex flex-col items-center gap-1 pointer-events-none">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  {dance.artist_name}
                </span>
                <span className="text-sm font-black text-white">{dance.title}</span>
                {isActive && <StatusBadge />}
              </div>

              {/* 우측: 점수 */}
              <div
                className="rounded-xl px-3 py-2"
                style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <ScoreBar variant="compact" />
              </div>
            </div>

            {/* 중단: 피드백 패널 (화면 중앙) */}
            {isRecording && (
              <div className="flex justify-center">
                <FeedbackPanel />
              </div>
            )}

            {/* 하단 HUD (컨트롤 위) */}
            <div className="flex items-end justify-between">
              {/* 좌측: 에러 관절 배지 */}
              <div className="flex flex-col gap-1 items-start">
                <ErrorJointBadge />
              </div>

              {/* 우측: 구간 정보 */}
              {isActive && (
                <SectionHud />
              )}
            </div>
          </div>

          {/* ── 카운트다운 오버레이 ──────────────────── */}
          {isCountdown && session.countdown !== null && (
            <CountdownOverlay count={session.countdown} />
          )}

          {/* ── 일시정지 오버레이 ────────────────────── */}
          {isPaused && (
            <PausedOverlay onResume={handleResume} onEnd={handleEnd} />
          )}

          {/* ── 시작 전 안내 (카메라 준비됐지만 아직 시작 안 한 경우) ── */}
          {!hasStarted && session.cameraState.isReady && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-end pb-36 pointer-events-none">
              <div
                className="mx-auto px-5 py-4 rounded-2xl text-center max-w-xs"
                style={{ background: 'rgba(13,13,26,0.85)', border: '1px solid rgba(176,65,255,0.25)' }}
              >
                <p className="text-xs text-gray-400 mb-1">카메라 준비 완료</p>
                <p className="text-sm font-bold text-white">
                  화면 안에 전신이 들어오게 서주세요
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  아래 ▶ 버튼을 눌러 시작해요
                </p>
              </div>
            </div>
          )}
        </CameraStage>

        {/* 설정 패널 */}
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
      </div>

      {/* ── 하단 컨트롤 ──────────────────────────────── */}
      <div className="shrink-0">
        <MobileBottomControls
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onEnd={handleEnd}
          onSettings={() => setShowSettings((v) => !v)}
          settingsOpen={showSettings}
        />
      </div>

      {/* 세션 에러 토스트 */}
      {session.sessionError && (
        <div
          className="fixed bottom-36 left-4 right-4 z-50 px-4 py-3 rounded-xl text-sm text-center font-semibold text-red-200"
          style={{ background: 'rgba(255,59,59,0.2)', border: '1px solid rgba(255,59,59,0.4)' }}
        >
          {session.sessionError}
          <button
            onClick={session.clearSessionError}
            className="ml-3 text-xs text-red-400 underline"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════
// 메인 페이지 (내부 — Suspense 필요)
// ════════════════════════════════════════════════════

function PracticePageInner() {
  const searchParams = useSearchParams()
  const danceIdParam = searchParams.get('danceId')

  const { setSelectedDance, selectedDance } = useDanceStore()

  // URL 파라미터로 안무 미리 선택
  useEffect(() => {
    if (danceIdParam) {
      const id = parseInt(danceIdParam, 10)
      const found = MOCK_DANCE_REFERENCES.find((d) => d.id === id)
      if (found && (!selectedDance || selectedDance.id !== found.id)) {
        setSelectedDance(found)
      }
    }
  }, [danceIdParam, setSelectedDance, selectedDance])

  const handleSelectDance = useCallback(
    (dance: DanceReference) => {
      setSelectedDance(dance)
    },
    [setSelectedDance]
  )

  const handleExit = useCallback(() => {
    setSelectedDance(null)
  }, [setSelectedDance])

  if (!selectedDance) {
    return <DanceSelectScreen onSelect={handleSelectDance} />
  }

  return <PracticeScreen dance={selectedDance} onExit={handleExit} />
}

// ════════════════════════════════════════════════════
// 외부 export (Suspense 래핑 — useSearchParams 필요)
// ════════════════════════════════════════════════════

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-black flex items-center justify-center">
          <div className="text-center space-y-3">
            <div
              className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto"
              style={{ borderColor: 'rgba(176,65,255,0.5)', borderTopColor: 'transparent' }}
            />
            <p className="text-gray-500 text-sm">불러오는 중...</p>
          </div>
        </div>
      }
    >
      <PracticePageInner />
    </Suspense>
  )
}
