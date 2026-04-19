'use client'

/**
 * app/avatar/page.tsx — 아바타 퍼포먼스 보상 페이지
 *
 * 진입 경로:
 *   /avatar?sessionId=XXX  — 리포트 페이지에서 CTA 클릭
 *   /avatar                — 직접 접근 (lastCompletedSession 또는 mock fallback)
 *
 * 데이터 흐름:
 *   1. store.lastCompletedSession.total_score ≥ 80 → 해금
 *   2. query param sessionId 있으면 report 조회 (나중에 API)
 *   3. 개발/데모 fallback: MOCK_USER.points + 점수 85 가정
 *
 * 백엔드 연결 시: requestAvatarRender() 함수만 수정하면 됨
 */

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { useDanceStore } from '@/store/danceStore'
import { AvatarRewardCard } from '@/components/AvatarRewardCard'
import { BottomNav } from '@/components/BottomNav'
import {
  MOCK_AVATAR_ITEMS,
  MOCK_USER,
} from '@/lib/mock'
import { api } from '@/lib/api'
import type { AvatarItem, AvatarItemType, RenderStatus } from '@/lib/types'
import { RARITY_COLOR } from '@/lib/types'

// ════════════════════════════════════════════════════
// API 연결 포인트 (백엔드 연결 시 이 함수만 수정)
// ════════════════════════════════════════════════════

interface RequestRenderParams {
  sessionId: string
  avatarId: string
  stageThemeId: string
  costumeId: string
}

async function requestAvatarRender(
  params: RequestRenderParams
): Promise<{ renderId: string }> {
  // TODO: 실제 API
  // const res = await fetch('/api/avatar/render', { method: 'POST', body: JSON.stringify(params) })
  // return await res.json()
  const res = await api.avatar.requestRender({
    session_id: Number.isNaN(Number(params.sessionId))
      ? params.sessionId
      : Number(params.sessionId),
    avatar_id: params.avatarId,
    stage_theme_id: params.stageThemeId,
    costume_id: params.costumeId,
  })
  return { renderId: String(res.id) }
}

async function pollRenderStatus(
  renderId: string
): Promise<RenderStatus> {
  // TODO: 실제 API
  // const res = await fetch(`/api/avatar/render/${renderId}`)
  // const json = await res.json()
  // return json.data.render_status
  const res = await api.avatar.getRenderStatus(Number(renderId))
  return res.render_status
}

// ════════════════════════════════════════════════════
// 아이템 필터링 헬퍼
// ════════════════════════════════════════════════════

function itemsByType(items: AvatarItem[], type: AvatarItemType): AvatarItem[] {
  return items.filter((i) => i.type === type)
}

// ════════════════════════════════════════════════════
// 서브 컴포넌트
// ════════════════════════════════════════════════════

// ── Reveal 모달 (페이지 진입 시 해금 연출) ─────────

function RevealModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center text-center px-8"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      {/* 파티클 링 */}
      <div className="relative flex items-center justify-center mb-6">
        <div
          className="absolute w-36 h-36 rounded-full animate-ping"
          style={{ background: 'rgba(176,65,255,0.12)' }}
        />
        <div
          className="absolute w-28 h-28 rounded-full animate-pulse"
          style={{ border: '2px solid rgba(176,65,255,0.35)' }}
        />
        <span
          className="relative text-6xl"
          style={{
            animation: 'countPop 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
            filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.8))',
          }}
        >
          🌟
        </span>
      </div>

      <p
        className="text-xs font-black uppercase tracking-widest mb-2"
        style={{ color: '#ff2d78', animation: 'slideUp 0.4s 0.3s ease-out both' }}
      >
        Avatar Unlocked!
      </p>
      <h2
        className="text-2xl font-black text-white mb-2"
        style={{ animation: 'slideUp 0.4s 0.5s ease-out both' }}
      >
        내 아바타가
        <br />
        무대에 설 수 있어요!
      </h2>
      <p
        className="text-sm text-gray-400"
        style={{ animation: 'slideUp 0.4s 0.7s ease-out both' }}
      >
        탭해서 계속하기
      </p>
    </div>
  )
}

// ── 잠금 화면 ────────────────────────────────────────

