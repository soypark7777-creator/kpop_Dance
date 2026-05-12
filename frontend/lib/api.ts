/**
 * lib/api.ts
 * ?????????????????????????????????????????????????????????????????
 * My Avatar Dance Master API client.
 *
 * Backend contract:
 * - Success wrapper: { success, data, message, timestamp }
 * - Error wrapper: { success, error, code, status, message, timestamp }
 * - MOCK_MODE=true returns lib/mock.ts data without a backend.
 * - MOCK_MODE=false calls the Flask API with the same data shape.
 *
 * To connect the real backend:
 *   NEXT_PUBLIC_MOCK_MODE=false
 *   NEXT_PUBLIC_API_URL=http://localhost:5000
 */

import type {
  ApiResponse,
  ApiError,
  User,
  DanceReference,
  PracticeSession,
  AnalysisReport,
  SessionFrame,
  AvatarItem,
  AvatarRender,
  StartSessionRequest,
  StartSessionResponse,
  EndSessionRequest,
  EndSessionResponse,
  RequestAvatarRenderRequest,
  AuthLoginRequest,
  AuthLoginResponse,
  AuthRegisterRequest,
  AuthRegisterResponse,
  AdminDashboard,
  AdminRender,
  AdminReward,
  AdminSession,
  AdminSessionUpdateRequest,
  AdminUploadJob,
  VideoUploadJob,
} from './types'

import {
  MOCK_USER,
  MOCK_DANCE_REFERENCES,
  MOCK_RECENT_SESSIONS,
  MOCK_ANALYSIS_REPORT,
  MOCK_AVATAR_ITEMS,
  MOCK_AVATAR_RENDER,
  createMockStartSessionResponse,
  createMockEndSessionResponse,
  createMockSessionFrames,
} from './mock'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

/** true: mock data, false: real Flask API. */
const MOCK_MODE =
  (process.env.NEXT_PUBLIC_MOCK_MODE ?? 'true') === 'true'

/** Simulated network delay for mock mode. */
const MOCK_DELAY = 400

