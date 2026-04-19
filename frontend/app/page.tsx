'use client'

/**
 * app/page.tsx — 홈 / 랜딩 페이지
 * ─────────────────────────────────────────────────────────────────
 * My Avatar Dance Master 메인 홈 화면
 *
 * 섹션 구성:
 *  1. 상단 헤더 (sticky) — 로고 + 유저 정보
 *  2. Hero — 슬로건 + 오늘 연습 CTA
 *  3. Quick Stats — 최고 점수 / 연속 연습 / 포인트
 *  4. Streak + 최근 점수 — 2열 카드
 *  5. 추천 안무 — 수평 스크롤 카드 목록
 *  6. 아바타 진척도 — 잠금 해제 조건 시각화
 *  7. 랭크 카드 — 현재 랭크 + XP 진척도
 *  8. Bottom Navigation — 모바일 고정 하단
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

import type { User, DanceReference, PracticeSession } from '@/lib/types'
import { getScoreColor, getScoreLabel } from '@/lib/types'

import { api, getStoredAccessToken } from '@/lib/api'
import { DanceCard }  from '@/components/DanceCard'
import { StreakCard } from '@/components/StreakCard'
import { RankBadge }  from '@/components/RankBadge'
import { BottomNav }  from '@/components/BottomNav'

// ════════════════════════════════════════════════════════
// 내부 서브 컴포넌트들
// ════════════════════════════════════════════════════════

// ── StatCard ─────────────────────────────────────────────────────

interface StatCardProps {
  value:   string
  label:   string
  icon:    string
  color:   string
  subtext?: string
}

function StatCard({ value, label, icon, color, subtext }: StatCardProps) {
  return (
    <div
      className="flex-1 rounded-2xl p-3.5 flex flex-col items-center text-center min-w-0 relative overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${color}0d 0%, rgba(19,19,31,0.95) 100%)`,
        border: `1px solid ${color}20`,
      }}
    >
      <span className="text-xl mb-1.5" role="img" aria-hidden="true">{icon}</span>
      <span
        className="text-2xl font-black tabular-nums leading-none"
        style={{ color }}
      >
        {value}
      </span>
      <span className="text-gray-500 text-xs mt-1 font-medium leading-tight">{label}</span>
      {subtext && (
        <span className="text-xs mt-0.5" style={{ color: `${color}80` }}>{subtext}</span>
      )}
    </div>
  )
}

// ── SessionScoreCard ──────────────────────────────────────────────

function SessionScoreCard({ session }: { session: PracticeSession }) {
  const score     = session.total_score ?? 0
  const color     = getScoreColor(score)
  const gradeText = getScoreLabel(score)

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 flex flex-col gap-2 h-full"
      style={{
        background: `linear-gradient(160deg, ${color}0d 0%, rgba(19,19,31,0.95) 70%)`,
        border: `1px solid ${color}20`,
      }}
    >
      {/* 배경 글로우 */}
      <div
        className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
          filter: 'blur(12px)',
        }}
      />

      <div className="relative z-10 flex flex-col gap-2 h-full">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">최근 연습</p>
          {session.unlock_avatar_render && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(255,215,0,0.12)',
                color: '#ffd700',
                border: '1px solid rgba(255,215,0,0.25)',
                fontSize: '10px',
              }}
            >
              🏆
            </span>
          )}
        </div>

        {/* 안무 정보 */}
        <div>
          <p className="text-white font-bold text-sm truncate">
            {session.dance_reference?.title ?? '알 수 없는 안무'}
          </p>
          <p className="text-xs text-gray-600 truncate">
            {session.dance_reference?.artist_name}
          </p>
        </div>

        {/* 점수 */}
        <div className="mt-auto">
          <div className="flex items-end gap-1.5 mb-1.5">
            <span
              className="text-4xl font-black tabular-nums leading-none"
              style={{ color, textShadow: `0 0 20px ${color}50` }}
            >
              {score}
            </span>
            <span
              className="text-xs font-bold pb-1"
              style={{ color }}
            >
              {gradeText}
            </span>
          </div>

          {/* 점수 바 */}
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${score}%`,
                background: `linear-gradient(90deg, ${color}60, ${color})`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AvatarProgressCard ────────────────────────────────────────────

function AvatarProgressCard({ bestScore }: { bestScore: number }) {
  const UNLOCK_THRESHOLD = 80
  const isUnlocked = bestScore >= UNLOCK_THRESHOLD
  const progress   = Math.min(100, Math.round((bestScore / UNLOCK_THRESHOLD) * 100))

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={
        isUnlocked
          ? {
              background: 'linear-gradient(135deg, rgba(176,65,255,0.18) 0%, rgba(255,45,120,0.12) 60%, rgba(19,19,31,0.95) 100%)',
              border: '1px solid rgba(176,65,255,0.4)',
              boxShadow: '0 0 32px rgba(176,65,255,0.15)',
            }
          : {
              background: 'rgba(19,19,31,0.95)',
              border: '1px solid rgba(42,42,63,1)',
            }
      }
    >
      {/* 배경 오브 */}
      {isUnlocked && (
        <>
          <div
            className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(176,65,255,0.2) 0%, transparent 65%)',
              filter: 'blur(24px)',
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-32 h-20 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse, rgba(255,45,120,0.15) 0%, transparent 70%)',
              filter: 'blur(16px)',
            }}
          />
        </>
      )}

      <div className="relative z-10">
        {/* 상단 헤더 */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: isUnlocked ? '#b041ff' : '#444460' }}>
              Avatar Stage
            </p>
            <h3 className="text-white font-black text-xl leading-tight">
              {isUnlocked ? '아바타 무대 해금!' : '아바타 무대 도전'}
            </h3>
          </div>
          <span className={`text-3xl ${isUnlocked ? 'animate-unlock-reveal' : 'opacity-30'}`}>
            {isUnlocked ? '🎭' : '🔒'}
          </span>
        </div>

        {/* 진척도 — 잠금 상태 */}
        {!isUnlocked && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">최고 점수</span>
              <span className="text-gray-300 font-bold tabular-nums">
                {bestScore} / {UNLOCK_THRESHOLD}점
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #b041ff80, #b041ff)',
                }}
              />
            </div>
            <p className="text-xs text-gray-600">
              80점 이상을 받으면 아바타 퍼포먼스를 만들 수 있어요
            </p>
          </div>
        )}

        {/* 잠금 해제 — 안내 텍스트 */}
        {isUnlocked && (
          <p className="text-gray-400 text-sm mb-4 leading-relaxed">
            아바타, 무대, 의상을 선택해서{' '}
            <span style={{ color: '#b041ff' }} className="font-semibold">
              나만의 퍼포먼스
            </span>
            를 만들어봐요!
          </p>
        )}

        {/* CTA 버튼 */}
        <Link
          href="/avatar"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:-translate-y-0.5"
          style={
            isUnlocked
              ? {
                  background: 'linear-gradient(135deg, #b041ff, #ff2d78)',
                  boxShadow: '0 0 24px rgba(176,65,255,0.4)',
                }
              : {
                  background: 'rgba(42,42,63,0.8)',
                  border: '1px solid rgba(42,42,63,1)',
                  color: '#666680',
                }
          }
        >
          {isUnlocked ? (
            <>
              <span>🎭</span>
              <span>아바타 만들기</span>
              <span className="opacity-70">→</span>
            </>
          ) : (
            <>
              <span>연습하러 가기</span>
              <span className="opacity-70">→</span>
            </>
          )}
        </Link>
      </div>
    </div>
  )
}

// ── EmptyRecentCard ───────────────────────────────────────────────

function EmptyRecentCard() {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center gap-2 p-4 h-full text-center"
      style={{
        background: 'rgba(19,19,31,0.6)',
        border: '1px dashed rgba(42,42,63,1)',
      }}
    >
      <span className="text-2xl opacity-40">💃</span>
      <p className="text-gray-600 text-xs leading-relaxed">
        아직 연습 기록이<br />없어요
      </p>
      <Link
        href="/practice"
        className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
        style={{
          background: 'rgba(176,65,255,0.12)',
          color: '#b041ff',
          border: '1px solid rgba(176,65,255,0.25)',
        }}
      >
        첫 연습 시작 →
      </Link>
    </div>
  )
}

// ── PageSkeleton ──────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <div className="px-5 pt-10 pb-8 space-y-4">
        <div className="h-4 w-32 rounded-full bg-white/5" />
        <div className="space-y-2">
          <div className="h-10 w-48 rounded-xl bg-white/5" />
          <div className="h-10 w-36 rounded-xl bg-white/5" />
        </div>
        <div className="h-4 w-64 rounded-lg bg-white/5" />
        <div className="h-12 w-40 rounded-2xl bg-white/5" />
      </div>
      {/* Stats skeleton */}
      <div className="px-5 mb-6 flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-20 rounded-2xl bg-white/5" />
        ))}
      </div>
      {/* Cards skeleton */}
      <div className="px-5 mb-6 grid grid-cols-2 gap-3">
        <div className="h-36 rounded-2xl bg-white/5" />
        <div className="h-36 rounded-2xl bg-white/5" />
      </div>
      {/* Dance cards skeleton */}
      <div className="px-5 mb-6">
        <div className="h-5 w-32 rounded-lg bg-white/5 mb-4" />
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-44 h-52 shrink-0 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  )
}


// ════════════════════════════════════════════════════════
// 메인 페이지
// ════════════════════════════════════════════════════════

export default function HomePage() {
  const [user, setUser]                   = useState<User | null>(null)
  const [dances, setDances]               = useState<DanceReference[]>([])
  const [recentSessions, setRecentSessions] = useState<PracticeSession[]>([])
  const [isLoading, setIsLoading]         = useState(true)
  const [authReady, setAuthReady]         = useState(false)
  const scrollRef                         = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const hasToken = Boolean(getStoredAccessToken())
        const [profile, danceList, sessionList] = await Promise.all([
          hasToken ? api.auth.me() : api.user.getMe(),
          api.dance.getAll(),
          api.user.getRecentSessions(3),
        ])
        setUser(profile)
        setDances(danceList)
        setRecentSessions(sessionList)
      } catch {
        try {
          const [fallbackUser, danceList, sessionList] = await Promise.all([
            api.user.getMe(),
            api.dance.getAll(),
            api.user.getRecentSessions(3),
          ])
          setUser(fallbackUser)
          setDances(danceList)
          setRecentSessions(sessionList)
        } catch {
          setUser(null)
          setDances([])
          setRecentSessions([])
        }
      } finally {
        setAuthReady(true)
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  // 파생 데이터
  const bestScore = recentSessions.reduce(
    (best, s) => Math.max(best, s.total_score ?? 0),
    0
  )
  const lastSession   = recentSessions[0] ?? null
  const todayDone     = recentSessions.some(
    (s) => new Date(s.created_at).toDateString() === new Date().toDateString()
  )

  // ── 로딩 상태 ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-dvh">
        {/* Header skeleton */}
        <header
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid rgba(42,42,63,0.4)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/5 animate-pulse" />
            <div className="w-28 h-4 rounded-lg bg-white/5 animate-pulse" />
          </div>
          <div className="w-20 h-7 rounded-full bg-white/5 animate-pulse" />
        </header>
        <PageSkeleton />
      </div>
    )
  }

  // ── 렌더 ──────────────────────────────────────────────
  return (
    <div className="min-h-dvh pb-28 md:pb-0 animate-fade-in">

      {/* ════ 헤더 ════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-5 py-3"
        style={{
          background:     'rgba(10,10,15,0.80)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom:   '1px solid rgba(42,42,63,0.5)',
        }}
      >
        {/* 로고 */}
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">💃</span>
          <span className="font-black text-white text-sm tracking-tight">
            DANCE MASTER
          </span>
        </div>

        {/* 유저 정보 */}
        {authReady && user && (
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-white text-xs font-bold leading-none">
                {user.nickname}
              </span>
              <span
                className="text-xs leading-none mt-0.5"
                style={{ color: '#ffd700' }}
              >
                {user.points.toLocaleString()} P
              </span>
            </div>
            <RankBadge rank={user.rank} size="sm" showLabel={false} />
            {user.is_admin && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center rounded-full border border-fuchsia-400/30 px-3 py-1 text-[11px] font-bold text-fuchsia-300 transition-colors hover:border-fuchsia-300 hover:text-fuchsia-200"
              >
                Admin
              </Link>
            )}
            {/* 아바타 이니셜 */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #b041ff, #ff2d78)' }}
              aria-label={`${user.nickname} 프로필`}
            >
              {user.nickname[0]}
            </div>
          </div>
        )}
        {authReady && !user && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-400">
              로그인하면 기록과 리포트가 저장돼요
            </span>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black text-white transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #00c2ff, #b041ff)',
                boxShadow: '0 0 18px rgba(0,194,255,0.22)',
              }}
            >
              <span>🔐</span>
              <span>로그인 / 가입</span>
            </Link>
          </div>
        )}
      </header>

      <main className="max-w-2xl mx-auto">

        {/* ════ Hero ════════════════════════════════════════ */}
        <section className="relative px-5 pt-10 pb-8 overflow-hidden">
          {/* 배경 오브 */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[500px] h-[300px] pointer-events-none"
            aria-hidden="true"
            style={{
              background: 'radial-gradient(ellipse, rgba(176,65,255,0.18) 0%, transparent 65%)',
              filter: 'blur(40px)',
            }}
          />
          <div
            className="absolute top-12 right-0 w-[200px] h-[200px] pointer-events-none"
            aria-hidden="true"
            style={{
              background: 'radial-gradient(circle, rgba(255,45,120,0.1) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />

          <div className="relative z-10 space-y-5">
            {/* 상단 배지 */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(176,65,255,0.12)',
                  border: '1px solid rgba(176,65,255,0.3)',
                  color: '#b041ff',
                }}
              >
                <span>✦</span>
                <span>AI 댄스 트레이닝</span>
              </span>
              {user ? (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(0,194,255,0.10)',
                    border: '1px solid rgba(0,194,255,0.24)',
                    color: '#65d4ff',
                  }}
                >
                  <span>👤</span>
                  <span>{user.nickname} 님 환영해요</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#cbd5e1',
                  }}
                >
                  <span>🔓</span>
                  <span>로그인하면 기록이 저장돼요</span>
                </span>
              )}
            </div>

            {/* 메인 슬로건 */}
            <div>
              <h1 className="text-5xl md:text-6xl font-black leading-[1.05]">
                <span className="gradient-text block">내 실력이</span>
                <span className="gradient-text block">빛나는</span>
                <span className="text-white block">순간</span>
              </h1>
            </div>

            {/* 서브 텍스트 */}
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              AI가 내 동작을 실시간 분석하고,
              <br />
              아바타가 무대에 서는 댄스 트레이닝
            </p>

            {/* CTA 버튼 그룹 */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/practice"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-white text-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                style={{
                  background: 'linear-gradient(135deg, #b041ff, #ff2d78)',
                  boxShadow: '0 0 32px rgba(176,65,255,0.35), 0 4px 16px rgba(0,0,0,0.4)',
                }}
                >
                  <span>💃</span>
                  <span>오늘 연습 시작</span>
                  <span className="opacity-60 text-xs">→</span>
                </Link>

                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 hover:border-white/20 hover:text-white"
                  style={{
                    background: 'rgba(19,19,31,0.8)',
                    border: '1px solid rgba(42,42,63,1)',
                    color: '#9ca3af',
                  }}
                >
                  <span>🔐</span>
                  <span>로그인 / 가입</span>
                </Link>

                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 hover:border-white/20 hover:text-white"
                  style={{
                    background: 'rgba(19,19,31,0.8)',
                    border: '1px solid rgba(42,42,63,1)',
                    color: '#9ca3af',
                  }}
                >
                  <span>?뮆</span>
                  <span>영상 업로드</span>
                </Link>

                {lastSession && (
                  <Link
                    href={`/report/${lastSession.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 hover:border-brand-purple/50"
                  style={{
                    background: 'rgba(19,19,31,0.8)',
                    border: '1px solid rgba(42,42,63,1)',
                    color: '#9ca3af',
                  }}
                >
                  <span>📊</span>
                  <span>지난 리포트</span>
                </Link>
                )}
              </div>

              {user && (
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-gray-500">상태</p>
                    <p className="mt-1 text-sm font-black text-cyan-300">
                      {user.is_admin ? '관리자' : '일반 사용자'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-gray-500">랭크</p>
                    <p className="mt-1 text-sm font-black text-white">{user.rank}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-gray-500">연속 연습</p>
                    <p className="mt-1 text-sm font-black text-amber-300">{user.streak_days}일</p>
                  </div>
                </div>
              )}
            </div>
          </section>

        {/* ════ Quick Stats ══════════════════════════════════ */}
        <section className="px-5 mb-6">
          <div className="flex gap-2.5">
            <StatCard
              value={bestScore > 0 ? String(bestScore) : '--'}
              label="최고 점수"
              icon="⭐"
              color={bestScore > 0 ? getScoreColor(bestScore) : '#444460'}
              subtext={bestScore >= 80 ? '아바타 해금' : undefined}
            />
            <StatCard
              value={`${user?.streak_days ?? 0}일`}
              label="연속 연습"
              icon="🔥"
              color={
                (user?.streak_days ?? 0) > 0 ? '#ff6b35' : '#444460'
              }
            />
            <StatCard
              value={(user?.points ?? 0).toLocaleString()}
              label="포인트"
              icon="💎"
              color="#b041ff"
            />
          </div>
        </section>

        {/* ════ Streak + 최근 점수 ═══════════════════════════ */}
        <section className="px-5 mb-6">
          <div className="grid grid-cols-2 gap-2.5 items-stretch">
            {user ? (
              <StreakCard
                streakDays={user.streak_days}
                todayCompleted={todayDone}
                bestStreak={user.streak_days + 3}  // mock: 최고 기록
              />
            ) : (
              <div
                className="rounded-2xl h-36"
                style={{ background: 'rgba(19,19,31,0.6)', border: '1px solid rgba(42,42,63,1)' }}
              />
            )}

            {lastSession ? (
              <SessionScoreCard session={lastSession} />
            ) : (
              <EmptyRecentCard />
            )}
          </div>
        </section>

        {/* ════ 추천 안무 ════════════════════════════════════ */}
        <section className="mb-6">
          {/* 섹션 헤더 */}
          <div className="px-5 flex items-end justify-between mb-4">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: '#b041ff' }}
              >
                Trending Now
              </p>
              <h2 className="text-white font-black text-xl leading-tight">
                이번 주 인기 안무
              </h2>
            </div>
            <Link
              href="/practice"
              className="text-xs font-semibold pb-0.5 transition-colors hover:text-brand-purple"
              style={{ color: '#666680' }}
            >
              전체보기 →
            </Link>
          </div>

          {/* 수평 스크롤 카드 목록 */}
          <div
            ref={scrollRef}
            className="flex gap-3 px-5 overflow-x-auto scrollbar-hide pb-1"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {dances.map((dance, idx) => (
              <div
                key={dance.id}
                className="shrink-0 w-44"
                style={{ scrollSnapAlign: 'start' }}
              >
                <DanceCard
                  dance={dance}
                  variant="scroll"
                  badge={idx === 0 ? 'HOT' : idx === 2 ? 'NEW' : undefined}
                />
              </div>
            ))}

            {/* 끝 여백 */}
            <div className="shrink-0 w-5" aria-hidden="true" />
          </div>

          {/* 스크롤 인디케이터 도트 */}
          <div className="flex items-center justify-center gap-1.5 mt-3 px-5">
            {dances.slice(0, 5).map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width:      i === 0 ? '20px' : '6px',
                  height:     '6px',
                  background: i === 0 ? '#b041ff' : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
        </section>

        {/* ════ 아바타 진척도 ════════════════════════════════ */}
        <section className="px-5 mb-6">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: '#ff2d78' }}
              >
                Reward
              </p>
              <h2 className="text-white font-black text-xl leading-tight">
                아바타 무대
              </h2>
            </div>
          </div>
          <AvatarProgressCard bestScore={bestScore} />
        </section>

        {/* ════ 랭크 카드 ════════════════════════════════════ */}
        {user && (
          <section className="px-5 mb-6">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: '#60a5fa' }}
                >
                  My Progress
                </p>
                <h2 className="text-white font-black text-xl leading-tight">
                  나의 성장
                </h2>
              </div>
            </div>
            <RankBadge rank={user.rank} size="lg" showLabel points={user.points} />
          </section>
        )}

        {/* ════ 최근 연습 목록 ══════════════════════════════ */}
        {recentSessions.length > 0 && (
          <section className="px-5 mb-6">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: '#9ca3af' }}
                >
                  History
                </p>
                <h2 className="text-white font-black text-xl leading-tight">
                  최근 연습 기록
                </h2>
              </div>
            </div>
            <div className="space-y-2.5">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/report/${session.id}`}
                  className="block transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <DanceCard
                    dance={session.dance_reference ?? {
                      id: session.dance_reference_id,
                      title: '알 수 없는 안무',
                      artist_name: '-',
                      difficulty: 'normal',
                      duration_seconds: 0,
                      thumbnail_url: '',
                      reference_json_path: '',
                      created_at: '',
                    }}
                    variant="grid"
                  />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ════ 팁 카드 (신규 유저 온보딩) ═══════════════════ */}
        <section className="px-5 mb-8">
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: 'rgba(0,229,255,0.06)',
              border: '1px solid rgba(0,229,255,0.15)',
            }}
          >
            <span className="text-2xl shrink-0">💡</span>
            <div>
              <p className="text-white text-sm font-semibold">이렇게 사용해봐요!</p>
              <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                안무를 선택 → 카메라 앞에서 따라 춰요 → AI가 실시간 분석 →
                오답 노트 리포트 확인 → 80점 이상이면 아바타 무대 해금!
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* ════ 모바일 하단 내비게이션 ══════════════════════════ */}
      <BottomNav />
    </div>
  )
}
