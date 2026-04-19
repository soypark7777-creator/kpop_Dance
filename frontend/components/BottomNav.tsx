'use client'

/**
 * components/BottomNav.tsx — 앱 공통 하단 내비게이션 (모바일)
 *
 * - 모든 콘텐츠 페이지(홈/리포트/리플레이/아바타)에 삽입
 * - 연습 페이지는 전체화면 카메라이므로 제외
 * - usePathname으로 활성 탭 자동 감지
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/',         icon: '🏠', label: '홈',    matchFn: (p: string) => p === '/' },
  { href: '/practice', icon: '💃', label: '연습',  matchFn: (p: string) => p.startsWith('/practice') },
  { href: '/report/mock_session_101', icon: '📊', label: '기록', matchFn: (p: string) => p.startsWith('/report') || p.startsWith('/replay') },
  { href: '/avatar',   icon: '🎭', label: '아바타', matchFn: (p: string) => p.startsWith('/avatar') },
  { href: '/auth',     icon: '🔐', label: '로그인', matchFn: (p: string) => p.startsWith('/auth') },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      aria-label="하단 내비게이션"
    >
      <div
        className="flex items-center justify-around px-1 pb-safe pt-1.5"
        style={{
          background:           'rgba(15, 10, 26, 0.97)',
          backdropFilter:       'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop:            '1px solid rgba(168, 85, 247, 0.13)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.matchFn(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-200 touch-target"
              aria-current={isActive ? 'page' : undefined}
            >
              {/* 활성 상단 인디케이터 */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #b041ff, #ff2d78)',
                    boxShadow:  '0 0 8px rgba(176, 65, 255, 0.7)',
                  }}
                  aria-hidden="true"
                />
              )}

              {/* 아이콘 */}
              <span
                className="text-xl leading-none transition-all duration-200"
                style={{
                  transform: isActive ? 'scale(1.15) translateY(-1px)' : 'scale(1)',
                  filter:    isActive ? 'drop-shadow(0 0 6px rgba(176,65,255,0.6))' : 'none',
                }}
                aria-hidden="true"
              >
                {item.icon}
              </span>

              {/* 라벨 */}
              <span
                className="font-semibold leading-none transition-colors duration-200"
                style={{
                  fontSize: '10px',
                  color:    isActive ? '#b041ff' : '#4a4a65',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
