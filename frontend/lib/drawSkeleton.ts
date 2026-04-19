/**
 * lib/drawSkeleton.ts
 * ─────────────────────────────────────────────────────────────────
 * Canvas 기반 스켈레톤 렌더링 유틸리티
 *
 * 사용처:
 * - SkeletonOverlay.tsx  — 사용자 포즈 렌더링 (wrong joint 빨간 표시)
 * - GhostGuideOverlay.tsx — 기준 안무 ghost 렌더링 (반투명 파란색)
 * - ReplayTimeline.tsx   — 리플레이 프레임 렌더링
 *
 * 좌표계:
 * - 모든 좌표는 0.0~1.0 정규화 값
 * - canvas.width / canvas.height 를 곱해 실제 픽셀 변환
 * - 미러 모드(mirror)는 x 좌표를 1-x 로 반전
 * ─────────────────────────────────────────────────────────────────
 */

import type { PoseData, JointErrors, JointName, JointPoint } from './types'
import { SKELETON_CONNECTIONS } from './types'

// ═══════════════════════════════════════════════════════
// 렌더링 옵션 타입
// ═══════════════════════════════════════════════════════

export interface SkeletonDrawOptions {
  /** 정확한 관절 색상 */
  correctColor?: string
  /** 틀린 관절 색상 */
  wrongColor?: string
  /** 감지 안 된 관절 색상 */
  missingColor?: string
  /** 관절 점 반지름 (px) */
  jointRadius?: number
  /** 뼈대 선 두께 (px) */
  boneWidth?: number
  /** 관절 점 글로우 효과 */
  glowEffect?: boolean
  /** 미러 모드 (좌우 반전) */
  mirror?: boolean
  /** 전체 투명도 (0.0~1.0) */
  alpha?: number
  /** 감지 안 된 관절 표시 여부 */
  showMissing?: boolean
}

export interface GhostDrawOptions {
  /** ghost 색상 */
  color?: string
  /** 투명도 */
  alpha?: number
  /** 선 두께 */
  boneWidth?: number
  /** 관절 점 반지름 */
  jointRadius?: number
  /** 미러 모드 */
  mirror?: boolean
}

// ═══════════════════════════════════════════════════════
// 기본값
// ═══════════════════════════════════════════════════════

const DEFAULT_SKELETON_OPTIONS: Required<SkeletonDrawOptions> = {
  correctColor: '#00e5ff',   // 청록 — 정확
  wrongColor:   '#ff3b3b',   // 빨강 — 틀림
  missingColor: '#444466',   // 회색 — 감지 안 됨
  jointRadius:  8,
  boneWidth:    3,
  glowEffect:   true,
  mirror:       false,
  alpha:        1.0,
  showMissing:  true,
}

const DEFAULT_GHOST_OPTIONS: Required<GhostDrawOptions> = {
  color:      '#7b5cff',  // 보라 — 기준 안무
  alpha:      0.45,
  boneWidth:  2.5,
  jointRadius: 6,
  mirror:     false,
}

// ═══════════════════════════════════════════════════════
// 내부 헬퍼
// ═══════════════════════════════════════════════════════

/** 정규화 좌표 → canvas 픽셀 좌표 변환 */
function toPixel(
  point: JointPoint,
  canvasWidth: number,
  canvasHeight: number,
  mirror: boolean
): { px: number; py: number } {
  const px = mirror
    ? (1 - point.x) * canvasWidth
    : point.x * canvasWidth
  const py = point.y * canvasHeight
  return { px, py }
}

/** 글로우 효과 적용 */
function applyGlow(ctx: CanvasRenderingContext2D, color: string, blur: number): void {
  ctx.shadowColor = color
  ctx.shadowBlur = blur
}

/** 글로우 효과 제거 */
function clearGlow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

/** 관절의 상태별 색상 반환 */
function getJointColor(
  joint: JointName,
  jointErrors: JointErrors,
  options: Required<SkeletonDrawOptions>
): string {
  const error = jointErrors[joint]
  if (!error) return options.correctColor
  switch (error.status) {
    case 'wrong':   return options.wrongColor
    case 'missing': return options.missingColor
    default:        return options.correctColor
  }
}

/** 두 관절을 연결하는 선의 색상 반환 (양쪽 중 하나라도 wrong이면 wrong 색상) */
function getBoneColor(
  jointA: JointName,
  jointB: JointName,
  jointErrors: JointErrors,
  options: Required<SkeletonDrawOptions>
): string {
  const errorA = jointErrors[jointA]
  const errorB = jointErrors[jointB]
  if (errorA?.status === 'wrong' || errorB?.status === 'wrong') {
    return options.wrongColor
  }
  if (errorA?.status === 'missing' && errorB?.status === 'missing') {
    return options.missingColor
  }
  return options.correctColor
}

// ═══════════════════════════════════════════════════════
// 공개 API
// ═══════════════════════════════════════════════════════

/**
 * canvas 초기화
 * 매 프레임 렌더링 전에 호출
 */
export function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

/**
 * 사용자 스켈레톤 그리기
 * - 정확한 관절: 청록색
 * - 틀린 관절: 빨간색 + 글로우
 * - 감지 안 됨: 회색 (showMissing=true일 때)
 */
