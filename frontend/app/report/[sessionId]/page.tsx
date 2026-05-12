'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { BottomNav } from '@/components/BottomNav'
import { SectionScoreChart } from '@/components/SectionScoreChart'
import { api } from '@/lib/api'
import { MOCK_ANALYSIS_REPORT } from '@/lib/mock'
import type { AnalysisReport, JointName, SectionScore } from '@/lib/types'
import { getScoreColor, getScoreGrade, getScoreLabel } from '@/lib/types'
import { useDanceStore } from '@/store/danceStore'

async function fetchReportFromApi(sessionId: string): Promise<AnalysisReport | null> {
  try {
    // TODO(real API): GET /api/analysis/:sessionId must return AnalysisReport with section_scores and report_json.
    return await api.report.getBySessionId(sessionId)
  } catch {
    return null
  }
}

const JOINT_LABELS: Record<JointName, string> = {
  nose: '코',
  left_shoulder: '왼쪽 어깨',
  right_shoulder: '오른쪽 어깨',
  left_elbow: '왼쪽 팔꿈치',
  right_elbow: '오른쪽 팔꿈치',
  left_wrist: '왼쪽 손목',
  right_wrist: '오른쪽 손목',
  left_hip: '왼쪽 엉덩이',
  right_hip: '오른쪽 엉덩이',
  left_knee: '왼쪽 무릎',
  right_knee: '오른쪽 무릎',
  left_ankle: '왼쪽 발목',
  right_ankle: '오른쪽 발목',
}

const JOINT_EMOJI: Partial<Record<JointName, string>> = {
  left_shoulder: '🫱',
  right_shoulder: '🫲',
  left_elbow: '💪',
  right_elbow: '💪',
  left_wrist: '✋',
  right_wrist: '✋',
  left_hip: '🦵',
  right_hip: '🦵',
  left_knee: '🦶',
  right_knee: '🦶',
  left_ankle: '🦶',
  right_ankle: '🦶',
  nose: '👃',
}

function ScoreRing({ score, animated }: { score: number; animated: boolean }) {
  const color = getScoreColor(score)
  const label = getScoreLabel(score)
  const grade = getScoreGrade(score)
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - (animated ? score / 100 : 0))
  const gradeEmoji: Record<string, string> = {
    perfect: '🌟',
    great: '🔥',
    good: '✨',
    needs_work: '💪',
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 70 70)"
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)',
              filter: `drop-shadow(0 0 8px ${color}88)`,
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black tabular-nums leading-none" style={{ color }}>
            {Math.round(score)}
          </span>
          <span className="mt-0.5 text-[10px] font-bold text-gray-500">/ 100</span>
        </div>
      </div>

      <div
        className="flex items-center gap-2 rounded-full px-4 py-1.5"
        style={{
          background: `${color}14`,
          border: `1px solid ${color}44`,
        }}
      >
        <span className="text-sm">{gradeEmoji[grade]}</span>
        <span className="text-sm font-black tracking-widest" style={{ color }}>
          {label}
        </span>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-[10px] text-gray-500">{sub}</p>
    </div>
  )
}

