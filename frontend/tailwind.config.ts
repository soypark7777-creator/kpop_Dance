import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 브랜드 컬러 — K-pop 네온 감성
        brand: {
          purple: '#b041ff',
          pink:   '#ff2d78',
          cyan:   '#00e5ff',
          gold:   '#ffd700',
          dark:   '#0a0a0f',
          card:   '#13131f',
          border: '#2a2a3f',
        },
        // 상태 컬러
        joint: {
          correct: '#00e5ff',  // 청록 — 정확한 관절
          wrong:   '#ff3b3b',  // 빨강 — 틀린 관절
          ghost:   '#7b5cff',  // 보라 — 기준 안무 ghost
          missing: '#666680',  // 회색 — 감지 안 됨
        },
        // 점수 컬러
        score: {
          perfect: '#ffd700', // 90+
          great:   '#b041ff', // 75-89
          good:    '#00e5ff', // 60-74
          needs:   '#ff3b3b', // 60미만
        },
        // 희귀도
        rarity: {
          common:    '#9ca3af',
          rare:      '#3b82f6',
          epic:      '#a855f7',
          legendary: '#f59e0b',
        },
      },
      backgroundImage: {
        'gradient-brand':  'linear-gradient(135deg, #b041ff 0%, #ff2d78 100%)',
        'gradient-dark':   'linear-gradient(180deg, #0a0a0f 0%, #13131f 100%)',
        'gradient-score':  'linear-gradient(90deg, #ff2d78 0%, #b041ff 50%, #00e5ff 100%)',
        'gradient-gold':   'linear-gradient(135deg, #ffd700 0%, #ff9500 100%)',
      },
      fontFamily: {
        sans: ['Pretendard', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'score-pop':      'scorePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'neon-pulse':     'neonPulse 2s ease-in-out infinite',
        'slide-up':       'slideUp 0.3s ease-out',
        'fade-in':        'fadeIn 0.4s ease-out',
        'shake':          'shake 0.4s ease-in-out',
        'unlock-reveal':  'unlockReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'streak-bounce':  'streakBounce 0.6s ease-in-out',
      },
      keyframes: {
        scorePop: {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        neonPulse: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 8px currentColor' },
          '50%':      { opacity: '0.7', boxShadow: '0 0 24px currentColor' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%':      { transform: 'translateX(-4px)' },
          '75%':      { transform: 'translateX(4px)' },
        },
        unlockReveal: {
          '0%':   { transform: 'scale(0.5) rotate(-10deg)', opacity: '0' },
          '60%':  { transform: 'scale(1.1) rotate(2deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        streakBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '40%':      { transform: 'translateY(-8px)' },
          '60%':      { transform: 'translateY(-4px)' },
        },
      },
      boxShadow: {
        'neon-purple': '0 0 16px rgba(176, 65, 255, 0.6)',
        'neon-pink':   '0 0 16px rgba(255, 45, 120, 0.6)',
        'neon-cyan':   '0 0 16px rgba(0, 229, 255, 0.6)',
        'neon-wrong':  '0 0 12px rgba(255, 59, 59, 0.8)',
        'card':        '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}

export default config