const ACCESS_TOKEN_KEY = 'kpop_dance_access_token'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export function getStoredAccessToken(): string | null {
  if (!isBrowser()) return null
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setStoredAccessToken(token: string): void {
  if (!isBrowser()) return
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearStoredAccessToken(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
}

function decodeTokenClaims(token: string): Record<string, unknown> | null {
  try {
    const [body] = token.split('.')
    const normalized = body.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function buildUserFromClaims(claims: Record<string, unknown> | null): User {
  const isAdmin = Boolean(claims?.is_admin)
  const email = typeof claims?.email === 'string' ? claims.email : MOCK_USER.email
  const nickname = typeof claims?.nickname === 'string' ? claims.nickname : MOCK_USER.nickname
  return {
    ...MOCK_USER,
    id: typeof claims?.sub === 'string' ? Number(claims.sub) || MOCK_USER.id : MOCK_USER.id,
    email,
    nickname,
    is_admin: isAdmin,
    points: isAdmin ? 9999 : MOCK_USER.points,
    rank: isAdmin ? 'legend' : MOCK_USER.rank,
  }
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// 怨듯넻 HTTP ?대씪?댁뼵??// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
/** mock 紐⑤뱶?먯꽌 ?ㅽ듃?뚰겕 吏???쒕??덉씠??*/
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Flask 諛깆뿏??怨듯넻 fetch wrapper */
async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${path}`
  const token = getStoredAccessToken()
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })

  if (!res.ok) {
    const error: ApiError = {
      success: false,
      error: `HTTP ${res.status}`,
      status: res.status,
      timestamp: new Date().toISOString(),
    }
    // Flask?먯꽌 JSON ?먮윭 硫붿떆吏瑜?諛섑솚?섎㈃ ?뚯떛
    try {
      const body = await res.json()
      error.error = body.error ?? body.message ?? error.error
      error.code = body.code
    } catch {
      // JSON ?뚯떛 ?ㅽ뙣 ??湲곕낯 ?먮윭 硫붿떆吏 ?ъ슜
    }
    throw error
  }

  return res.json() as Promise<ApiResponse<T>>
}

async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  return apiFetch<T>(path, { method: 'GET' })
}

async function apiPost<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

async function apiPatch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return apiFetch<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

async function apiUpload<T>(path: string, formData: FormData): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${path}`
  const token = getStoredAccessToken()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!res.ok) {
    const error: ApiError = {
      success: false,
      error: `HTTP ${res.status}`,
      status: res.status,
      timestamp: new Date().toISOString(),
    }
    try {
      const body = await res.json()
      error.error = body.error ?? body.message ?? error.error
      error.code = body.code
    } catch {
      // ignore
    }
    throw error
  }

  return res.json() as Promise<ApiResponse<T>>
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// userApi ???좎? ?꾨줈??// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
export const userApi = {
  /**
   * ???꾨줈??議고쉶
   * GET /api/users/me
   */
  async getMe(): Promise<User> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return MOCK_USER
    }
    const res = await apiGet<User>('/api/users/me')
    return res.data
  },

  /**
   * 理쒓렐 ?곗뒿 ?몄뀡 紐⑸줉
   * GET /api/users/me/sessions
   */
  async getRecentSessions(limit = 10): Promise<PracticeSession[]> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return MOCK_RECENT_SESSIONS.slice(0, limit)
    }
    const res = await apiGet<PracticeSession[]>(
      `/api/users/me/sessions?limit=${limit}`
    )
    return res.data
  },
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// danceApi ???덈Т 紐⑸줉
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
export const danceApi = {
  /**
   * ?꾩껜 ?덈Т 紐⑸줉
   * GET /api/dance-references
   */
  async getAll(): Promise<DanceReference[]> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return MOCK_DANCE_REFERENCES
    }
    const res = await apiGet<DanceReference[]>('/api/dance-references')
    return res.data
  },

  /**
   * ?⑥씪 ?덈Т ?곸꽭
   * GET /api/dance-references/:id
   */
  async getById(id: number): Promise<DanceReference> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      const found = MOCK_DANCE_REFERENCES.find((d) => d.id === id)
      if (!found) throw new Error(`Dance reference ${id} not found`)
      return found
    }
    const res = await apiGet<DanceReference>(`/api/dance-references/${id}`)
    return res.data
  },
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// sessionApi ???곗뒿 ?몄뀡 ?쒖옉/醫낅즺
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
export const sessionApi = {
  /**
   * Practice session start.
   * POST /api/session/start
   * TODO(real API): return session_id, stream_url, dance_reference.
   */
  async start(req: StartSessionRequest): Promise<StartSessionResponse> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return createMockStartSessionResponse(req.dance_reference_id)
    }
    const res = await apiPost<StartSessionResponse>('/api/session/start', req)
    return res.data
  },

  /**
   * Practice session end.
   * POST /api/session/end
   * TODO(real API): persist final frames and return session + analysis report.
   */
  async end(req: EndSessionRequest): Promise<EndSessionResponse> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY * 2)
      return createMockEndSessionResponse(req.session_id, 1)
    }
    const res = await apiPost<EndSessionResponse>('/api/session/end', req)
    return res.data
  },

  /**
   * ?몄뀡 ?곸꽭 議고쉶
   * GET /api/session/:sessionId
   */
  async getById(sessionId: string): Promise<PracticeSession> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return MOCK_RECENT_SESSIONS[0]
    }
    const res = await apiGet<PracticeSession>(`/api/session/${sessionId}`)
    return res.data
  },
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// reportApi ???ㅻ떟 ?명듃 由ы룷??// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
export const reportApi = {
  /**
   * ?몄뀡 遺꾩꽍 由ы룷??議고쉶
   * GET /api/analysis/:sessionId
   * Flask??analysis_routes.py?먯꽌 諛섑솚
   */
  async getBySessionId(sessionId: string): Promise<AnalysisReport> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return {
        ...MOCK_ANALYSIS_REPORT,
        session_id: sessionId,
      }
    }
    const res = await apiGet<AnalysisReport>(`/api/analysis/${sessionId}`)
    return res.data
  },
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// replayApi ??由ы뵆?덉씠 ?꾨젅??// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
export const replayApi = {
  /**
   * 由ы뵆?덉씠 ?꾨젅??紐⑸줉 議고쉶
   * GET /api/session/:sessionId/frames
   * session_frames ?뚯씠釉??곗씠??   */
  async getFrames(sessionId: string): Promise<SessionFrame[]> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return createMockSessionFrames(sessionId)
    }
    const res = await apiGet<SessionFrame[]>(
      `/api/session/${sessionId}/frames`
    )
    return res.data
  },

  /**
   * Unity export JSON 議고쉶
   * GET /api/avatar/export/:sessionId
   * Flask??avatar_export_service.py?먯꽌 諛섑솚
   */
  async getUnityExport(sessionId: string): Promise<unknown> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return { session_id: sessionId, frames: createMockSessionFrames(sessionId) }
    }
    const res = await apiGet<unknown>(`/api/avatar/export/${sessionId}`)
    return res.data
  },
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// avatarApi ???꾨컮? / 臾대? / ?섏긽 / ?뚮뜑
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
export const avatarApi = {
  /**
   * ?꾨컮? ?꾩씠??紐⑸줉 (??낅퀎 ?꾪꽣 媛??
   * GET /api/avatar/items?type=avatar|stage|costume
   */
  async getItems(type?: 'avatar' | 'stage' | 'costume'): Promise<AvatarItem[]> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return type
        ? MOCK_AVATAR_ITEMS.filter((item) => item.type === type)
        : MOCK_AVATAR_ITEMS
    }
    const query = type ? `?type=${type}` : ''
    const res = await apiGet<AvatarItem[]>(`/api/avatar/items${query}`)
    return res.data
  },

  /**
   * ?꾨컮? ?쇳룷癒쇱뒪 ?뚮뜑 ?붿껌
   * POST /api/avatar/render
   * ??render_id + 珥덇린 render_status: 'pending' 諛섑솚
   */
  async requestRender(req: RequestAvatarRenderRequest): Promise<AvatarRender> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return {
        ...MOCK_AVATAR_RENDER,
        session_id: typeof req.session_id === 'number' ? req.session_id : 0,
        avatar_id: req.avatar_id,
        stage_theme_id: req.stage_theme_id,
        costume_id: req.costume_id,
        render_status: 'pending',
        output_url: undefined,
        requested_at: new Date().toISOString(),
        completed_at: undefined,
      }
    }
    const res = await apiPost<AvatarRender>('/api/avatar/render', req)
    return res.data
  },

  /**
   * ?뚮뜑 ?곹깭 ?대쭅
   * GET /api/avatar/render/:renderId
   * render_status: 'pending' | 'processing' | 'completed' | 'failed'
   */
  async getRenderStatus(renderId: number): Promise<AvatarRender> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      // mock?먯꽌???붿껌 ??2???대쭅 ??completed濡??꾪솚
      return {
        ...MOCK_AVATAR_RENDER,
        id: renderId,
        render_status: 'completed',
        output_url: '/mock/renders/render-001.mp4',
        completed_at: new Date().toISOString(),
      }
    }
    const res = await apiGet<AvatarRender>(`/api/avatar/render/${renderId}`)
    return res.data
  },
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// healthApi ???쒕쾭 ?곹깭
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
export const authApi = {
  async login(req: AuthLoginRequest): Promise<AuthLoginResponse> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      const isAdmin =
        req.email.toLowerCase() === 'admin@kpopdance.local' &&
        req.password === 'change-me-admin'
      const user = {
        ...MOCK_USER,
        id: isAdmin ? 9001 : MOCK_USER.id,
        email: req.email,
        nickname: isAdmin ? 'DanceAdmin' : MOCK_USER.nickname,
        points: isAdmin ? 9999 : MOCK_USER.points,
        rank: isAdmin ? 'legend' : MOCK_USER.rank,
        is_admin: isAdmin,
      }
      const claims = {
        sub: String(user.id),
        email: user.email,
        nickname: user.nickname,
        is_admin: user.is_admin,
      }
      const token = `${btoa(JSON.stringify(claims))}.mock-signature`
      setStoredAccessToken(token)
      return {
        access_token: token,
        token_type: 'Bearer',
        user,
      }
    }

    const res = await apiPost<AuthLoginResponse>('/api/auth/login', req)
    setStoredAccessToken(res.data.access_token)
    return res.data
  },

  async register(req: AuthRegisterRequest): Promise<AuthRegisterResponse> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      const user = {
        ...MOCK_USER,
        id: MOCK_USER.id + 101,
        email: req.email,
        nickname: req.nickname,
        avatar_id: req.avatar_id ?? MOCK_USER.avatar_id,
        points: 0,
        rank: 'rookie' as const,
        streak_days: 0,
        is_admin: false,
        status: 'active' as const,
      }
      const claims = {
        sub: String(user.id),
        email: user.email,
        nickname: user.nickname,
        is_admin: false,
      }
      const token = `${btoa(JSON.stringify(claims))}.mock-signature`
      setStoredAccessToken(token)
      return {
        access_token: token,
        token_type: 'Bearer',
        user,
      }
    }

    const res = await apiPost<AuthRegisterResponse>('/api/auth/register', req)
    setStoredAccessToken(res.data.access_token)
    return res.data
  },

  async me(): Promise<User> {
    if (MOCK_MODE) {
      await delay(50)
      const token = getStoredAccessToken()
      const claims = token ? decodeTokenClaims(token) : null
      return buildUserFromClaims(claims)
    }

    const res = await apiGet<User>('/api/auth/me')
    return res.data
  },

  logout(): void {
    clearStoredAccessToken()
  },
}

