import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'My Avatar Dance Master',
  description: 'K-pop 안무를 배우고, AI 피드백으로 성장하고, 내 아바타가 무대에 서는 댄스 트레이닝 앱',
  keywords: ['K-pop', '댄스', '안무', '아바타', 'AI 피드백', '댄스 학습'],
  authors: [{ name: 'Avatar Dance Master Team' }],
  // PWA 기본 설정
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Dance Master',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0f',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Pretendard 웹폰트 — 빠른 로드를 위한 preconnect */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      </head>
      <body className="bg-brand-dark text-white antialiased">
        {/* 배경 그라디언트 오버레이 (전역 네온 감성) */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(176,65,255,0.12) 0%, transparent 60%),' +
              'radial-gradient(ellipse 60% 40% at 80% 100%, rgba(255,45,120,0.08) 0%, transparent 60%)',
          }}
        />
        {/* 실제 콘텐츠 */}
        <div className="relative z-10 min-h-dvh">
          {children}
        </div>
      </body>
    </html>
  )
}
