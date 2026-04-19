'use client'

/**
 * components/MobileBottomControls.tsx
 * practice 페이지 하단 고정 컨트롤 바
 * 시작 / 일시정지 / 종료 + 설정 토글들
 */

import { usePracticeStatus, useDanceStore } from '@/store/danceStore'

interface MobileBottomControlsProps {
  onStart?:    () => void
  onPause?:    () => void
  onResume?:   () => void
  onEnd?:      () => void
  onSettings?: () => void
  settingsOpen?: boolean
}

export function MobileBottomControls({
  onStart,
  onPause,
  onResume,
  onEnd,
  onSettings,
  settingsOpen = false,
}: MobileBottomControlsProps) {
  const status = useDanceStore((s) => s.practiceStatus)
  const {
    toggleMirrorMode,
    toggleSkeleton,
    toggleGhostGuide,
    isMirrorMode,
    showSkeleton,
    showGhostGuide,
  } = useDanceStore()

  const isActive = status === 'recording' || status === 'paused'

  // ── 토글 버튼 스타일 ────────────────────────────────────────────
  function toggleStyle(active: boolean, activeColor: string) {
    return {
      background: active ? `${activeColor}18` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? activeColor + '55' : 'rgba(255,255,255,0.08)'}`,
      color: active ? activeColor : '#6b7280',
      borderRadius: '0.625rem',
      padding: '0.375rem 0.75rem',
      fontSize: '0.7rem',
      fontWeight: 700,
      transition: 'all 0.15s',
      minHeight: '36px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      whiteSpace: 'nowrap' as const,
    }
  }

  return (
    <div
      className="pb-safe"
      style={{
        background: 'rgba(10,10,15,0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="px-4 pt-3 pb-1">
        {/* ── 설정 토글 행 ─────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* 왼쪽: Mirror / Skeleton / Ghost */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
            <button onClick={toggleMirrorMode} style={toggleStyle(isMirrorMode, '#b041ff')}>
              <span>↔</span> 미러
            </button>
            <button onClick={toggleSkeleton} style={toggleStyle(showSkeleton, '#00e5ff')}>
              <span>🦴</span> 스켈레톤
            </button>
            <button onClick={toggleGhostGuide} style={toggleStyle(showGhostGuide, '#a855f7')}>
              <span>👻</span> 가이드
            </button>
          </div>

          {/* 오른쪽: 설정 버튼 */}
          {onSettings && (
            <button
              onClick={onSettings}
              style={{
                background: settingsOpen ? 'rgba(176,65,255,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${settingsOpen ? 'rgba(176,65,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: settingsOpen ? '#b041ff' : '#6b7280',
                borderRadius: '0.625rem',
                padding: '0.375rem 0.625rem',
                fontSize: '1rem',
                minHeight: '36px',
                minWidth: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="설정"
            >
              ⚙️
            </button>
          )}
        </div>

        {/* ── 메인 컨트롤 행 ───────────────────────────── */}
        <div className="flex items-center justify-center gap-5 pb-2">
          {/* 종료 버튼 (활성 중에만) */}
          {isActive && (
            <button
              onClick={onEnd}
              className="touch-target w-12 h-12 rounded-full flex items-center justify-center transition-colors"
              style={{
                background: 'rgba(255,59,59,0.1)',
                border: '1.5px solid rgba(255,59,59,0.35)',
                color: '#ff6b6b',
                fontSize: '1.1rem',
              }}
              aria-label="종료"
            >
              ■
            </button>
          )}

          {/* 메인 버튼 */}
          <button
            onClick={
              status === 'idle' || status === 'ready'   ? onStart  :
              status === 'recording'                    ? onPause  :
              status === 'paused'                       ? onResume :
              undefined
            }
            disabled={status === 'countdown' || status === 'ended'}
            className="touch-target w-16 h-16 rounded-full flex items-center justify-center text-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #b041ff, #ff2d78)',
              boxShadow: '0 0 24px rgba(176,65,255,0.5), 0 0 60px rgba(176,65,255,0.2)',
            }}
            aria-label={
              status === 'idle' || status === 'ready'   ? '시작' :
              status === 'recording'                    ? '일시정지' :
              status === 'paused'                       ? '계속' :
              status === 'countdown'                    ? '카운트다운' :
              '완료'
            }
          >
            {status === 'idle' || status === 'ready'   ? '▶' :
             status === 'recording'                    ? '⏸' :
             status === 'paused'                       ? '▶' :
             status === 'countdown'                    ? '⏳' :
             '✓'}
          </button>

          {/* 빈 공간 (종료버튼 있을 때 균형 맞춤) */}
          {isActive && <div className="w-12 h-12" />}
        </div>
      </div>
    </div>
  )
}