function CoachCommentCard({ comment, tips }: { comment: string; tips: string[] }) {
  return (
    <section
      className="rounded-2xl p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(176,65,255,0.10), rgba(255,45,120,0.06))',
        border: '1px solid rgba(176,65,255,0.24)',
      }}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(176,65,255,0.3), rgba(255,45,120,0.2))',
            border: '1px solid rgba(176,65,255,0.35)',
          }}
        >
          ✨
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500">AI 코치 코멘트</p>
          <p className="text-sm font-black text-white">오늘의 핵심 피드백</p>
        </div>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-gray-300">{comment}</p>

      {tips.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-gray-500">다음에 집중할 포인트</p>
          {tips.map((tip, index) => (
            <div key={tip} className="flex items-start gap-2.5">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
                style={{ background: 'rgba(176,65,255,0.2)', color: '#b041ff' }}
              >
                {index + 1}
              </span>
              <p className="text-sm leading-snug text-gray-300">{tip}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function WrongJointsPanel({ joints }: { joints: JointName[] }) {
  if (!joints.length) return null
  const chips = [
    { bg: 'rgba(255,59,59,0.12)', border: 'rgba(255,59,59,0.35)' },
    { bg: 'rgba(255,124,92,0.12)', border: 'rgba(255,124,92,0.35)' },
    { bg: 'rgba(255,172,109,0.12)', border: 'rgba(255,172,109,0.35)' },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {joints.slice(0, 6).map((joint, index) => {
        const style = chips[index % chips.length]
        return (
          <span
            key={joint}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-white"
            style={{ background: style.bg, borderColor: style.border }}
          >
            <span>{JOINT_EMOJI[joint] ?? '•'}</span>
            <span>{JOINT_LABELS[joint]}</span>
          </span>
        )
      })}
    </div>
  )
}

function SectionCompareCard({ best, worst }: { best: SectionScore; worst: SectionScore }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div
        className="rounded-2xl px-4 py-4 text-center"
        style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)' }}
      >
        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-yellow-500/70">최고 구간</p>
        <p className="mb-1 text-xs font-semibold text-gray-300">{best.section_name}</p>
        <p className="text-3xl font-black tabular-nums" style={{ color: '#ffd700' }}>
          {Math.round(best.score)}
        </p>
      </div>
      <div
        className="rounded-2xl px-4 py-4 text-center"
        style={{ background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.25)' }}
      >
        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-red-500/70">집중 구간</p>
        <p className="mb-1 text-xs font-semibold text-gray-300">{worst.section_name}</p>
        <p className="text-3xl font-black tabular-nums" style={{ color: '#ff6b6b' }}>
          {Math.round(worst.score)}
        </p>
      </div>
    </div>
  )
}

function ProgressBar({
  label,
  value,
  max = 100,
  color,
  sub,
}: {
  label: string
  value: number
  max?: number
  color: string
  sub: string
}) {
  const width = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-black tabular-nums" style={{ color }}>
            {value.toFixed(1)}
          </p>
        </div>
        <p className="text-[10px] text-gray-500">{sub}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.8))`,
            boxShadow: `0 0 10px ${color}55`,
          }}
        />
      </div>
    </div>
  )
}

function AnimatedSectionList({
  sections,
  play,
}: {
  sections: SectionScore[]
  play: boolean
}) {
  if (!sections.length) return null

  return (
    <div className="mt-4 space-y-2">
      {sections.map((section) => {
        const width = Math.max(4, Math.min(100, section.score))
        const color = getScoreColor(section.score)
        return (
          <div key={`${section.section_index}-${section.section_name}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-white">{section.section_name}</p>
                <p className="text-[10px] text-gray-500">
                  {section.start_time}s - {section.end_time}s
                </p>
              </div>
              <p className="text-lg font-black tabular-nums" style={{ color }}>
                {Math.round(section.score)}
              </p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: play ? `${width}%` : '0%',
                  background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.85))`,
                  boxShadow: `0 0 12px ${color}66`,
                  transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AvatarUnlockBanner({ sessionId }: { sessionId: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 py-5"
      style={{
        background: 'linear-gradient(135deg, rgba(176,65,255,0.2), rgba(255,45,120,0.15))',
        border: '1px solid rgba(176,65,255,0.35)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(255,45,120,0.12) 0%, transparent 70%),' +
            'radial-gradient(ellipse 50% 60% at 20% 50%, rgba(176,65,255,0.1) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex items-center gap-4">
        <div className="text-4xl">🎉</div>
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-xs font-black uppercase tracking-widest text-fuchsia-300">
            Reward Unlocked!
          </p>
          <p className="text-sm font-black text-white">아바타 렌더를 만들 수 있어요</p>
          <p className="mt-0.5 text-xs text-gray-400">80점 이상이면 아바타 제작이 열립니다.</p>
        </div>
        <Link
          href={`/avatar?sessionId=${sessionId}`}
          className="shrink-0 rounded-xl px-4 py-2 text-xs font-black text-white transition-transform active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #b041ff, #ff2d78)',
            boxShadow: '0 0 16px rgba(176,65,255,0.4)',
          }}
        >
          만들기
        </Link>
      </div>
    </div>
  )
}

export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId =
    typeof params.sessionId === 'string'
      ? params.sessionId
      : Array.isArray(params.sessionId)
        ? params.sessionId[0]
        : 'unknown'

  const storeReport = useDanceStore((s) => s.currentReport)
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [scoreAnimated, setScoreAnimated] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      if (storeReport && storeReport.session_id === sessionId) {
        setReport(storeReport)
        return
      }

      const apiData = await fetchReportFromApi(sessionId)
      if (apiData) {
        setReport(apiData)
        return
      }

      setReport({ ...MOCK_ANALYSIS_REPORT, session_id: sessionId })
    }

    load()
  }, [sessionId, storeReport])

  useEffect(() => {
    if (!report) return
    const timer = window.setTimeout(() => setScoreAnimated(true), 200)
    return () => window.clearTimeout(timer)
  }, [report])

  const sectionStats = useMemo(() => {
    if (!report) return null
    const averageSectionScore =
      report.section_scores.length > 0
        ? report.section_scores.reduce((sum, section) => sum + section.score, 0) / report.section_scores.length
        : report.total_score
    const best = report.report_json.best_section ?? report.section_scores[0]
    const worst = report.weakest_section
    return { averageSectionScore, best, worst }
  }, [report])

  if (!report || !sectionStats) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0a0f]">
        <div className="space-y-3 text-center">
          <div
            className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'rgba(176,65,255,0.5)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm text-gray-500">리포트를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const isAvatarUnlocked = report.total_score >= 80
  const motionSimilarity = report.motion_similarity ?? report.report_json.motion_similarity ?? 100
  const worstJoints = report.most_wrong_joints ?? []

  return (
    <main
      className="min-h-dvh pb-28 md:pb-16"
      style={{ background: 'linear-gradient(180deg, #0F0A1A 0%, #0d0d1a 100%)' }}
    >
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-5 py-3"
        style={{
          background: 'rgba(10,10,15,0.9)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <button
          onClick={() => router.push('/practice')}
          className="text-sm text-gray-400 transition-colors hover:text-white"
        >
          다시 연습
        </button>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" style={{ boxShadow: '0 0 6px #b041ff' }} />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Coach Report</p>
        </div>
        <Link href={`/replay/${sessionId}`} className="text-sm font-semibold text-gray-400 transition-colors hover:text-white">
          리플레이
        </Link>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-5 pt-8">
        <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div ref={heroRef} className="flex flex-col items-center gap-5">
            <ScoreRing score={report.total_score} animated={scoreAnimated} />
            <p className="text-[10px] font-mono text-gray-600">session: {sessionId}</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <MetricCard
              label="동작 유사도"
              value={`${Math.round(motionSimilarity)}%`}
              sub="DTW 기준 흐름 비교"
              color="#00e5ff"
            />
            <MetricCard
              label="평균 오차"
              value={`${report.average_angle_error.toFixed(1)}°`}
              sub="관절 각도 차이"
              color="#ff6b6b"
            />
            <MetricCard
              label="불안정 관절"
              value={`${worstJoints.length}`}
              sub="틀린 관절 상위 목록"
              color="#f59e0b"
            />
            <MetricCard
              label="구간 평균"
              value={`${Math.round(sectionStats.averageSectionScore)}`}
              sub="섹션별 평균 점수"
              color={getScoreColor(sectionStats.averageSectionScore)}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ProgressBar
              label="동작 유사도"
              value={motionSimilarity}
              color="#00e5ff"
              sub="실제 동작 흐름이 기준 안무와 얼마나 비슷한지"
            />
            <ProgressBar
              label="총점"
              value={report.total_score}
              color={getScoreColor(report.total_score)}
              sub="프레임 점수와 구간 점수를 합친 최종 결과"
            />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">한 줄 코치</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">{report.report_json.coach_comment}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">추천 프리셋</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {report.report_json.scoring_profile_name ?? 'balanced'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              {report.report_json.scoring_profile_description ?? '기본 점수 프로필을 사용했습니다.'}
            </p>
          </div>
        </section>

        {isAvatarUnlocked && <AvatarUnlockBanner sessionId={sessionId} />}

        <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500">리포트 핵심</p>
              <p className="mt-1 text-lg font-black text-white">동작 요약과 개선 포인트</p>
            </div>
            <span
              className="rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                borderColor: `${getScoreColor(report.total_score)}55`,
                color: getScoreColor(report.total_score),
              }}
            >
              {getScoreLabel(report.total_score)}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <SectionCompareCard best={sectionStats.best} worst={sectionStats.worst} />
            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">불안정 관절</p>
              <div className="mt-3">
                <WrongJointsPanel joints={worstJoints} />
                {!worstJoints.length && <p className="text-sm text-gray-500">지금은 크게 흔들린 관절이 없습니다.</p>}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-gray-500">구간별 점수</h2>
          <SectionScoreChart
            sections={report.section_scores}
            weakestSectionIndex={report.weakest_section.section_index}
            bestSectionIndex={report.report_json.best_section.section_index}
          />
          <AnimatedSectionList sections={report.section_scores} play={scoreAnimated} />
        </section>

        <section>
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-gray-500">구간 비교</h2>
          <SectionCompareCard best={sectionStats.best} worst={sectionStats.worst} />
        </section>

        <CoachCommentCard comment={report.report_json.coach_comment} tips={report.report_json.improvement_tips} />

        <section className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {report.section_scores.slice(0, 4).map((section) => (
              <div key={`${section.section_index}-${section.section_name}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{section.section_name}</p>
                <p className="mt-2 text-2xl font-black tabular-nums" style={{ color: getScoreColor(section.score) }}>
                  {Math.round(section.score)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {section.start_time}s - {section.end_time}s
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-3 pt-2">
          {isAvatarUnlocked ? (
            <Link
              href={`/avatar?sessionId=${sessionId}`}
              className="block rounded-2xl py-4 text-center text-base font-black text-white transition-transform active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #b041ff, #ff2d78)',
                boxShadow: '0 0 24px rgba(176,65,255,0.4)',
              }}
            >
              아바타 렌더 만들기
            </Link>
          ) : (
            <div
              className="rounded-2xl border border-white/10 px-4 py-4 text-center text-sm font-black text-white/40"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              아바타 렌더는 80점 이상에서 열립니다. 현재 {Math.round(report.total_score)}점
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/practice"
              className="rounded-xl py-3.5 text-center text-sm font-black"
              style={{
                background: 'rgba(0,229,255,0.1)',
                border: '1px solid rgba(0,229,255,0.3)',
                color: '#00e5ff',
              }}
            >
              다시 연습
            </Link>
            <Link
              href={`/replay/${sessionId}`}
              className="rounded-xl py-3.5 text-center text-sm font-black"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#d1d5db',
              }}
            >
              리플레이
            </Link>
          </div>

          <Link href="/" className="block rounded-xl py-3 text-center text-sm text-gray-600 transition-colors hover:text-gray-400">
            홈으로
          </Link>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