export function drawUserSkeleton(
  canvas: HTMLCanvasElement,
  pose: PoseData,
  jointErrors: JointErrors = {},
  opts: SkeletonDrawOptions = {}
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const options = { ...DEFAULT_SKELETON_OPTIONS, ...opts }
  const { width, height } = canvas

  ctx.save()
  ctx.globalAlpha = options.alpha

  // ── 1. 뼈대(bone) 선 그리기 ──────────────────────────
  for (const [jointA, jointB] of SKELETON_CONNECTIONS) {
    const pointA = pose[jointA]
    const pointB = pose[jointB]

    // visibility가 너무 낮으면 그리지 않음
    if (!pointA || !pointB) continue
    if ((pointA.visibility ?? 1) < 0.3 || (pointB.visibility ?? 1) < 0.3) continue

    const { px: x1, py: y1 } = toPixel(pointA, width, height, options.mirror)
    const { px: x2, py: y2 } = toPixel(pointB, width, height, options.mirror)

    const boneColor = getBoneColor(jointA, jointB, jointErrors, options)

    if (options.glowEffect) {
      applyGlow(ctx, boneColor, jointErrors[jointA]?.status === 'wrong' ? 12 : 4)
    }

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = boneColor
    ctx.lineWidth = options.boneWidth
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  clearGlow(ctx)

  // ── 2. 관절(joint) 점 그리기 ─────────────────────────
  for (const jointName of Object.keys(pose) as JointName[]) {
    const point = pose[jointName]
    if (!point) continue
    if ((point.visibility ?? 1) < 0.3) continue

    const error = jointErrors[jointName]
    if (error?.status === 'missing' && !options.showMissing) continue

    const { px, py } = toPixel(point, width, height, options.mirror)
    const jointColor = getJointColor(jointName, jointErrors, options)
    const isWrong = error?.status === 'wrong'
    const radius = isWrong
      ? options.jointRadius * 1.3
      : options.jointRadius

    // 글로우
    if (options.glowEffect && isWrong) {
      applyGlow(ctx, jointColor, 20)
    } else if (options.glowEffect) {
      applyGlow(ctx, jointColor, 6)
    }

    // 외곽 링 (wrong일 때 더 두껍게)
    ctx.beginPath()
    ctx.arc(px, py, radius + (isWrong ? 3 : 1.5), 0, Math.PI * 2)
    ctx.strokeStyle = jointColor
    ctx.lineWidth = isWrong ? 2.5 : 1.5
    ctx.stroke()

    // 내부 채움
    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fillStyle = isWrong
      ? `rgba(255, 59, 59, 0.6)`
      : `rgba(0, 229, 255, 0.4)`
    ctx.fill()

    clearGlow(ctx)
  }

  ctx.restore()
}

/**
 * 기준 안무 ghost 스켈레톤 그리기
 * 반투명 보라색으로 기준 포즈를 오버레이
 */
export function drawGhostSkeleton(
  canvas: HTMLCanvasElement,
  pose: PoseData,
  opts: GhostDrawOptions = {}
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const options = { ...DEFAULT_GHOST_OPTIONS, ...opts }
  const { width, height } = canvas

  ctx.save()
  ctx.globalAlpha = options.alpha

  // ── 뼈대 선 ──────────────────────────────────────────
  for (const [jointA, jointB] of SKELETON_CONNECTIONS) {
    const pointA = pose[jointA]
    const pointB = pose[jointB]
    if (!pointA || !pointB) continue

    const { px: x1, py: y1 } = toPixel(pointA, width, height, options.mirror)
    const { px: x2, py: y2 } = toPixel(pointB, width, height, options.mirror)

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = options.color
    ctx.lineWidth = options.boneWidth
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  // ── 관절 점 ──────────────────────────────────────────
  for (const jointName of Object.keys(pose) as JointName[]) {
    const point = pose[jointName]
    if (!point) continue

    const { px, py } = toPixel(point, width, height, options.mirror)

    ctx.beginPath()
    ctx.arc(px, py, options.jointRadius, 0, Math.PI * 2)
    ctx.fillStyle = options.color
    ctx.fill()
  }

  ctx.restore()
}

/**
 * 두 스켈레톤을 나란히 비교 그리기 (replay 비교 뷰용)
 * 왼쪽: 사용자 / 오른쪽: 기준
 * 또는 오버레이 방식으로 같은 캔버스에 둘 다 표시
 */
export function drawComparisonSkeleton(
  canvas: HTMLCanvasElement,
  userPose: PoseData,
  referencePose: PoseData,
  jointErrors: JointErrors = {}
): void {
  // ghost 먼저 그리고, 사용자 스켈레톤을 위에 그림
  drawGhostSkeleton(canvas, referencePose)
  drawUserSkeleton(canvas, userPose, jointErrors)
}

/**
 * 단일 관절 하이라이트 (에러 강조 애니메이션용)
 * 특정 관절 주변에 원을 그려 주목하게 함
 */
export function highlightJoint(
  canvas: HTMLCanvasElement,
  pose: PoseData,
  joint: JointName,
  color = '#ff3b3b',
  pulseRadius = 20
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const point = pose[joint]
  if (!point) return

  const { width, height } = canvas
  const { px, py } = toPixel(point, width, height, false)

  ctx.save()
  applyGlow(ctx, color, 16)

  ctx.beginPath()
  ctx.arc(px, py, pulseRadius, 0, Math.PI * 2)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.6
  ctx.stroke()

  ctx.restore()
}

/**
 * canvas를 카메라 비디오 element에 맞춰 크기 동기화
 * ResizeObserver 또는 useEffect에서 호출
 */
export function syncCanvasSize(
  canvas: HTMLCanvasElement,
  videoOrContainer: HTMLElement
): void {
  const { offsetWidth, offsetHeight } = videoOrContainer
  if (canvas.width !== offsetWidth || canvas.height !== offsetHeight) {
    canvas.width = offsetWidth
    canvas.height = offsetHeight
  }
}
