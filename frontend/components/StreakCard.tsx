'use client'

/**
 * components/StreakCard.tsx
 * ─────────────────────────────────────────────────────────────────
 * 연속 연습 일수 카드
 *
 * 포함 요소:
 * - 불꽃 이모지 + 연속 일수 (크게)
 * - 지난 7일 요일별 도트 (완료/미완료)
 * - 오늘 완료 여부 상태 메시지
 * - bestStreak 기록 (선택적)
 * ─────────────────────────────────────────────────────────────────
 */

// 오늘 기준 이전 7일의 요일 이름 반환 (일~월)
function getWeekDots(streakDays: number, todayCompleted: boolean) {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const today = new Date()

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - i))

    const dayLabel = days[date.getDay()]
    const isToday = i === 6

    // 오늘 포함 최근 streakDays일을 completed로 표시
    const daysAgo = 6 - i
    let completed = false
    if (todayCompleted) {
      completed = daysAgo < streakDays
    } else {
      // 오늘 미완료 → 어제부터 streakDays일
      completed = daysAgo > 0 && daysAgo <= streakDays
    }

    return { dayLabel, isToday, completed }
  })
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────

interface StreakCardProps {
  streakDays:      number
  todayCompleted?: boolean
  bestStreak?:     number
}

export function StreakCard({
  streakDays,
  todayCompleted = false,
  bestStreak,
}: StreakCardProps) {
  const dots = getWeekDots(streakDays, todayCompleted)

  const streakActive = streakDays > 0

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 flex flex-col gap-3 h-full"
      style={{
        background: streakActive
          ? 'linear-gradient(160deg, rgba(255,107,53,0.15) 0%, rgba(19,19,31,0.95) 60%)'
          : 'rgba(19,19,31,0.95)',
        border: streakActive
          ? '1px solid rgba(255,107,53,0.3)'
          : '1px solid rgba(42,42,63,1)',
      }}
    >
      {/* 배경 글로우 */}
      {streakActive && (
        <div
          className="absolute -top-4 -right-4 w-24 h-24 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,107,53,0.25) 0%, transparent 70%)',
            filter: 'blur(16px)',
          }}
        />
      )}

      {/* 상단: 아이콘 + 숫자 */}
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">
            Streak
          </p>
          <div className="flex items-end gap-1.5">
            <span
              className={`text-3xl font-black tabular-nums leading-none ${
                streakActive ? 'neon-text-pink' : 'text-gray-600'
              }`}
              style={streakActive ? { color: '#ff6b35', textShadow: '0 0 12px rgba(255,107,53,0.6)' } : {}}
            >
              {streakDays}
            </span>
            <span className="text-gray-400 text-sm font-medium pb-0.5">일 연속</span>
          </div>
        </div>

        <span
          className={`text-2xl ${todayCompleted ? 'animate-streak-bounce' : 'opacity-40'}`}
          role="img"
          aria-label="streak fire"
        >
          🔥
        </span>
      </div>

      {/* 7일 도트 */}
      <div className="relative z-10 flex items-center justify-between gap-1">
        {dots.map(({ dayLabel, isToday, completed }, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1 flex-1">
            {/* 도트 */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
              style={
                completed
                  ? {
                      background: 'linear-gradient(135deg, #ff6b35, #ff2d78)',
                      boxShadow: '0 0 8px rgba(255,107,53,0.5)',
                    }
                  : {
                      background: isToday
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(255,255,255,0.05)',
                      border: isToday
                        ? '1px dashed rgba(255,107,53,0.6)'
                        : '1px solid rgba(255,255,255,0.08)',
                    }
              }
            >
              {completed && (
                <span className="text-white text-xs font-bold leading-none">✓</span>
              )}
            </div>
            {/* 요일 */}
            <span
              className="text-xs leading-none"
              style={{
                color: isToday
                  ? completed ? '#ff6b35' : 'rgba(255,107,53,0.6)'
                  : completed ? 'rgba(255,107,53,0.7)' : '#444460',
                fontWeight: isToday ? 700 : 400,
              }}
            >
              {dayLabel}
            </span>
          </div>
        ))}
      </div>

      {/* 하단: 상태 메시지 */}
      <div className="relative z-10">
        {todayCompleted ? (
          <p className="text-xs font-semibold" style={{ color: '#ff6b35' }}>
            ✓ 오늘 연습 완료!
          </p>
        ) : streakDays > 0 ? (
          <p className="text-xs text-gray-500">
            오늘 연습하면 스트릭 유지!
          </p>
        ) : (
          <p className="text-xs text-gray-600">
            첫 연습으로 스트릭을 시작해봐요
          </p>
        )}
        {bestStreak !== undefined && bestStreak > streakDays && (
          <p className="text-xs text-gray-600 mt-0.5">
            최고 기록: {bestStreak}일
          </p>
        )}
      </div>
    </div>
  )
}