export interface AdminSessionListOptions {
  status?: string
  min_score?: number
  max_error?: number
  unstable_joint?: string
}

export interface AdminUploadListOptions {
  status?: string
  min_score?: number
  analysis_ready?: boolean
  query?: string
}

export const adminApi = {
  async getDashboard(): Promise<AdminDashboard> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      const danceCounts = new Map<number, number>()
      MOCK_RECENT_SESSIONS.forEach((session) => {
        danceCounts.set(session.dance_reference_id, (danceCounts.get(session.dance_reference_id) ?? 0) + 1)
      })
      return {
        counts: {
          users: 1,
          admins: 1,
          sessions: MOCK_RECENT_SESSIONS.length,
          completed_sessions: MOCK_RECENT_SESSIONS.length,
          reports: 1,
          renders: 1,
          rewards: MOCK_AVATAR_ITEMS.length,
          dance_references: MOCK_DANCE_REFERENCES.length,
        },
        recent_sessions: MOCK_RECENT_SESSIONS,
        top_dances: MOCK_DANCE_REFERENCES.slice(0, 3).map((dance) => ({
          id: dance.id,
          title: dance.title,
          session_count: danceCounts.get(dance.id) ?? 0,
        })),
      }
    }

    const res = await apiGet<AdminDashboard>('/api/admin/dashboard')
    return res.data
  },

  async listUsers(): Promise<User[]> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return [buildUserFromClaims(decodeTokenClaims(getStoredAccessToken() ?? '') ?? null)]
    }
    const res = await apiGet<User[]>('/api/admin/users')
    return res.data
  },

  async updateUser(userId: number, patch: Partial<User> & { status?: string; is_admin?: boolean }): Promise<User> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      const current = buildUserFromClaims(decodeTokenClaims(getStoredAccessToken() ?? '') ?? null)
      return {
        ...current,
        id: userId,
        ...patch,
        is_admin: typeof patch.is_admin === 'boolean' ? patch.is_admin : current.is_admin,
      }
    }
    const res = await apiPatch<User>(`/api/admin/users/${userId}`, patch)
    return res.data
  },

  async listSessions(options: AdminSessionListOptions = {}): Promise<AdminSession[]> {
    const normalizeSession = (session: AdminSession): AdminSession => ({
      ...session,
      most_wrong_joints: session.most_wrong_joints ?? [],
      unstable_joint_count: session.unstable_joint_count ?? session.most_wrong_joints?.length ?? 0,
    })

    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return MOCK_RECENT_SESSIONS.filter((session) => {
        const matchesStatus = !options.status || session.session_status === options.status
        const matchesMinScore =
          options.min_score === undefined ||
          options.min_score === null ||
          (session.total_score ?? Number.NEGATIVE_INFINITY) >= options.min_score
        const matchesMaxError =
          options.max_error === undefined ||
          options.max_error === null ||
          (session.average_angle_error ?? Number.POSITIVE_INFINITY) <= options.max_error
        const joints = session.most_wrong_joints ?? []
        const matchesJoint =
          !options.unstable_joint ||
          joints.some((joint) => joint.toLowerCase().includes(options.unstable_joint!.toLowerCase()))
        return matchesStatus && matchesMinScore && matchesMaxError && matchesJoint
      }).map(normalizeSession)
    }
    const params = new URLSearchParams()
    if (options.status) params.set('status', options.status)
    if (options.min_score !== undefined && options.min_score !== null) params.set('min_score', String(options.min_score))
    if (options.max_error !== undefined && options.max_error !== null) params.set('max_error', String(options.max_error))
    if (options.unstable_joint) params.set('unstable_joint', options.unstable_joint)
    const query = params.toString()
    const res = await apiGet<AdminSession[]>(`/api/admin/sessions${query ? `?${query}` : ''}`)
    return res.data.map(normalizeSession)
  },

  async updateSession(sessionId: number, patch: AdminSessionUpdateRequest): Promise<AdminSession> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      const session = MOCK_RECENT_SESSIONS.find((item) => item.id === sessionId) ?? MOCK_RECENT_SESSIONS[0]
      return {
        ...session,
        ...patch,
        session_status: patch.session_status ?? session.session_status,
        unlock_avatar_render:
          typeof patch.unlock_avatar_render === 'boolean'
            ? patch.unlock_avatar_render
            : session.unlock_avatar_render,
      }
    }
    const res = await apiPatch<AdminSession>(`/api/admin/sessions/${sessionId}`, patch)
    return res.data
  },

  async listRenders(): Promise<AdminRender[]> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return [MOCK_AVATAR_RENDER]
    }
    const res = await apiGet<AdminRender[]>('/api/admin/renders')
    return res.data
  },

  async listRewards(): Promise<AdminReward[]> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return MOCK_AVATAR_ITEMS.map((item, index) => ({
        id: index + 1,
        item_type: item.type,
        item_name: item.name,
        price_points: item.required_points ?? 0,
        is_premium: Boolean(item.required_points && item.required_points > 0),
        metadata_json: {
          item_id: item.id,
          rarity: item.rarity,
          thumbnail_url: item.thumbnail_url,
          description: item.description,
        },
        created_at: new Date().toISOString(),
      }))
    }
    const res = await apiGet<AdminReward[]>('/api/admin/rewards')
    return res.data
  },

  async listUploads(options: AdminUploadListOptions = {}): Promise<AdminUploadJob[]> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return []
    }
    const params = new URLSearchParams()
    if (options.status) params.set('status', options.status)
    if (options.min_score !== undefined && options.min_score !== null) params.set('min_score', String(options.min_score))
    if (options.analysis_ready !== undefined) params.set('analysis_ready', String(options.analysis_ready))
    if (options.query) params.set('query', options.query)
    const query = params.toString()
    const res = await apiGet<AdminUploadJob[]>(`/api/admin/uploads${query ? `?${query}` : ''}`)
    return res.data
  },
}

