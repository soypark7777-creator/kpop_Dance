'use client'

/**
 * components/RankBadge.tsx
 * ─────────────────────────────────────────────────────────────────
 * 사용자 랭크 배지 — 세 가지 크기/variant
 *
 * size="sm"  → 작은 컬러 pill (헤더용)
 * size="md"  → 아이콘 + 텍스트 pill (카드 인라인용)
 * size="lg"  → 전체 카드 (랭크 상세, 진척도 포함)
 *
 * 랭크 순서: rookie → dancer → performer → star → legend
 * ─────────────────────────────────────────────────────────────────
 */

import type { UserRank } from '@/lib/types'

// ─── 랭크 메타데이터 ──────────────────────────────────────────────

interface RankMeta {
  label:    string
  icon:     string
  color:    string   // 포인트 색상
  bg:       string   // 배경 색상 (rgba)
  border:   string   // 테두리 색상
  glow:     string   // 글로우 그림자
  gradient: string   // 카드 그라디언트
  xpMax:    number   // 다음 랭크까지 필요 XP
  next:     UserRank | null
  nextLabel: string | null
}

const RANK_META: Record<UserRank, RankMeta> = {
  rookie: {
    label:     'Rookie',
    icon:      '🌱',
    color:     '#9ca3af',
    bg:        'rgba(156,163,175,0.12)',
    border:    'rgba(156,163,175,0.25)',
    glow:      'rgba(156,163,175,0.2)',
    gradient:  'linear-gradient(135deg, rgba(156,163,175,0.08) 0%, rgba(19,19,31,0.9) 100%)',
    xpMax:     500,
    next:      'dancer',
    nextLabel: 'Dancer',
  },
  dancer: {
    label:     'Dancer',
    icon:      '💃',
    color:     '#60a5fa',
    bg:        'rgba(96,165,250,0.12)',
    border:    'rgba(96,165,250,0.3)',
    glow:      'rgba(96,165,250,0.25)',
    gradient:  'linear-gradient(135deg, rgba(96,165,250,0.1) 0%, rgba(19,19,31,0.9) 100%)',
    xpMax:     1200,
    next:      'performer',
    nextLabel: 'Performer',
  },
  performer: {
    label:     'Performer',
    icon:      '⭐',
    color:     '#a855f7',
    bg:        'rgba(168,85,247,0.12)',
    border:    'rgba(168,85,247,0.35)',
    glow:      'rgba(168,85,247,0.3)',
    gradient:  'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(19,19,31,0.9) 100%)',
    xpMax:     2500,
    next:      'star',
    nextLabel: 'Star',
  },
  star: {
    label:     'Star',
    icon:      '🌟',
    color:     '#f59e0b',
    bg:        'rgba(245,158,11,0.12)',
    border:    'rgba(245,158,11,0.4)',
    glow:      'rgba(245,158,11,0.3)',
    gradient:  'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(19,19,31,0.9) 100%)',
    xpMax:     5000,
    next:      'legend',
    nextLabel: 'Legend',
  },
  legend: {
    label:     'Legend',
    icon:      '👑',
    color:     '#ff2d78',
    bg:        'rgba(255,45,120,0.12)',
    border:    'rgba(255,45,120,0.45)',
    glow:      'rgba(255,45,120,0.35)',
    gradient:  'linear-gradient(135deg, rgba(176,65,255,0.15) 0%, rgba(255,45,120,0.1) 50%, rgba(19,19,31,0.9) 100%)',
    xpMax:     0,   // 최고 랭크
    next:      null,
    nextLabel: null,
  },
}