function LockedState({ score }: { score: number }) {
  const needed = 80
  const diff = needed - Math.round(score)

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center py-20">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-6"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '2px solid rgba(255,255,255,0.1)',
        }}
      >
        🔒
      </div>

      <p
        className="text-xs font-black uppercase tracking-widest mb-2"
        style={{ color: '#4b5563' }}
      >
        Avatar Stage
      </p>
      <h2 className="text-2xl font-black text-white mb-2">
        아직 잠금 상태예요
      </h2>
      <p className="text-sm text-gray-500 mb-1">
        현재 점수: <span className="text-white font-bold">{Math.round(score)}점</span>
      </p>
      <p className="text-sm text-gray-500 mb-8">
        아바타 해금까지 <span className="text-brand-pink font-bold">+{diff}점</span> 더 필요해요
      </p>

      {/* 진행 바 */}
      <div
        className="w-full max-w-xs h-2.5 rounded-full mb-8 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${(score / needed) * 100}%`,
            background: 'linear-gradient(90deg, #ff3b3b, #ff7c5c)',
          }}
        />
      </div>

      <Link href="/practice" className="btn-primary text-sm px-8 py-3">
        💪 연습하러 가기
      </Link>
    </div>
  )
}

// ── 포인트 표시 칩 ──────────────────────────────────

function PointsChip({ points }: { points: number }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{
        background: 'rgba(255,215,0,0.12)',
        border: '1px solid rgba(255,215,0,0.3)',
      }}
    >
      <span className="text-xs">⭐</span>
      <span className="text-xs font-black" style={{ color: '#ffd700' }}>
        {points.toLocaleString()} P
      </span>
    </div>
  )
}

// ── 아이템 섹션 (가로 스크롤) ────────────────────────

interface ItemSectionProps {
  title: string
  subtitle: string
  accentColor: string
  items: AvatarItem[]
  selectedId: string | null
  onSelect: (item: AvatarItem) => void
}

function ItemSection({
  title,
  subtitle,
  accentColor,
  items,
  selectedId,
  onSelect,
}: ItemSectionProps) {
  const selectedItem = items.find((i) => i.id === selectedId)

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 mb-3">
        <div>
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-0.5"
            style={{ color: accentColor }}
          >
            {subtitle}
          </p>
          <h3 className="text-base font-black text-white">{title}</h3>
        </div>
        {/* 선택된 아이템 이름 */}
        {selectedItem && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black"
            style={{
              background: `${RARITY_COLOR[selectedItem.rarity]}18`,
              border: `1px solid ${RARITY_COLOR[selectedItem.rarity]}44`,
              color: RARITY_COLOR[selectedItem.rarity],
            }}
          >
            ✓ {selectedItem.name}
          </div>
        )}
      </div>

      {/* 가로 스크롤 카드 */}
      <div
        className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item) => (
          <AvatarRewardCard
            key={item.id}
            item={item}
            isSelected={selectedId === item.id}
            onSelect={onSelect}
            size="md"
          />
        ))}
        {/* 오른쪽 여백 */}
        <div className="shrink-0 w-1" />
      </div>
    </div>
  )
}

// ── 선택 요약 바 ─────────────────────────────────────

interface SummaryBarProps {
  items: AvatarItem[]
  avatarId: string | null
  stageId: string | null
  costumeId: string | null
}

