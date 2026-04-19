'use client'

/**
 * components/SectionScoreChart.tsx
 * 구간별 점수 시각화 — 순수 CSS 기반 bar chart
 *
 * - 외부 라이브러리 없음 (recharts/D3 교체 가능 구조로 설계)
 * - mount 시 바 애니메이션
 * - 최고 구간: 금색 글로우
 * - 최저 구간: 빨간 강조 + 집중 배지
 * - hover 시 점수 tooltip
 */

import { useEffect, useState } from 'react'
import type { SectionScore } from '@/lib/types'
import { getScoreColor } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────

interface SectionScoreChartProps {
  sections: SectionScore[]
  weakestSectionIndex?: number
  bestSectionIndex?: number
}

// ─── 내부: 단일 바 ────────────────────────────────────────────────

interface BarProps {
  section: SectionScore
  isWeakest: boolean
  isBest: boolean
  animated: boolean
  maxScore: number
}

function ScoreBar({ section, isWeakest, isBest, animated, maxScore }: BarProps) {
  const color = getScoreColor(section.score)
  const pct = (section.score / maxScore) * 100

  const barColor = isWeakest
    ? 'linear-gradient(90deg, #ff3b3b60, #ff3b3b)'
    : isBest
      ? 'linear-gradient(90deg, #ffd70060, #ffd700)'
      : `linear-gradient(90deg, ${color}55, ${color})`

  const glowColor = isWeakest
    ? '0 0 10px rgba(255,59,59,0.5)'
    : isBest
      ? '0 0 12px rgba(255,215,0,0.5)'
      : 'none'

  const labelColor = isWeakest ? '#ff6b6b' : isBest ? '#ffd700' : '#d1d5db'

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="group relative">
      {/* 레이블 행 */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {/* 배지 */}
          {(isWeakest || isBest) && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none"
              style={{
                background: isWeakest ? 'rgba(255,59,59,0.18)' : 'rgba(255,215,0,0.15)',
                border: `1px solid ${isWeakest ? 'rgba(255,59,59,0.4)' : 'rgba(255,215,0,0.4)'}`,
                color: isWeakest ? '#ff6b6b' : '#ffd700',
              }}
            >
              {isWeakest ? '⚠ 집중' : '★ BEST'}
            </span>
          )}
          <span
            className="text-xs font-semibold"
            style={{ color: labelColor }}
          >
            {section.section_name}
          </span>
          <span className="text-[10px] text-gray-600">
            {formatTime(section.start_time)}–{formatTime(section.end_time)}
          </span>
        </div>

        {/* 점수 숫자 */}
        <span
          className="text-sm font-black tabular-nums"
          style={{
            color,
            textShadow: isBest
              ? '0 0 10px rgba(255,215,0,0.6)'
              : isWeakest
                ? '0 0 8px rgba(255,59,59,0.5)'
                : 'none',
          }}
        >
          {Math.round(section.score)}
        </span>
      </div>

      {/* 바 트랙 */}
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: animated ? `${pct}%` : '0%',
            background: barColor,
            boxShadow: glowColor,
            transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>

      {/* hover tooltip */}
      <div
        className="absolute right-0 -top-7 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: 'rgba(13,13,26,0.95)',
          border: `1px solid ${color}44`,
          borderRadius: '0.5rem',
          padding: '0.2rem 0.6rem',
          color,
          fontSize: '0.7rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}
      >
        {Math.round(section.score)}점
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────

export function SectionScoreChart({
  sections,
  weakestSectionIndex,
  bestSectionIndex,
}: SectionScoreChartProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  if (sections.length === 0) return null

  const maxScore = 100

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <ScoreBar
          key={section.section_index}
          section={section}
          isWeakest={section.section_index === weakestSectionIndex}
          isBest={section.section_index === bestSectionIndex}
          animated={animated}
          maxScore={maxScore}
        />
      ))}
    </div>
  )
}