/** 포인트 → 현재 랭크 내 XP 계산 (mock: 포인트를 XP로 사용) */
function calcXP(rank: UserRank, points: number): number {
  const meta = RANK_META[rank]
  if (meta.xpMax === 0) return meta.xpMax  // legend는 최대
  // 각 랭크 구간 내 포인트 비율 (0~1)로 단순화
  const rankFloors: Record<UserRank, number> = {
    rookie:    0,
    dancer:    500,
    performer: 1700,
    star:      4200,
    legend:    9200,
  }
  const floor = rankFloors[rank]
  const current = Math.max(0, points - floor)
  return Math.min(current, meta.xpMax)
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────

interface RankBadgeProps {
  rank:       UserRank
  size?:      'sm' | 'md' | 'lg'
  showLabel?: boolean
  /** lg size에서 XP 표시용 포인트 */
  points?:    number
}

export function RankBadge({
  rank,
  size = 'md',
  showLabel = true,
  points = 0,
}: RankBadgeProps) {
  const meta = RANK_META[rank]
  const isLegend = rank === 'legend'

  // ── sm: 작은 컬러 dot pill ──────────────────────────
  if (size === 'sm') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-1"
        style={{
          background: meta.bg,
          border: `1px solid ${meta.border}`,
          boxShadow: `0 0 8px ${meta.glow}`,
        }}
      >
        <span className="text-xs leading-none">{meta.icon}</span>
        {showLabel && (
          <span
            className="text-xs font-bold leading-none"
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>
        )}
      </span>
    )
  }

  // ── md: 아이콘 + 텍스트 pill ────────────────────────
  if (size === 'md') {
    return (
      <span
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-bold ${
          isLegend ? 'animate-neon-pulse' : ''
        }`}
        style={{
          background: meta.bg,
          border: `1px solid ${meta.border}`,
          boxShadow: `0 0 12px ${meta.glow}`,
          color: meta.color,
        }}
      >
        <span className="text-base leading-none">{meta.icon}</span>
        {showLabel && (
          <span className="text-sm leading-none">{meta.label}</span>
        )}
      </span>
    )
  }

  // ── lg: 카드형 (XP 진척도 포함) ─────────────────────
  const currentXP = calcXP(rank, points)
  const xpPercent = meta.xpMax > 0 ? Math.min(100, (currentXP / meta.xpMax) * 100) : 100

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: meta.gradient,
        border: `1px solid ${meta.border}`,
        boxShadow: `0 0 24px ${meta.glow}`,
      }}
    >
      {/* 배경 글로우 */}
      <div
        className="absolute -top-6 -right-6 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${meta.color}20 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />

      <div className="relative z-10">
        {/* 상단: 아이콘 + 랭크명 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className={`text-4xl ${isLegend ? 'animate-neon-pulse' : ''}`}
              role="img"
              aria-label={meta.label}
            >
              {meta.icon}
            </span>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">
                My Rank
              </p>
              <p
                className="text-2xl font-black leading-tight"
                style={{ color: meta.color }}
              >
                {meta.label}
              </p>
            </div>
          </div>

          {/* 포인트 표시 */}
          <div className="text-right">
            <p className="text-xs text-gray-500">포인트</p>
            <p className="text-lg font-black" style={{ color: meta.color }}>
              {points.toLocaleString()}
            </p>
          </div>
        </div>

        {/* XP 진척도 바 */}
        {!isLegend ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium">{meta.label}</span>
              <span className="font-bold" style={{ color: meta.color }}>
                {currentXP.toLocaleString()} / {meta.xpMax.toLocaleString()} XP
              </span>
            </div>
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${xpPercent}%`,
                  background: `linear-gradient(90deg, ${meta.color}80, ${meta.color})`,
                  boxShadow: `0 0 8px ${meta.color}60`,
                }}
              />
            </div>
            <p className="text-xs text-gray-600">
              다음 랭크{' '}
              <span className="font-semibold" style={{ color: meta.color }}>
                {meta.nextLabel}
              </span>
              까지{' '}
              <span className="font-bold text-white">
                {Math.max(0, meta.xpMax - currentXP).toLocaleString()} XP
              </span>{' '}
              남았어요
            </p>
          </div>
        ) : (
          <div className="text-center py-2">
            <p
              className="text-sm font-black animate-neon-pulse"
              style={{ color: meta.color }}
            >
              ✨ 최고 랭크 달성! ✨
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