function SummaryBar({ items, avatarId, stageId, costumeId }: SummaryBarProps) {
  const avatar  = items.find((i) => i.id === avatarId)
  const stage   = items.find((i) => i.id === stageId)
  const costume = items.find((i) => i.id === costumeId)

  const slots = [
    { label: '아바타', item: avatar, icon: '🧑‍🎤' },
    { label: '무대',   item: stage,  icon: '🎭' },
    { label: '의상',   item: costume, icon: '👗' },
  ]

  return (
    <div
      className="flex items-center justify-around px-5 py-4 mx-5 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {slots.map((slot, i) => {
        const hasItem = !!slot.item
        const rarityColor = slot.item ? RARITY_COLOR[slot.item.rarity] : undefined

        return (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all"
              style={{
                background: hasItem ? `${rarityColor}18` : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${hasItem ? rarityColor + '55' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: hasItem ? `0 0 12px ${rarityColor}33` : 'none',
              }}
            >
              {hasItem
                ? (slot.label === '아바타' ? '🧑‍🎤' : slot.label === '무대' ? '🎭' : '👗')
                : <span className="text-gray-700 text-lg">{slot.icon}</span>
              }
            </div>
            <p className="text-[9px] font-bold" style={{ color: hasItem ? '#d1d5db' : '#374151' }}>
              {hasItem ? slot.item!.name.slice(0, 5) + (slot.item!.name.length > 5 ? '…' : '') : slot.label}
            </p>
            {hasItem && (
              <span
                className="text-[8px] font-black"
                style={{ color: rarityColor }}
              >
                ●
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Render 상태 화면 ─────────────────────────────────

type RenderPhase = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

interface RenderStatusProps {
  phase: RenderPhase
  renderId: string | null
  onRetry: () => void
}

function RenderStatusDisplay({ phase, onRetry }: RenderStatusProps) {
  if (phase === 'idle') return null

  if (phase === 'pending' || phase === 'processing') {
    const label = phase === 'pending' ? '요청 중...' : '퍼포먼스 생성 중...'
    const sub   = phase === 'pending'
      ? '아바타에게 동작을 전달하고 있어요'
      : 'AI가 안무를 분석해 아바타에 적용하고 있어요'

    return (
      <div
        className="mx-5 rounded-2xl px-5 py-6 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(176,65,255,0.1), rgba(255,45,120,0.07))',
          border: '1px solid rgba(176,65,255,0.2)',
        }}
      >
        {/* 스피너 */}
        <div className="flex justify-center mb-4">
          <div className="relative w-14 h-14">
            <div
              className="absolute inset-0 rounded-full animate-spin"
              style={{
                background: 'conic-gradient(from 0deg, transparent 70%, #b041ff, #ff2d78)',
              }}
            />
            <div
              className="absolute inset-1 rounded-full flex items-center justify-center"
              style={{ background: '#0a0a0f' }}
            >
              <span className="text-xl animate-pulse">✨</span>
            </div>
          </div>
        </div>
        <p className="font-black text-white mb-1">{label}</p>
        <p className="text-xs text-gray-500">{sub}</p>

        {/* 진행 바 애니메이션 */}
        <div
          className="mt-4 h-1 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #b041ff, #ff2d78)',
              animation: phase === 'processing'
                ? 'progressAnim 2s ease-in-out infinite alternate'
                : 'none',
              width: phase === 'pending' ? '30%' : undefined,
            }}
          />
        </div>
      </div>
    )
  }

  if (phase === 'completed') {
    return (
      <div
        className="mx-5 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(176,65,255,0.08))',
          border: '1px solid rgba(255,215,0,0.3)',
        }}
      >
        <div className="px-5 py-6 text-center">
          <div className="text-4xl mb-3" style={{ filter: 'drop-shadow(0 0 12px #ffd700)' }}>
            🏆
          </div>
          <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#ff2d78' }}>
            Performance Complete!
          </p>
          <p className="font-black text-white text-lg mb-1">
            퍼포먼스가 완성됐어요!
          </p>
          <p className="text-sm text-gray-400 mb-5">
            내 아바타가 무대에 섰어요 🎉
          </p>

          {/* 가상 비디오 미리보기 */}
          <div
            className="w-full aspect-video rounded-xl flex flex-col items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, #0d0d1a, #1a0a2e)',
              border: '1px solid rgba(176,65,255,0.2)',
            }}
          >
            <span className="text-4xl mb-2">🎬</span>
            <p className="text-xs text-gray-500">퍼포먼스 미리보기</p>
            <p className="text-[10px] text-gray-700 mt-0.5">(백엔드 연결 후 실제 영상 표시)</p>
          </div>

          {/* 공유 / 홈 버튼 */}
          <div className="flex gap-3">
            <button
              className="flex-1 py-3 rounded-xl text-sm font-black text-white transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #b041ff, #ff2d78)',
                boxShadow: '0 0 16px rgba(176,65,255,0.35)',
              }}
              onClick={() => alert('공유 기능은 곧 추가될 예정이에요!')}
            >
              📤 공유하기
            </button>
            <Link
              href="/"
              className="flex-1 py-3 rounded-xl text-sm font-black text-center transition-transform active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#9ca3af',
              }}
            >
              🏠 홈으로
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'failed') {
    return (
      <div
        className="mx-5 rounded-2xl px-5 py-5 text-center"
        style={{
          background: 'rgba(255,59,59,0.08)',
          border: '1px solid rgba(255,59,59,0.25)',
        }}
      >
        <p className="text-3xl mb-2">😢</p>
        <p className="font-black text-white mb-1">생성에 실패했어요</p>
        <p className="text-xs text-gray-500 mb-4">잠시 후 다시 시도해 주세요</p>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-xl text-sm font-black text-white"
          style={{ background: 'rgba(255,59,59,0.3)', border: '1px solid rgba(255,59,59,0.4)' }}
        >
          다시 시도
        </button>
      </div>
    )
  }

  return null
}

// ════════════════════════════════════════════════════
// 메인 페이지 (Inner — useSearchParams 필요)
// ════════════════════════════════════════════════════

