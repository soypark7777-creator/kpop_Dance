import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 이미지 외부 도메인 허용 (백엔드 연결 시 실제 도메인으로 교체)
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/storage/**',
      },
    ],
  },
  // 환경 변수 (클라이언트에서 접근 가능)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000',
    NEXT_PUBLIC_MOCK_MODE: process.env.NEXT_PUBLIC_MOCK_MODE || 'true',
  },
}

export default nextConfig