function createMockUploadJob(file: File, danceReferenceId?: number): VideoUploadJob {
  const now = Date.now()
  const previewFrames = createMockSessionFrames(`mock_upload_${now}`)
    .slice(0, 12)
    .map((frame, index) => ({
      frame_index: frame.frame_index,
      timestamp_seconds: frame.timestamp_seconds,
      file_name: `frame_${String(index + 1).padStart(3, '0')}.jpg`,
      file_url:
        `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
            <defs>
              <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stop-color="#0f172a"/>
                <stop offset="100%" stop-color="#1f1147"/>
              </linearGradient>
            </defs>
            <rect width="640" height="360" rx="28" fill="url(#g)"/>
            <circle cx="320" cy="160" r="72" fill="rgba(176,65,255,0.28)"/>
            <text x="50%" y="52%" fill="#e2e8f0" font-size="26" font-family="Arial, sans-serif" text-anchor="middle">Frame ${index + 1}</text>
            <text x="50%" y="62%" fill="#94a3b8" font-size="18" font-family="Arial, sans-serif" text-anchor="middle">${frame.timestamp_seconds.toFixed(2)}s</text>
          </svg>`
        )}`,
    }))

  return {
    id: `mock_upload_${now}`,
    user_id: MOCK_USER.id,
    dance_reference_id: danceReferenceId ?? MOCK_DANCE_REFERENCES[0]?.id ?? null,
    session_id: null,
    original_filename: file.name,
    stored_filename: file.name,
    source_video_url: '/mock/uploads/source.mp4',
    preview_frames: previewFrames,
    status: 'completed',
    frame_extraction_available: true,
    source_frame_count: 180,
    source_fps: 30,
    source_duration_seconds: 6,
    extracted_frame_count: previewFrames.length,
    notes: null,
    message: 'video uploaded and preview frames extracted',
    analysis_ready: true,
    analysis_source: 'demo_fallback',
    analysis_session_id: `mock_upload_${now}`,
    report_url: `/report/mock_upload_${now}`,
    analysis_report: MOCK_ANALYSIS_REPORT,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export const uploadApi = {
  async uploadVideo(options: {
    file: File
    dance_reference_id?: number
    session_id?: string
    user_id?: number
    notes?: string
  }): Promise<VideoUploadJob> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return createMockUploadJob(options.file, options.dance_reference_id)
    }

    const formData = new FormData()
    formData.append('video', options.file)
    if (options.dance_reference_id !== undefined) {
      formData.append('dance_reference_id', String(options.dance_reference_id))
    }
    if (options.session_id) {
      formData.append('session_id', options.session_id)
    }
    if (options.user_id !== undefined) {
      formData.append('user_id', String(options.user_id))
    }
    if (options.notes) {
      formData.append('notes', options.notes)
    }

    const res = await apiUpload<VideoUploadJob>('/api/uploads/video', formData)
    return res.data
  },

  async getUpload(uploadId: string): Promise<VideoUploadJob> {
    if (MOCK_MODE) {
      await delay(MOCK_DELAY)
      return {
        ...createMockUploadJob(new File(['mock'], 'mock.mp4')),
        id: uploadId,
        analysis_session_id: uploadId,
        report_url: `/report/${uploadId}`,
      }
    }
    const res = await apiGet<VideoUploadJob>(`/api/uploads/video/${uploadId}`)
    return res.data
  },
}

export const healthApi = {
  /**
   * Flask ?쒕쾭 ?곹깭 ?뺤씤
   * GET /api/health
   */
  async check(): Promise<{ status: string; timestamp: string }> {
    if (MOCK_MODE) {
      await delay(100)
      return { status: 'ok (mock)', timestamp: new Date().toISOString() }
    }
    const res = await apiGet<{ status: string; timestamp: string }>('/api/health')
    return res.data
  },
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??// ?대낫?닿린 ???몄쓽???듯빀 媛앹껜
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
export const api = {
  auth:    authApi,
  admin:   adminApi,
  user:    userApi,
  dance:   danceApi,
  session: sessionApi,
  report:  reportApi,
  replay:  replayApi,
  avatar:  avatarApi,
  upload:  uploadApi,
  health:  healthApi,
}

export default api