function AvatarPageInner() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId') ?? 'demo'

  const lastSession = useDanceStore((s) => s.lastCompletedSession)
  const { avatarSelections, setAvatarSelections, resetAvatarSelections } = useDanceStore()

  // 점수 결정
  const score =
    lastSession?.total_score ??
    (sessionId !== 'demo' ? 85 : 85)   // 데모용 fallback 85점

  const isUnlocked = score >= 80
  const userPoints = MOCK_USER.points
  const [avatarItems, setAvatarItems] = useState<AvatarItem[]>(MOCK_AVATAR_ITEMS)

  useEffect(() => {
    let active = true

    api.avatar.getItems()
      .then((items) => {
        if (active) {
          setAvatarItems(items)
        }
      })
      .catch(() => {
        if (active) {
          setAvatarItems(MOCK_AVATAR_ITEMS)
        }
      })

    return () => {
      active = false
    }
  }, [])

  // 로컬 선택 상태 (store 동기화)
  const [selectedAvatar,  setSelectedAvatar]  = useState<string | null>(avatarSelections.avatar_id)
  const [selectedStage,   setSelectedStage]   = useState<string | null>(avatarSelections.stage_theme_id)
  const [selectedCostume, setSelectedCostume] = useState<string | null>(avatarSelections.costume_id)

  // Reveal 모달
  const [showReveal, setShowReveal] = useState(isUnlocked)
  const revealShown = useRef(false)

  useEffect(() => {
    if (isUnlocked && !revealShown.current) {
      revealShown.current = true
      setShowReveal(true)
    }
  }, [isUnlocked])

  // Render 상태
  const [renderPhase, setRenderPhase] = useState<RenderPhase>('idle')
  const [renderId, setRenderId] = useState<string | null>(null)

  // 선택 핸들러
  const handleSelectAvatar = useCallback((item: AvatarItem) => {
    setSelectedAvatar(item.id)
    setAvatarSelections({ avatar_id: item.id })
  }, [setAvatarSelections])

  const handleSelectStage = useCallback((item: AvatarItem) => {
    setSelectedStage(item.id)
    setAvatarSelections({ stage_theme_id: item.id })
  }, [setAvatarSelections])

  const handleSelectCostume = useCallback((item: AvatarItem) => {
    setSelectedCostume(item.id)
    setAvatarSelections({ costume_id: item.id })
  }, [setAvatarSelections])

  // 퍼포먼스 생성
  const allSelected = !!selectedAvatar && !!selectedStage && !!selectedCostume

  const handleGenerate = useCallback(async () => {
    if (!allSelected) return
    setRenderPhase('pending')

    try {
      const { renderId: newId } = await requestAvatarRender({
        sessionId,
        avatarId: selectedAvatar!,
        stageThemeId: selectedStage!,
        costumeId: selectedCostume!,
      })
      setRenderId(newId)
      setRenderPhase('processing')

      // 실제에서는 polling
      await new Promise((r) => setTimeout(r, 2500))
      const status = await pollRenderStatus(newId)
      setRenderPhase(status === 'completed' ? 'completed' : 'failed')
    } catch {
      setRenderPhase('failed')
    }
  }, [allSelected, sessionId, selectedAvatar, selectedStage, selectedCostume])

  const handleRetry = useCallback(() => {
    setRenderPhase('idle')
    setRenderId(null)
    resetAvatarSelections()
    setSelectedAvatar(null)
    setSelectedStage(null)
    setSelectedCostume(null)
  }, [resetAvatarSelections])

  const isGenerating = renderPhase === 'pending' || renderPhase === 'processing'

  return (
    <>
      {/* ── Reveal 모달 ──────────────────────────────── */}
      {showReveal && <RevealModal onClose={() => setShowReveal(false)} />}

      <div
        className="min-h-dvh flex flex-col pb-28 md:pb-0"
        style={{ background: 'linear-gradient(180deg, #0F0A1A 0%, #0d0d1a 100%)' }}
      >
        {/* ── 헤더 ──────────────────────────────────── */}
        <div
          className="sticky top-0 z-30 flex items-center justify-between px-5 py-3"
          style={{
            background: 'rgba(10,10,15,0.9)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Link
            href={sessionId !== 'demo' ? `/report/${sessionId}` : '/'}
            className="flex items-center gap-1.5 text-gray-400 text-sm hover:text-white transition-colors"
          >
            ← 뒤로
          </Link>

          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#ffd700', boxShadow: '0 0 6px #ffd700' }}
            />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Avatar Stage
            </p>
          </div>

          <PointsChip points={userPoints} />
        </div>

        {/* ── 잠금 상태 ─────────────────────────────── */}
        {!isUnlocked ? (
          <LockedState score={score} />
        ) : (
          <div className="flex-1 overflow-y-auto pb-10">
            {/* ── Hero 섹션 ──────────────────────────── */}
            <div className="px-5 pt-7 pb-6">
              <p
                className="text-[10px] font-black uppercase tracking-widest mb-1"
                style={{ color: '#ff2d78' }}
              >
                🌟 Avatar Unlocked
              </p>
              <h1 className="text-2xl font-black text-white leading-tight">
                내 아바타가
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #b041ff, #ff2d78)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  무대에 서는 순간
                </span>
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                아바타, 무대, 의상을 선택하고 퍼포먼스를 생성해요
              </p>

              {/* 점수 뱃지 */}
              <div className="flex items-center gap-2 mt-3">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black"
                  style={{
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    color: '#22c55e',
                  }}
                >
                  ✓ {Math.round(score)}점 달성 — 아바타 해금
                </div>
              </div>
            </div>

            {/* ── 생성 완료/진행 중: 상단에 표시 ──────── */}
            {renderPhase !== 'idle' && (
              <div className="mb-6">
                <RenderStatusDisplay
                  phase={renderPhase}
                  renderId={renderId}
                  onRetry={handleRetry}
                />
              </div>
            )}

            {/* 생성 완료 이후에는 선택 UI 숨김 */}
            {renderPhase !== 'completed' && (
              <>
                {/* ── 아바타 선택 ───────────────────────── */}
                <div className="mb-6">
                  <ItemSection
                    title="아바타 선택"
                    subtitle="Step 1"
                    accentColor="#b041ff"
                    items={itemsByType(avatarItems, 'avatar')}
                    selectedId={selectedAvatar}
                    onSelect={handleSelectAvatar}
                  />
                </div>

                {/* ── 무대 선택 ─────────────────────────── */}
                <div className="mb-6">
                  <ItemSection
                    title="무대 선택"
                    subtitle="Step 2"
                    accentColor="#00e5ff"
                    items={itemsByType(avatarItems, 'stage')}
                    selectedId={selectedStage}
                    onSelect={handleSelectStage}
                  />
                </div>

                {/* ── 의상 선택 ─────────────────────────── */}
                <div className="mb-6">
                  <ItemSection
                    title="의상 선택"
                    subtitle="Step 3"
                    accentColor="#ffd700"
                    items={itemsByType(avatarItems, 'costume')}
                    selectedId={selectedCostume}
                    onSelect={handleSelectCostume}
                  />
                </div>

                {/* ── 선택 요약 ─────────────────────────── */}
                <div className="mb-6">
                  <p className="text-xs font-black text-gray-600 uppercase tracking-widest px-5 mb-3">
                    선택 현황
                  </p>
                  <SummaryBar
                    items={avatarItems}
                    avatarId={selectedAvatar}
                    stageId={selectedStage}
                    costumeId={selectedCostume}
                  />
                </div>

                {/* ── 생성 버튼 ─────────────────────────── */}
                <div className="px-5">
                  {/* 미선택 힌트 */}
                  {!allSelected && (
                    <p className="text-center text-xs text-gray-600 mb-3">
                      {[
                        !selectedAvatar  && '아바타',
                        !selectedStage   && '무대',
                        !selectedCostume && '의상',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      {' '}을(를) 먼저 선택해 주세요
                    </p>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={!allSelected || isGenerating}
                    className="w-full py-4 rounded-2xl font-black text-base text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: allSelected && !isGenerating
                        ? 'linear-gradient(135deg, #b041ff, #ff2d78)'
                        : 'rgba(255,255,255,0.08)',
                      boxShadow:
                        allSelected && !isGenerating
                          ? '0 0 28px rgba(176,65,255,0.45), 0 0 60px rgba(176,65,255,0.15)'
                          : 'none',
                      border: allSelected && !isGenerating
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {isGenerating ? '⏳ 생성 중...' : '🌟 퍼포먼스 생성하기'}
                  </button>

                  {/* 포인트 안내 */}
                  <p className="text-center text-[10px] text-gray-700 mt-3">
                    기본 생성은 무료 · 프리미엄 아이템은 포인트 필요
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </>
  )
}

// ════════════════════════════════════════════════════
// 외부 export (Suspense 래핑)
// ════════════════════════════════════════════════════

export default function AvatarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[#0a0a0f] flex items-center justify-center">
          <div className="text-center space-y-3">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto"
              style={{ borderColor: 'rgba(255,215,0,0.4)', borderTopColor: 'transparent' }}
            />
            <p className="text-gray-600 text-sm">불러오는 중...</p>
          </div>
        </div>
      }
    >
      <AvatarPageInner />
    </Suspense>
  )
}
