'use client'

/**
 * components/ErrorJointBadge.tsx
 * ─────────────────────────────────────────────────────────────────
 * 틀린 관절 배지 — 화면 우측 오버레이에 최대 3개 표시
 *
 * 각 배지:
 * - 빨간 점 + 관절 한국어 이름 + 방향 힌트 (있을 경우)
 * - 빨간 글로우 border
 * - 등장 애니메이션 (slide-up)
 * ─────────────────────────────────────────────────────────────────
 */

import { useJointErrors } from '@/store/danceStore'
import type { JointName } from '@/lib/types'

// ─── 관절 한국어 이름 ─────────────────────────────────────────────

const JOINT_LABEL: Record<JointName, string> = {
  nose:           '얼굴',
  left_shoulder:  '왼쪽 어깨',
  right_shoulder: '오른쪽 어깨',
  left_elbow:     '왼쪽 팔꿈치',
  right_elbow:    '오른쪽 팔꿈치',
  left_wrist:     '왼쪽 손목',
  right_wrist:    '오른쪽 손목',
  left_hip:       '왼쪽 엉덩이',
  right_hip:      '오른쪽 엉덩이',
  left_knee:      '왼쪽 무릎',
  right_knee:     '오른쪽 무릎',
  left_ankle:     '왼쪽 발목',
  right_ankle:    '오른쪽 발목',
}

// 방향 → 이모지 화살표
function directionArrow(direction?: string): string {
  if (!direction) return ''
  if (direction.includes('올려') || direction.includes('위')) return ' ↑'
  if (direction.includes('내려') || direction.includes('아래')) return ' ↓'
  if (direction.includes('왼쪽')) return ' ←'
  if (direction.includes('오른쪽')) return ' →'
  return ''
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────

export function ErrorJointBadge() {
  const jointErrors = useJointErrors()

  const wrongJoints = Object.values(jointErrors)
    .filter((e) => e?.status === 'wrong')
    .slice(0, 3)

  if (wrongJoints.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 items-end">
      {wrongJoints.map((error, idx) => {
        if (!error) return null
        const label = JOINT_LABEL[error.joint] ?? error.joint
        const arrow = directionArrow(error.direction)

        return (
          <div
            key={error.joint}
            className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg backdrop-blur-sm"
            style={{
              background:  'rgba(255,59,59,0.14)',
              border:      '1px solid rgba(255,59,59,0.45)',
              boxShadow:   '0 0 10px rgba(255,59,59,0.2)',
              animation:   `slideUp 0.25s ease-out ${idx * 0.05}s both`,
            }}
          >
            {/* 빨간 점 */}
            <span
              className="w-2 h-2 rounded-full shrink-0 animate-pulse"
              style={{ background: '#ff3b3b', boxShadow: '0 0 5px #ff3b3b' }}
            />

            {/* 관절명 + 방향 */}
            <span className="text-xs font-bold text-red-300 whitespace-nowrap">
              {label}
              {arrow && (
                <span className="text-red-400 ml-0.5">{arrow}</span>
              )}
            </span>

            {/* 각도 차이 (있을 경우) */}
            {error.angle_diff != null && (
              <span className="text-[10px] text-red-500 font-medium">
                {Math.round(error.angle_diff)}°
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
