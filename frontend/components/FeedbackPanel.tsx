'use client'

/**
 * components/FeedbackPanel.tsx
 * ─────────────────────────────────────────────────────────────────
 * 실시간 피드백 메시지 패널
 *
 * - perfect: 금색 글로우 + 🔥
 * - good:    청록 + 👍
 * - needs_fix: 빨강 + ⚠️ + 방향 힌트
 *
 * 디바운싱:
 * - 텍스트가 바뀔 때만 re-animate (key 변경으로 애니메이션 리셋)
 * - 67ms마다 같은 텍스트가 와도 재렌더 없이 표시 유지
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react'
import { useFeedback } from '@/store/danceStore'
import type { FeedbackLevel, FeedbackMessage } from '@/lib/types'

// ─── 레벨별 스타일 ────────────────────────────────────────────────

interface LevelStyle {
  border: string
  bg: string
  color: string
  glow: string
  icon: string
  label: string
}

const LEVEL_STYLE: Record<FeedbackLevel, LevelStyle> = {
  perfect: {
    border: 'rgba(255,215,0,0.5)',
    bg:     'rgba(255,215,0,0.12)',
    color:  '#ffd700',
    glow:   '0 0 20px rgba(255,215,0,0.4)',
    icon:   '🔥',
    label:  'PERFECT',
  },
  good: {
    border: 'rgba(0,229,255,0.4)',
    bg:     'rgba(0,229,255,0.1)',
    color:  '#00e5ff',
    glow:   '0 0 16px rgba(0,229,255,0.3)',
    icon:   '👍',
    label:  'GOOD',
  },
  needs_fix: {
    border: 'rgba(255,59,59,0.5)',
    bg:     'rgba(255,59,59,0.12)',
    color:  '#ff6b6b',
    glow:   '0 0 16px rgba(255,59,59,0.3)',
    icon:   '⚠️',
    label:  '',
  },
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────

export function FeedbackPanel() {
  const feedback = useFeedback()

  // 텍스트가 바뀔 때만 display 업데이트 (debounce)
  const [displayFeedback, setDisplayFeedback] = useState<FeedbackMessage | null>(feedback)
  const [animKey, setAnimKey] = useState(0)
  const prevTextRef = useRef<string | null>(null)

  useEffect(() => {
    if (!feedback) {
      // 피드백 없으면 짧은 딜레이 후 숨김
      const timer = setTimeout(() => setDisplayFeedback(null), 1500)
      return () => clearTimeout(timer)
    }

    // 텍스트가 바뀐 경우에만 re-animate
    if (feedback.text !== prevTextRef.current) {
      prevTextRef.current = feedback.text
      setDisplayFeedback(feedback)
      setAnimKey((k) => k + 1)
    }
  }, [feedback])

  if (!displayFeedback) return null

  const style = LEVEL_STYLE[displayFeedback.level]

  return (
    <div
      key={animKey}
      className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-md"
      style={{
        background:  style.bg,
        border:      `1px solid ${style.border}`,
        boxShadow:   style.glow,
        color:       style.color,
        animation:   'slideUp 0.3s ease-out both',
      }}
    >
      {/* 아이콘 */}
      <span className="text-base leading-none" aria-hidden="true">
        {style.icon}
      </span>

      {/* 텍스트 */}
      <span className="text-sm font-bold leading-none whitespace-nowrap">
        {style.label ? `${style.label} · ` : ''}
        {displayFeedback.text}
      </span>

      {/* perfect: 반짝이 효과 */}
      {displayFeedback.level === 'perfect' && (
        <span className="text-xs leading-none animate-pulse">✨</span>
      )}
    </div>
  )
}
