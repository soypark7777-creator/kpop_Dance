'use client'

/**
 * components/DanceCard.tsx
 * ─────────────────────────────────────────────────────────────────
 * 안무 선택 카드 — 두 가지 variant
 *
 * variant="scroll"  → 홈 화면 수평 스크롤용 (세로 레이아웃, 고정 너비)
 * variant="grid"    → 그리드 목록용 (가로 레이아웃)
 *
 * 아티스트별 컬러 테마를 적용해 각 카드가 고유한 느낌을 줌
 * ─────────────────────────────────────────────────────────────────
 */

import type { DanceReference, DifficultyLevel } from '@/lib/types'
import { DIFFICULTY_LABEL } from '@/lib/types'

// ─── 아티스트 컬러 테마 ───────────────────────────────────────────

interface ArtistTheme {
  gradient: string   // 카드 배경 그라디언트
  accent:   string   // 포인트 색상
  glow:     string   // 글로우 그림자 색상
  emoji:    string   // 썸네일 이모지
}

const ARTIST_THEMES: Record<string, ArtistTheme> = {
  BLACKPINK: {
    gradient: 'linear-gradient(160deg, #3d0020 0%, #1a0010 60%, #0d0008 100%)',
    accent:   '#ff2d78',
    glow:     'rgba(255,45,120,0.35)',
    emoji:    '🌸',
  },
  NewJeans: {
    gradient: 'linear-gradient(160deg, #001f3d 0%, #000f1f 60%, #000810 100%)',
    accent:   '#60c8ff',
    glow:     'rgba(96,200,255,0.35)',
    emoji:    '🐰',
  },
  aespa: {
    gradient: 'linear-gradient(160deg, #1a0033 0%, #0d001a 60%, #080010 100%)',
    accent:   '#b041ff',
    glow:     'rgba(176,65,255,0.35)',
    emoji:    '🤖',
  },
  IVE: {
    gradient: 'linear-gradient(160deg, #2a1000 0%, #150800 60%, #0a0400 100%)',
    accent:   '#fb923c',
    glow:     'rgba(251,146,60,0.35)',
    emoji:    '🌟',
  },
  BTS: {
    gradient: 'linear-gradient(160deg, #120028 0%, #090014 60%, #05000a 100%)',
    accent:   '#a855f7',
    glow:     'rgba(168,85,247,0.35)',
    emoji:    '💜',
  },
}

const DEFAULT_THEME: ArtistTheme = {
  gradient: 'linear-gradient(160deg, #1a1a2e 0%, #0d0d1a 100%)',
  accent:   '#b041ff',
  glow:     'rgba(176,65,255,0.25)',
  emoji:    '🎵',
}

// ─── 난이도 스타일 ────────────────────────────────────────────────

