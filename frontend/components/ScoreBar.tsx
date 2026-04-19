'use client'

/**
 * components/ScoreBar.tsx
 * ─────────────────────────────────────────────────────────────────
 * 실시간 점수 표시 컴포넌트
 *
 * variant="compact" — 카메라 좌상단 오버레이용 (숫자 + 등급 레이블)
 * variant="full"    — 하단 패널용 (숫자 + 게이지 바 + 레이블)
 *
 * 점수 변화 시 score-pop 애니메이션 (animate-score-pop)
 * 90+ 점수에서 금색 글로우 효과
 * ─────────────────────────────────────────────────────────────────
 */

import { useRef, useEffect } from 'react'
import { useMatchScore } from '@/store/danceStore'
import { getScoreLabel, getScoreColor } from '@/lib/types'

interface ScoreBarProps {
  variant?: 'compact' | 'full'
}

export function ScoreBar({ variant = 'compact' }: ScoreBarProps) {
  const score = useMatchScore()
  const color = getScoreColor(score)
  const label = getScoreLabel(score)
  const prevScore = useRef(score)
  const numRef = useRef<HTMLSpanElement | null>(null)

  // 점수 변화 시 pop 애니메이션
  useEffect(() => {
    if (score !== prevScore.current && numRef.current) {
      numRef.current.style.animation = 'none'
      // force reflow
      void numRef.current.offsetHeight
      numRef.current.style.animation = 'scorePop 0.35s cubic-bezier(0.34,1.56,0.64,1) both'
      prevScore.current = score
    }
  }, [score])

  const isPerfect = score >= 90

  // ── compact (카메라 오버레이) ──────────────────────────
  if (variant === 'compact') {
    return (
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-0.5">
          SCORE
        </span>
        <span
          ref={numRef}
          className="text-3xl font-black tabular-nums leading-none"
          style={{
            color,
            textShadow: isPerfect ? `0 0 20px ${color}` : `0 0 10px ${color}60`,
          }}
        >
          {score}
        </span>
        <span
          className="text-[9px] font-black tracking-widest mt-0.5"
          style={{ color: `${color}bb` }}
        >
          {label}
        </span>
      </div>
    )
  }

  // ── full (하단 패널) ────────────────────────────────────
  return (
    <div className="w-full space-y-2">
      {/* 상단: 레이블 + 점수 숫자 */}
      <div className="flex items-end justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Match Score
        </span>
        <div className="flex items-baseline gap-1.5">
          <span
            ref={numRef}
            className="text-2xl font-black tabular-nums leading-none"
            style={{
              color,
              textShadow: isPerfect ? `0 0 16px ${color}` : `0 0 8px ${color}60`,
            }}
          >
            {score}
          </span>
          <span className="text-xs font-bold" style={{ color: `${color}99` }}>
            {label}
          </span>
        </div>
      </div>

      {/* 게이지 바 */}
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.07)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${color}60, ${color})`,
            boxShadow: isPerfect ? `0 0 10px ${color}80` : undefined,
          }}
        />
      </div>
    </div>
  )
}
