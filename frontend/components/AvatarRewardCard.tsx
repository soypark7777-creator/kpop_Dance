'use client'

/**
 * components/AvatarRewardCard.tsx
 * 아바타 / 무대 / 의상 선택 카드
 *
 * - locked: 자물쇠 오버레이 + 잠금 해제 조건 표시
 * - unlocked + selected: rarity 색상 글로우 링 + 체크마크
 * - legendary: 금색 파티클 효과
 * - 나중에 실제 thumbnail_url 이미지로 교체 가능한 구조
 */

import { useState } from 'react'
import type { AvatarItem } from '@/lib/types'
import { RARITY_COLOR, RARITY_LABEL } from '@/lib/types'

// ─── 타입별 아이콘 / 배경 ─────────────────────────────────────────

const TYPE_CONFIG = {
  avatar: {
    icons:  ['🧑‍🎤', '💃', '🕺', '👤'],
    label:  'AVATAR',
    bg:     'rgba(176,65,255,0.12)',
  },
  stage: {
    icons:  ['🎭', '🌌', '🚀', '🌠'],
    label:  'STAGE',
    bg:     'rgba(0,229,255,0.1)',
  },
  costume: {
    icons:  ['👗', '🥻', '💎', '✨'],
    label:  'COSTUME',
    bg:     'rgba(255,215,0,0.1)',
  },
} as const

// 아이템 ID의 마지막 숫자로 아이콘 선택 (같은 이모지 반복 방지)
function getTypeIcon(item: AvatarItem): string {
  const cfg = TYPE_CONFIG[item.type]
  const idx = parseInt(item.id.replace(/\D/g, '').slice(-1) || '0', 10) % cfg.icons.length
  return cfg.icons[idx]
}

// ─── Rarity 파티클 (legendary 전용) ──────────────────────────────

function LegendaryParticles() {
  const positions = [
    { top: '10%', left: '15%', delay: '0s' },
    { top: '20%', right: '10%', delay: '0.4s' },
    { top: '70%', left: '8%', delay: '0.8s' },
    { top: '80%', right: '12%', delay: '0.2s' },
    { top: '45%', left: '5%', delay: '1.0s' },
    { top: '50%', right: '5%', delay: '0.6s' },
  ]

  return (
    <>
      {positions.map((pos, i) => (
        <span
          key={i}
          className="absolute text-[8px] pointer-events-none animate-pulse"
          style={{
            ...pos,
            animationDelay: pos.delay,
            filter: 'drop-shadow(0 0 4px #ffd700)',
          }}
        >
          ✦
        </span>
      ))}
    </>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────

interface AvatarRewardCardProps {
  item: AvatarItem
  isSelected?: boolean
  onSelect?: (item: AvatarItem) => void
  /** 카드 크기 (그리드에 맞게 조정) */
  size?: 'sm' | 'md'
}

export function AvatarRewardCard({
  item,
  isSelected = false,
  onSelect,
  size = 'md',
}: AvatarRewardCardProps) {
  const [pressed, setPressed] = useState(false)

  const rarityColor = RARITY_COLOR[item.rarity]
  const rarityLabel = RARITY_LABEL[item.rarity]
  const typeIcon = getTypeIcon(item)
  const typeCfg = TYPE_CONFIG[item.type]
  const isLegendary = item.rarity === 'legendary'
  const isEpic = item.rarity === 'epic'

  function handleClick() {
    if (!item.is_locked && onSelect) {
      onSelect(item)
    }
  }

  const isSm = size === 'sm'

  return (
    <button
      onClick={handleClick}
      onPointerDown={() => !item.is_locked && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      disabled={item.is_locked}
      className="relative flex flex-col rounded-xl overflow-hidden transition-all duration-200 touch-target"
      style={{
        width: isSm ? '90px' : '110px',
        flexShrink: 0,
        background: '#13131f',
        border: `1.5px solid ${
          isSelected
            ? rarityColor
            : item.is_locked
              ? 'rgba(255,255,255,0.06)'
              : `${rarityColor}44`
        }`,
        boxShadow: isSelected
          ? `0 0 16px ${rarityColor}55, 0 0 40px ${rarityColor}22`
          : 'none',
        transform: pressed ? 'scale(0.94)' : 'scale(1)',
        cursor: item.is_locked ? 'not-allowed' : 'pointer',
        opacity: item.is_locked ? 0.55 : 1,
      }}
      aria-label={item.name}
      aria-pressed={isSelected}
    >
      {/* ── 썸네일 영역 ─────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          aspectRatio: '1 / 1',
          background: item.is_locked
            ? 'rgba(255,255,255,0.03)'
            : isSelected
              ? `linear-gradient(135deg, ${rarityColor}22, ${typeCfg.bg})`
              : `linear-gradient(135deg, rgba(255,255,255,0.04), ${typeCfg.bg})`,
        }}
      >
        {/* Legendary 파티클 */}
        {isLegendary && !item.is_locked && <LegendaryParticles />}

        {/* Epic 배경 글로우 */}
        {isEpic && !item.is_locked && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background: `radial-gradient(ellipse at center, ${rarityColor}18 0%, transparent 70%)`,
            }}
          />
        )}

        {/* 메인 아이콘 */}
        <span
          className="relative"
          style={{
            fontSize: isSm ? '1.75rem' : '2.25rem',
            filter: item.is_locked
              ? 'grayscale(1) brightness(0.4)'
              : isSelected && isLegendary
                ? 'drop-shadow(0 0 8px #ffd700)'
                : isSelected
                  ? `drop-shadow(0 0 6px ${rarityColor})`
                  : 'none',
          }}
        >
          {typeIcon}
        </span>

        {/* 잠금 오버레이 */}
        {item.is_locked && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
          >
            <span className="text-lg">🔒</span>
            {item.required_score && (
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-center leading-tight"
                style={{ background: 'rgba(255,59,59,0.25)', color: '#ff6b6b' }}
              >
                {item.required_score}점↑
              </span>
            )}
            {item.required_points && (
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full leading-tight"
                style={{ background: 'rgba(255,215,0,0.2)', color: '#ffd700' }}
              >
                {item.required_points.toLocaleString()}P
              </span>
            )}
          </div>
        )}

        {/* 선택 체크마크 */}
        {isSelected && !item.is_locked && (
          <div
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
            style={{
              background: rarityColor,
              boxShadow: `0 0 8px ${rarityColor}`,
            }}
          >
            ✓
          </div>
        )}

        {/* Rarity 배지 (좌상단) */}
        {!item.is_locked && (
          <div
            className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded text-[8px] font-black leading-none"
            style={{
              background: `${rarityColor}22`,
              border: `1px solid ${rarityColor}55`,
              color: rarityColor,
            }}
          >
            {rarityLabel.toUpperCase()}
          </div>
        )}
      </div>

      {/* ── 정보 영역 ────────────────────────────────────── */}
      <div
        className="px-2 py-2"
        style={{ background: '#0e0e1a' }}
      >
        <p
          className="font-black leading-tight text-center"
          style={{
            fontSize: isSm ? '0.6rem' : '0.65rem',
            color: item.is_locked ? '#4b5563' : isSelected ? rarityColor : '#e5e7eb',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.name}
        </p>
        {/* Legendary: 골드 라인 */}
        {isLegendary && !item.is_locked && (
          <div
            className="mt-1 h-0.5 rounded-full mx-auto w-8"
            style={{
              background: 'linear-gradient(90deg, transparent, #ffd700, transparent)',
            }}
          />
        )}
      </div>
    </button>
  )
}