const DIFFICULTY_STYLES: Record<DifficultyLevel, { bg: string; text: string; dot: string }> = {
  easy:   { bg: 'rgba(34,197,94,0.15)',   text: '#4ade80', dot: '#22c55e' },
  normal: { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', dot: '#3b82f6' },
  hard:   { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24', dot: '#f59e0b' },
  expert: { bg: 'rgba(239,68,68,0.15)',   text: '#f87171', dot: '#ef4444' },
}

// ─── 시간 포맷 ────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────

interface DanceCardProps {
  dance:       DanceReference
  onClick?:    (dance: DanceReference) => void
  isSelected?: boolean
  /** scroll: 홈 수평 스크롤용 | grid: 목록 그리드용 */
  variant?:    'scroll' | 'grid'
  /** 상단 우측 배지 텍스트 (예: "HOT", "NEW") */
  badge?:      string
}

export function DanceCard({
  dance,
  onClick,
  isSelected = false,
  variant = 'scroll',
  badge,
}: DanceCardProps) {
  const theme = ARTIST_THEMES[dance.artist_name] ?? DEFAULT_THEME
  const diffStyle = DIFFICULTY_STYLES[dance.difficulty]

  // ── scroll variant ─────────────────────────────────
  if (variant === 'scroll') {
    return (
      <button
        onClick={() => onClick?.(dance)}
        className="group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 focus:outline-none"
        style={{
          background: theme.gradient,
          border: `1px solid ${isSelected ? theme.accent : 'rgba(255,255,255,0.06)'}`,
          boxShadow: isSelected
            ? `0 0 24px ${theme.glow}, 0 4px 20px rgba(0,0,0,0.5)`
            : `0 4px 20px rgba(0,0,0,0.4)`,
        }}
      >
        {/* 썸네일 영역 */}
        <div className="relative aspect-[4/3] flex items-center justify-center overflow-hidden">
          {/* 배경 글로우 */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at 50% 60%, ${theme.accent} 0%, transparent 65%)`,
            }}
          />

          {/* 이모지 아이콘 */}
          <span
            className="relative z-10 text-5xl group-hover:scale-110 transition-transform duration-300"
            aria-hidden="true"
          >
            {theme.emoji}
          </span>

          {/* 상단 배지 */}
          {badge && (
            <span
              className="absolute top-2 left-2 text-xs font-black px-2 py-0.5 rounded-full z-20"
              style={{
                background: theme.accent,
                color: '#000',
                fontSize: '10px',
                letterSpacing: '0.05em',
              }}
            >
              {badge}
            </span>
          )}

          {/* 시간 배지 */}
          <span className="absolute bottom-2 right-2 z-20 text-xs bg-black/60 text-gray-300 px-2 py-0.5 rounded-md font-mono">
            {formatDuration(dance.duration_seconds)}
          </span>

          {/* 선택 체크 */}
          {isSelected && (
            <div
              className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: theme.accent }}
            >
              <span className="text-black text-xs font-black">✓</span>
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="px-3 py-2.5 space-y-1.5">
          <div>
            <p className="text-white font-bold text-sm leading-tight line-clamp-1">
              {dance.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: `${theme.accent}cc` }}>
              {dance.artist_name}
            </p>
          </div>

          {/* 난이도 */}
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
            style={{ background: diffStyle.bg }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: diffStyle.dot }}
            />
            <span className="text-xs font-semibold" style={{ color: diffStyle.text }}>
              {DIFFICULTY_LABEL[dance.difficulty]}
            </span>
          </div>
        </div>
      </button>
    )
  }

  // ── grid variant ──────────────────────────────────
  return (
    <button
      onClick={() => onClick?.(dance)}
      className="group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 focus:outline-none"
      style={{
        background: theme.gradient,
        border: `1px solid ${isSelected ? theme.accent : 'rgba(255,255,255,0.06)'}`,
        boxShadow: isSelected
          ? `0 0 20px ${theme.glow}, 0 4px 16px rgba(0,0,0,0.5)`
          : `0 2px 12px rgba(0,0,0,0.4)`,
      }}
    >
      <div className="flex items-center gap-3 p-3">
        {/* 썸네일 */}
        <div
          className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-2xl relative overflow-hidden"
          style={{
            background: `radial-gradient(circle, ${theme.accent}20 0%, transparent 70%)`,
            border: `1px solid ${theme.accent}20`,
          }}
        >
          <span>{theme.emoji}</span>
        </div>

        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{dance.title}</p>
          <p className="text-xs mt-0.5" style={{ color: `${theme.accent}bb` }}>
            {dance.artist_name}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: diffStyle.bg }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: diffStyle.dot }}
              />
              <span className="text-xs font-semibold" style={{ color: diffStyle.text }}>
                {DIFFICULTY_LABEL[dance.difficulty]}
              </span>
            </div>
            <span className="text-xs text-gray-600 font-mono">
              {formatDuration(dance.duration_seconds)}
            </span>
          </div>
        </div>

        {/* 재생 화살표 */}
        <div
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
          style={{
            background: `${theme.accent}20`,
            border: `1px solid ${theme.accent}40`,
          }}
        >
          <span className="text-sm" style={{ color: theme.accent }}>▶</span>
        </div>
      </div>
    </button>
  )
}
