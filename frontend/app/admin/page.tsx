'use client'

import Link from 'next/link'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { api } from '@/lib/api'
import type {
  AdminDashboard,
  AdminRender,
  AdminReward,
  AdminSession,
  AdminUploadJob,
  AnalysisReport,
  AuthLoginRequest,
  User,
  VideoUploadStatus,
} from '@/lib/types'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

const DEFAULT_LOGIN: AuthLoginRequest = {
  email: 'admin@kpopdance.local',
  password: 'change-me-admin',
}

const SESSION_PRESET_STORAGE_KEY = 'kpopdance.admin.session_presets.v1'

const STATUS_OPTIONS: Array<{ label: string; value: User['status'] }> = [
  { label: 'active', value: 'active' },
  { label: 'inactive', value: 'inactive' },
  { label: 'suspended', value: 'suspended' },
]

type SessionPresetFilters = {
  sessionStatusFilter: 'all' | AdminSession['session_status']
  sessionMinScoreFilter: string
  sessionMaxErrorFilter: string
  sessionUnstableJointFilter: string
}

type SavedSessionPreset = SessionPresetFilters & {
  id: string
  name: string
  updated_at: string
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent: string
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: 'rgba(19,19,31,0.75)',
        borderColor: `${accent}33`,
      }}
    >
      <p className="text-[11px] uppercase tracking-[0.28em] text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black" style={{ color: accent }}>
        {value}
      </p>
    </div>
  )
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section
      className="rounded-3xl border p-5"
      style={{
        background: 'rgba(19,19,31,0.82)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="mb-4">
        <h2 className="text-lg font-black text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function Pill({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-gray-300">
      {text}
    </span>
  )
}

function toEditableSessionStatus(
  status: AdminSession['session_status']
): 'active' | 'completed' | 'abandoned' {
  if (status === 'completed') return 'completed'
  if (status === 'abandoned' || status === 'aborted') return 'abandoned'
  return 'active'
}

function applySessionPreset(
  preset: 'high_score' | 'low_error' | 'arm_focus' | 'knee_focus' | 'balanced' | 'reset',
  setters: {
    setSessionMinScoreFilter: (value: string) => void
    setSessionMaxErrorFilter: (value: string) => void
    setSessionUnstableJointFilter: (value: string) => void
    setSessionStatusFilter: (value: 'all' | AdminSession['session_status']) => void
  }
) {
  switch (preset) {
    case 'high_score':
      setters.setSessionMinScoreFilter('85')
      setters.setSessionMaxErrorFilter('10')
      setters.setSessionUnstableJointFilter('')
      setters.setSessionStatusFilter('completed')
      break
    case 'low_error':
      setters.setSessionMinScoreFilter('70')
      setters.setSessionMaxErrorFilter('8')
      setters.setSessionUnstableJointFilter('')
      setters.setSessionStatusFilter('all')
      break
    case 'arm_focus':
      setters.setSessionMinScoreFilter('')
      setters.setSessionMaxErrorFilter('')
      setters.setSessionUnstableJointFilter('elbow')
      setters.setSessionStatusFilter('all')
      break
    case 'knee_focus':
      setters.setSessionMinScoreFilter('')
      setters.setSessionMaxErrorFilter('')
      setters.setSessionUnstableJointFilter('knee')
      setters.setSessionStatusFilter('all')
      break
    case 'balanced':
      setters.setSessionMinScoreFilter('70')
      setters.setSessionMaxErrorFilter('14')
      setters.setSessionUnstableJointFilter('')
      setters.setSessionStatusFilter('all')
      break
    case 'reset':
      setters.setSessionMinScoreFilter('')
      setters.setSessionMaxErrorFilter('')
      setters.setSessionUnstableJointFilter('')
      setters.setSessionStatusFilter('all')
      break
  }
}

function buildPresetName(filters: SessionPresetFilters) {
  const parts: string[] = []
  if (filters.sessionStatusFilter !== 'all') parts.push(filters.sessionStatusFilter)
  if (filters.sessionMinScoreFilter) parts.push(`score>=${filters.sessionMinScoreFilter}`)
  if (filters.sessionMaxErrorFilter) parts.push(`error<=${filters.sessionMaxErrorFilter}`)
  if (filters.sessionUnstableJointFilter) parts.push(filters.sessionUnstableJointFilter)
  return parts.length ? parts.join(' · ') : '기본 필터'
}

function recommendSessionPreset(
  session: AdminSession,
  report: AnalysisReport | null
): { label: string; description: string } {
  const joints = report?.most_wrong_joints ?? session.most_wrong_joints ?? []
  const score = report?.total_score ?? session.total_score ?? 0
  const motionSimilarity = report?.motion_similarity ?? session.motion_similarity ?? 0
  const averageError = report?.average_angle_error ?? session.average_angle_error ?? 0
  const presetName = report?.report_json.scoring_profile_name ?? 'balanced'
  const presetDescription =
    report?.report_json.scoring_profile_description ?? '현재 세션에 맞는 기본 추천 프리셋입니다.'

  if (presetName && presetName !== 'default') {
    return { label: presetName, description: presetDescription }
  }

  if (joints.some((joint) => joint.includes('elbow') || joint.includes('wrist'))) {
    return {
      label: '팔 교정',
      description: '팔과 손목 오차가 큰 세션을 살펴볼 때 좋은 추천입니다.',
    }
  }

  if (joints.some((joint) => joint.includes('knee') || joint.includes('ankle'))) {
    return {
      label: '무릎 교정',
      description: '무릎과 발목의 안정성을 점검할 때 좋은 추천입니다.',
    }
  }

  if (averageError <= 10 || (score >= 85 && motionSimilarity >= 88)) {
    return {
      label: '고점수 후보',
      description: '점수와 동작 유사도가 높은 세션을 빨리 찾고 싶을 때 좋습니다.',
    }
  }

  return {
    label: '균형형',
    description: '점수, 오차, 동작 흐름을 고르게 보는 기본 추천입니다.',
  }
}

export default function AdminPage() {
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [login, setLogin] = useState(DEFAULT_LOGIN)
  const [me, setMe] = useState<User | null>(null)
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [renders, setRenders] = useState<AdminRender[]>([])
  const [rewards, setRewards] = useState<AdminReward[]>([])
  const [uploads, setUploads] = useState<AdminUploadJob[]>([])
  const [message, setMessage] = useState('')

  const [userQuery, setUserQuery] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | User['status']>('all')
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all')

  const [sessionQuery, setSessionQuery] = useState('')
  const [sessionStatusFilter, setSessionStatusFilter] = useState<'all' | AdminSession['session_status']>('all')
  const [sessionMinScoreFilter, setSessionMinScoreFilter] = useState('')
  const [sessionMaxErrorFilter, setSessionMaxErrorFilter] = useState('')
  const [sessionUnstableJointFilter, setSessionUnstableJointFilter] = useState('')
  const [savedSessionPresets, setSavedSessionPresets] = useState<SavedSessionPreset[]>([])
  const [presetName, setPresetName] = useState('')

  const [uploadQuery, setUploadQuery] = useState('')
  const [uploadStatusFilter, setUploadStatusFilter] = useState<'all' | VideoUploadStatus>('all')
  const [uploadAnalysisFilter, setUploadAnalysisFilter] = useState<'all' | 'ready' | 'pending'>('all')
  const [uploadMinScoreFilter, setUploadMinScoreFilter] = useState('')
  const [uploadMinFramesFilter, setUploadMinFramesFilter] = useState('')
  const [uploadSortMode, setUploadSortMode] = useState<
    'latest' | 'oldest' | 'score_desc' | 'score_asc' | 'frames_desc' | 'motion_desc' | 'motion_asc' | 'unstable_desc' | 'unstable_asc'
  >('latest')

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null)
  const [selectedReportLoading, setSelectedReportLoading] = useState(false)

  const [userDraft, setUserDraft] = useState({
    nickname: '',
    points: 0,
    status: 'active' as User['status'],
    is_admin: false,
  })

  const [sessionDraft, setSessionDraft] = useState<{
    session_status: 'active' | 'completed' | 'abandoned'
    started_at: string
    ended_at: string
    total_score: string
    lowest_section_score: string
    unlock_avatar_render: boolean
  }>({
    session_status: 'active',
    started_at: '',
    ended_at: '',
    total_score: '',
    lowest_section_score: '',
    unlock_avatar_render: false,
  })

  const isAdmin = Boolean(me?.is_admin)

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  )
  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  )

  const currentSessionPreset = useMemo<SessionPresetFilters>(
    () => ({
      sessionStatusFilter,
      sessionMinScoreFilter,
      sessionMaxErrorFilter,
      sessionUnstableJointFilter,
    }),
    [sessionStatusFilter, sessionMinScoreFilter, sessionMaxErrorFilter, sessionUnstableJointFilter]
  )

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase()
    return users.filter((user) => {
      const matchesQuery =
        !query ||
        user.nickname.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        String(user.id).includes(query)
      const matchesStatus = userStatusFilter === 'all' || user.status === userStatusFilter
      const matchesRole =
        userRoleFilter === 'all' ||
        (userRoleFilter === 'admin' && user.is_admin) ||
        (userRoleFilter === 'user' && !user.is_admin)
      return matchesQuery && matchesStatus && matchesRole
    })
  }, [users, userQuery, userStatusFilter, userRoleFilter])

  const filteredSessions = useMemo(() => {
    const query = sessionQuery.trim().toLowerCase()
    const minScore = sessionMinScoreFilter.trim() === '' ? null : Number(sessionMinScoreFilter)
    const maxError = sessionMaxErrorFilter.trim() === '' ? null : Number(sessionMaxErrorFilter)
    const unstableJoint = sessionUnstableJointFilter.trim().toLowerCase()

    return sessions.filter((session) => {
      const matchesQuery =
        !query ||
        String(session.id).includes(query) ||
        String(session.user_id).includes(query) ||
        String(session.dance_reference_id).includes(query)
      const matchesStatus =
        sessionStatusFilter === 'all' || session.session_status === sessionStatusFilter
      const matchesMinScore =
        minScore === null || Number.isNaN(minScore) || (session.total_score ?? Number.NEGATIVE_INFINITY) >= minScore
      const matchesMaxError =
        maxError === null || Number.isNaN(maxError) || (session.average_angle_error ?? Number.POSITIVE_INFINITY) <= maxError
      const joints = session.most_wrong_joints ?? []
      const matchesJoint =
        unstableJoint === '' || joints.some((joint) => joint.toLowerCase().includes(unstableJoint))
      return matchesQuery && matchesStatus && matchesMinScore && matchesMaxError && matchesJoint
    })
  }, [
    sessions,
    sessionQuery,
    sessionStatusFilter,
    sessionMinScoreFilter,
    sessionMaxErrorFilter,
    sessionUnstableJointFilter,
  ])

  const filteredUploads = useMemo(() => {
    const query = uploadQuery.trim().toLowerCase()
    const minScore = uploadMinScoreFilter.trim() === '' ? null : Number(uploadMinScoreFilter)
    const minFrames = uploadMinFramesFilter.trim() === '' ? null : Number(uploadMinFramesFilter)
    const analysisReady =
      uploadAnalysisFilter === 'all' ? null : uploadAnalysisFilter === 'ready'

    const filtered = uploads.filter((upload) => {
      const report = upload.analysis_report
      const score = report?.total_score ?? null
      const matchesQuery =
        !query ||
        String(upload.id).toLowerCase().includes(query) ||
        upload.original_filename.toLowerCase().includes(query) ||
        String(upload.user_id).includes(query) ||
        String(upload.dance_reference_id ?? '').includes(query)
      const matchesStatus = uploadStatusFilter === 'all' || upload.status === uploadStatusFilter
      const matchesAnalysis =
        analysisReady === null ? true : Boolean(upload.analysis_ready) === analysisReady
      const matchesMinScore =
        minScore === null || Number.isNaN(minScore) || (score ?? Number.NEGATIVE_INFINITY) >= minScore
      const matchesMinFrames =
        minFrames === null ||
        Number.isNaN(minFrames) ||
        (upload.extracted_frame_count ?? 0) >= minFrames
      return matchesQuery && matchesStatus && matchesAnalysis && matchesMinScore && matchesMinFrames
    })

    return filtered.sort((a, b) => {
      const aScore = a.analysis_report?.total_score ?? -1
      const bScore = b.analysis_report?.total_score ?? -1
      const aMotion = a.analysis_report?.motion_similarity ?? -1
      const bMotion = b.analysis_report?.motion_similarity ?? -1
      const aFrames = a.extracted_frame_count ?? 0
      const bFrames = b.extracted_frame_count ?? 0
      const aUnstable = a.analysis_report?.most_wrong_joints?.length ?? 0
      const bUnstable = b.analysis_report?.most_wrong_joints?.length ?? 0
      const aTime = new Date(a.created_at ?? '').getTime()
      const bTime = new Date(b.created_at ?? '').getTime()

      switch (uploadSortMode) {
        case 'oldest':
          return aTime - bTime
        case 'score_desc':
          return bScore - aScore
        case 'score_asc':
          return aScore - bScore
        case 'frames_desc':
          return bFrames - aFrames
        case 'motion_desc':
          return bMotion - aMotion
        case 'motion_asc':
          return aMotion - bMotion
        case 'unstable_desc':
          return bUnstable - aUnstable
        case 'unstable_asc':
          return aUnstable - bUnstable
        case 'latest':
        default:
          return bTime - aTime
      }
    })
  }, [uploads, uploadQuery, uploadStatusFilter, uploadAnalysisFilter, uploadMinScoreFilter, uploadMinFramesFilter, uploadSortMode])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SESSION_PRESET_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as SavedSessionPreset[]
      if (Array.isArray(parsed)) {
        setSavedSessionPresets(
          parsed.filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
        )
      }
    } catch {
      setSavedSessionPresets([])
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(SESSION_PRESET_STORAGE_KEY, JSON.stringify(savedSessionPresets))
    } catch {
      // ignore storage failures
    }
  }, [savedSessionPresets])

  useEffect(() => {
    if (!filteredUsers.length) {
      setSelectedUserId(null)
      return
    }
    if (selectedUserId === null || !filteredUsers.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(filteredUsers[0].id)
    }
  }, [filteredUsers, selectedUserId])

  useEffect(() => {
    if (!filteredSessions.length) {
      setSelectedSessionId(null)
      return
    }
    if (selectedSessionId === null || !filteredSessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(filteredSessions[0].id)
    }
  }, [filteredSessions, selectedSessionId])

  useEffect(() => {
    if (!selectedUser) return
    setUserDraft({
      nickname: selectedUser.nickname,
      points: selectedUser.points,
      status: selectedUser.status,
      is_admin: Boolean(selectedUser.is_admin),
    })
  }, [selectedUser])

  useEffect(() => {
    if (!selectedSession) {
      setSelectedReport(null)
      return
    }

    let cancelled = false
    setSelectedReportLoading(true)

    api.report
      .getBySessionId(String(selectedSession.id))
      .then((report) => {
        if (!cancelled) setSelectedReport(report)
      })
      .catch(() => {
        if (!cancelled) setSelectedReport(null)
      })
      .finally(() => {
        if (!cancelled) setSelectedReportLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedSession])

  const refreshUsers = async () => {
    const data = await api.admin.listUsers()
    setUsers(data)
  }

  const refreshSessions = async () => {
    const data = await api.admin.listSessions({
      status: sessionStatusFilter === 'all' ? undefined : sessionStatusFilter,
      min_score:
        sessionMinScoreFilter.trim() === '' || Number.isNaN(Number(sessionMinScoreFilter))
          ? undefined
          : Number(sessionMinScoreFilter),
      max_error:
        sessionMaxErrorFilter.trim() === '' || Number.isNaN(Number(sessionMaxErrorFilter))
          ? undefined
          : Number(sessionMaxErrorFilter),
      unstable_joint: sessionUnstableJointFilter.trim() || undefined,
    })
    setSessions(data)
  }

  const refreshUploads = async () => {
    const data = await api.admin.listUploads({
      status: uploadStatusFilter === 'all' ? undefined : uploadStatusFilter,
      min_score:
        uploadMinScoreFilter.trim() === '' || Number.isNaN(Number(uploadMinScoreFilter))
          ? undefined
          : Number(uploadMinScoreFilter),
      analysis_ready:
        uploadAnalysisFilter === 'all' ? undefined : uploadAnalysisFilter === 'ready',
      query: uploadQuery.trim() || undefined,
    })
    setUploads(data)
  }

  const syncData = async () => {
    setLoadState('loading')
    setMessage('')

    try {
      const profile = await api.auth.me()
      setMe(profile)

      if (!profile.is_admin) {
        setDashboard(null)
        setUsers([])
        setSessions([])
        setRenders([])
        setRewards([])
        setUploads([])
        setLoadState('idle')
        setMessage('관리자 로그인이 필요합니다.')
        return
      }

      const [dash, usersData, sessionsData, rendersData, rewardsData, uploadsData] = await Promise.all([
        api.admin.getDashboard(),
        api.admin.listUsers(),
        api.admin.listSessions({
          status: sessionStatusFilter === 'all' ? undefined : sessionStatusFilter,
          min_score:
            sessionMinScoreFilter.trim() === '' || Number.isNaN(Number(sessionMinScoreFilter))
              ? undefined
              : Number(sessionMinScoreFilter),
          max_error:
            sessionMaxErrorFilter.trim() === '' || Number.isNaN(Number(sessionMaxErrorFilter))
              ? undefined
              : Number(sessionMaxErrorFilter),
          unstable_joint: sessionUnstableJointFilter.trim() || undefined,
        }),
        api.admin.listRenders(),
        api.admin.listRewards(),
        api.admin.listUploads({
          status: uploadStatusFilter === 'all' ? undefined : uploadStatusFilter,
          min_score:
            uploadMinScoreFilter.trim() === '' || Number.isNaN(Number(uploadMinScoreFilter))
              ? undefined
              : Number(uploadMinScoreFilter),
          analysis_ready:
            uploadAnalysisFilter === 'all' ? undefined : uploadAnalysisFilter === 'ready',
          query: uploadQuery.trim() || undefined,
        }),
      ])

      setDashboard(dash)
      setUsers(usersData)
      setSessions(sessionsData)
      setRenders(rendersData)
      setRewards(rewardsData)
      setUploads(uploadsData)
      setLoadState('ready')
      setMessage('관리자 대시보드를 불러왔습니다.')
    } catch {
      setMe(null)
      setDashboard(null)
      setUsers([])
      setSessions([])
      setRenders([])
      setRewards([])
      setUploads([])
      setSelectedReport(null)
      setLoadState('error')
      setMessage('관리자 정보를 불러오지 못했습니다.')
    }
  }

  useEffect(() => {
    void syncData()
  }, [])

  useEffect(() => {
    if (!isAdmin || loadState !== 'ready') return
    const timer = window.setTimeout(() => {
      void refreshSessions().catch(() => setMessage('세션 목록을 다시 불러오지 못했습니다.'))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [
    isAdmin,
    loadState,
    sessionStatusFilter,
    sessionMinScoreFilter,
    sessionMaxErrorFilter,
    sessionUnstableJointFilter,
  ])

  useEffect(() => {
    if (!isAdmin || loadState !== 'ready') return
    const timer = window.setTimeout(() => {
      void refreshUploads().catch(() => setMessage('업로드 목록을 다시 불러오지 못했습니다.'))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [
    isAdmin,
    loadState,
    uploadStatusFilter,
    uploadAnalysisFilter,
    uploadMinScoreFilter,
    uploadMinFramesFilter,
    uploadSortMode,
    uploadQuery,
  ])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoadState('loading')
    setMessage('')

    try {
      await api.auth.login(login)
      await syncData()
      setMessage('로그인에 성공했습니다.')
    } catch {
      setLoadState('error')
      setMessage('로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.')
    }
  }

  const handleLogout = () => {
    api.auth.logout()
    setMe(null)
    setDashboard(null)
    setUsers([])
    setSessions([])
    setRenders([])
    setRewards([])
    setUploads([])
    setSelectedUserId(null)
    setSelectedSessionId(null)
    setSelectedReport(null)
    setLoadState('idle')
    setMessage('로그아웃했습니다.')
  }

  const updateSelectedUser = async () => {
    if (!selectedUser) return
    const updated = await api.admin.updateUser(selectedUser.id, {
      nickname: userDraft.nickname,
      points: userDraft.points,
      status: userDraft.status,
      is_admin: userDraft.is_admin,
    })
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    setMe((current) => (current?.id === updated.id ? updated : current))
    await syncData()
    setMessage(`사용자 #${updated.id} 정보를 저장했습니다.`)
  }

  const updateSelectedSession = async () => {
    if (!selectedSession) return
    const updated = await api.admin.updateSession(selectedSession.id, {
      session_status: sessionDraft.session_status,
      started_at: sessionDraft.started_at ? new Date(sessionDraft.started_at).toISOString() : undefined,
      ended_at: sessionDraft.ended_at ? new Date(sessionDraft.ended_at).toISOString() : '',
      total_score: sessionDraft.total_score === '' ? undefined : Number(sessionDraft.total_score),
      lowest_section_score:
        sessionDraft.lowest_section_score === '' ? undefined : Number(sessionDraft.lowest_section_score),
      unlock_avatar_render: sessionDraft.unlock_avatar_render,
    })
    setSessions((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    await syncData()
    setMessage(`세션 #${updated.id} 정보를 저장했습니다.`)
  }

  const quickToggleAdmin = async (user: User) => {
    const updated = await api.admin.updateUser(user.id, {
      is_admin: !user.is_admin,
      status: user.status,
      nickname: user.nickname,
      points: user.points,
    })
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    await syncData()
    setMessage(`사용자 #${updated.id}의 관리자 권한을 바꿨습니다.`)
  }

  const quickUpdateStatus = async (user: User, status: User['status']) => {
    const updated = await api.admin.updateUser(user.id, {
      status,
      is_admin: Boolean(user.is_admin),
      nickname: user.nickname,
      points: user.points,
    })
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    await syncData()
    setMessage(`사용자 #${updated.id} 상태를 ${status}로 바꿨습니다.`)
  }

  const saveCurrentSessionPreset = () => {
    const name = presetName.trim() || buildPresetName(currentSessionPreset)
    const updatedPreset: SavedSessionPreset = {
      id: `${Date.now()}`,
      name,
      updated_at: new Date().toISOString(),
      ...currentSessionPreset,
    }

    setSavedSessionPresets((current) => {
      const next = current.filter((preset) => preset.name !== name)
      return [updatedPreset, ...next].slice(0, 12)
    })
    setMessage(`프리셋 "${name}"을 저장했습니다.`)
  }

  const loadSavedSessionPreset = (preset: SavedSessionPreset) => {
    setSessionStatusFilter(preset.sessionStatusFilter)
    setSessionMinScoreFilter(preset.sessionMinScoreFilter)
    setSessionMaxErrorFilter(preset.sessionMaxErrorFilter)
    setSessionUnstableJointFilter(preset.sessionUnstableJointFilter)
    setPresetName(preset.name)
    setMessage(`프리셋 "${preset.name}"을 불러왔습니다.`);
  }

  const deleteSavedSessionPreset = (presetId: string) => {
    setSavedSessionPresets((current) => current.filter((preset) => preset.id !== presetId))
  }

  return (
    <main className="mx-auto min-h-dvh max-w-7xl px-5 py-8 md:px-8">
      <div className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.35em] text-fuchsia-300">Admin Console</p>
        <h1 className="text-4xl font-black text-white md:text-5xl">관리자 대시보드</h1>
        <p className="mt-3 max-w-2xl text-sm text-gray-400">
          사용자, 세션, 업로드, 리포트를 한 화면에서 확인하고 바로 수정할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <SectionCard title="로그인 / 세션">
          <form className="space-y-3" onSubmit={handleLogin}>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-400">Email</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                value={login.email}
                onChange={(event) => setLogin((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-400">Password</span>
              <input
                type="password"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                value={login.password}
                onChange={(event) =>
                  setLogin((current) => ({ ...current, password: event.target.value }))
                }
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl py-3 font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #b041ff, #ff2d78)' }}
            >
              로그인
            </button>
          </form>

          <div className="mt-4 space-y-2 text-sm text-gray-300">
            <p>현재 상태: {loadState}</p>
            <p>권한: {isAdmin ? 'admin' : 'guest'}</p>
            {message && <p className="text-fuchsia-300">{message}</p>}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-200"
            >
              로그아웃
            </button>
            <button
              type="button"
              onClick={() => void syncData()}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-200"
            >
              새로고침
            </button>
          </div>
        </SectionCard>

        <div className="grid gap-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Users" value={dashboard?.counts.users ?? 0} accent="#b041ff" />
            <StatCard label="Sessions" value={dashboard?.counts.sessions ?? 0} accent="#00e5ff" />
            <StatCard label="Renders" value={dashboard?.counts.renders ?? 0} accent="#ffd700" />
            <StatCard label="Reports" value={dashboard?.counts.reports ?? 0} accent="#ff2d78" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
            <div className="grid gap-6">
              <SectionCard
                title="사용자 관리"
                subtitle="검색과 필터로 좁힌 뒤, 행을 클릭하면 오른쪽에서 바로 편집할 수 있습니다."
              >
                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_120px_120px]">
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    placeholder="닉네임, 이메일, ID 검색"
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                  />
                  <select
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    value={userStatusFilter}
                    onChange={(event) => setUserStatusFilter(event.target.value as typeof userStatusFilter)}
                  >
                    <option value="all">상태 전체</option>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="suspended">suspended</option>
                  </select>
                  <select
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    value={userRoleFilter}
                    onChange={(event) => setUserRoleFilter(event.target.value as typeof userRoleFilter)}
                  >
                    <option value="all">권한 전체</option>
                    <option value="admin">admin</option>
                    <option value="user">user</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {filteredUsers.map((user) => {
                    const isSelected = user.id === selectedUser?.id
                    return (
                      <div
                        key={user.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedUserId(user.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedUserId(user.id)
                          }
                        }}
                        className="grid cursor-pointer gap-3 rounded-2xl border bg-black/20 p-4 transition-colors md:grid-cols-[1fr_auto_auto]"
                        style={{
                          borderColor: isSelected ? 'rgba(176,65,255,0.45)' : 'rgba(255,255,255,0.10)',
                          boxShadow: isSelected ? '0 0 0 1px rgba(176,65,255,0.15)' : 'none',
                        }}
                      >
                        <div>
                          <p className="font-semibold text-white">
                            {user.nickname} <span className="text-xs text-gray-500">#{user.id}</span>
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Pill text={user.status} />
                          <Pill text={user.is_admin ? 'admin' : 'user'} />
                        </div>
                        <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              void quickToggleAdmin(user)
                            }}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white"
                          >
                            {user.is_admin ? '권한 회수' : '관리자 승격'}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              void quickUpdateStatus(user, 'active')
                            }}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white"
                          >
                            활성화
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              void quickUpdateStatus(user, 'suspended')
                            }}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white"
                          >
                            정지
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {!filteredUsers.length && (
                  <p className="mt-3 text-sm text-gray-500">검색 결과가 없습니다.</p>
                )}
              </SectionCard>

              <SectionCard
                title="최근 세션"
                subtitle="필터로 찾고, 선택하면 오른쪽에서 상태와 리포트를 함께 볼 수 있습니다."
              >
                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_160px]">
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    placeholder="세션 ID, 사용자 ID, 안무 ID 검색"
                    value={sessionQuery}
                    onChange={(event) => setSessionQuery(event.target.value)}
                  />
                  <select
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    value={sessionStatusFilter}
                    onChange={(event) =>
                      setSessionStatusFilter(event.target.value as typeof sessionStatusFilter)
                    }
                  >
                    <option value="all">세션 전체</option>
                    <option value="active">active</option>
                    <option value="completed">completed</option>
                    <option value="abandoned">abandoned</option>
                  </select>
                </div>

                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                      최소 평균 점수
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      placeholder="예: 70"
                      value={sessionMinScoreFilter}
                      onChange={(event) => setSessionMinScoreFilter(event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                      최대 평균 오차
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      step="0.1"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      placeholder="예: 12"
                      value={sessionMaxErrorFilter}
                      onChange={(event) => setSessionMaxErrorFilter(event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                      불안정 관절
                    </span>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      placeholder="예: left_knee"
                      value={sessionUnstableJointFilter}
                      onChange={(event) => setSessionUnstableJointFilter(event.target.value)}
                    />
                  </label>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      applySessionPreset('high_score', {
                        setSessionMinScoreFilter,
                        setSessionMaxErrorFilter,
                        setSessionUnstableJointFilter,
                        setSessionStatusFilter,
                      })
                    }
                    className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200"
                  >
                    고점수 후보
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applySessionPreset('low_error', {
                        setSessionMinScoreFilter,
                        setSessionMaxErrorFilter,
                        setSessionUnstableJointFilter,
                        setSessionStatusFilter,
                      })
                    }
                    className="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-200"
                  >
                    오차 우선
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applySessionPreset('arm_focus', {
                        setSessionMinScoreFilter,
                        setSessionMaxErrorFilter,
                        setSessionUnstableJointFilter,
                        setSessionStatusFilter,
                      })
                    }
                    className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200"
                  >
                    팔 교정
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applySessionPreset('knee_focus', {
                        setSessionMinScoreFilter,
                        setSessionMaxErrorFilter,
                        setSessionUnstableJointFilter,
                        setSessionStatusFilter,
                      })
                    }
                    className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200"
                  >
                    무릎 교정
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applySessionPreset('balanced', {
                        setSessionMinScoreFilter,
                        setSessionMaxErrorFilter,
                        setSessionUnstableJointFilter,
                        setSessionStatusFilter,
                      })
                    }
                    className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-violet-200"
                  >
                    균형형
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applySessionPreset('reset', {
                        setSessionMinScoreFilter,
                        setSessionMaxErrorFilter,
                        setSessionUnstableJointFilter,
                        setSessionStatusFilter,
                      })
                    }
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200"
                  >
                    필터 초기화
                  </button>
                </div>

                <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <label className="block flex-1">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                        저장할 프리셋 이름
                      </span>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                        placeholder="예: 무릎 교정 체크"
                        value={presetName}
                        onChange={(event) => setPresetName(event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={saveCurrentSessionPreset}
                      className="rounded-xl px-4 py-3 text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #00c2ff, #b041ff)' }}
                    >
                      현재 프리셋 저장
                    </button>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-500">
                      저장된 프리셋
                    </p>
                    {savedSessionPresets.length ? (
                      <div className="flex flex-wrap gap-2">
                        {savedSessionPresets.map((preset) => (
                          <div
                            key={preset.id}
                            className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2"
                          >
                            <button
                              type="button"
                              onClick={() => loadSavedSessionPreset(preset)}
                              className="text-xs font-semibold text-white"
                            >
                              {preset.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSavedSessionPreset(preset.id)}
                              className="text-[10px] text-gray-500"
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">저장된 프리셋이 없습니다.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredSessions.slice(0, 6).map((session) => {
                    const isSelected = session.id === selectedSession?.id
                    const score = session.total_score ?? 0
                    const motionSimilarity = session.motion_similarity ?? 0
                    const averageError = session.average_angle_error ?? 0
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setSelectedSessionId(session.id)}
                        className="flex w-full items-center justify-between rounded-2xl border bg-black/20 px-4 py-3 text-left transition-colors"
                        style={{
                          borderColor: isSelected ? 'rgba(0,229,255,0.45)' : 'rgba(255,255,255,0.10)',
                        }}
                      >
                        <div>
                          <p className="font-semibold text-white">Session #{session.id}</p>
                          <p className="text-xs text-gray-500">
                            user {session.user_id} · dance {session.dance_reference_id}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-400">
                            점수 {Math.round(score)} · 유사도 {Math.round(motionSimilarity)}% · 오차{' '}
                            {averageError.toFixed(1)}°
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-gray-300">
                            {session.session_status}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            불안정 {session.unstable_joint_count ?? session.most_wrong_joints?.length ?? 0}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {!filteredSessions.length && (
                  <p className="mt-3 text-sm text-gray-500">검색 결과가 없습니다.</p>
                )}
              </SectionCard>

              <SectionCard title="업로드 목록" subtitle="업로드 상태와 분석 완료 여부를 함께 확인할 수 있습니다.">
                <div className="grid gap-3 md:grid-cols-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-400">검색</span>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      placeholder="업로드 ID / 파일명"
                      value={uploadQuery}
                      onChange={(event) => setUploadQuery(event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-400">업로드 상태</span>
                    <select
                      value={uploadStatusFilter}
                      onChange={(event) => setUploadStatusFilter(event.target.value as VideoUploadStatus | 'all')}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="all">all</option>
                      <option value="uploaded">uploaded</option>
                      <option value="completed">completed</option>
                      <option value="failed">failed</option>
                      <option value="extraction_unavailable">extraction_unavailable</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-400">분석 상태</span>
                    <select
                      value={uploadAnalysisFilter}
                      onChange={(event) =>
                        setUploadAnalysisFilter(event.target.value as 'all' | 'ready' | 'pending')
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="all">all</option>
                      <option value="ready">ready</option>
                      <option value="pending">pending</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-400">최소 점수</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={uploadMinScoreFilter}
                      onChange={(event) => setUploadMinScoreFilter(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-400">최소 프레임</span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={uploadMinFramesFilter}
                      onChange={(event) => setUploadMinFramesFilter(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-400">정렬</span>
                    <select
                      value={uploadSortMode}
                      onChange={(event) =>
                        setUploadSortMode(
                          event.target.value as
                            | 'latest'
                            | 'oldest'
                            | 'score_desc'
                            | 'score_asc'
                            | 'frames_desc'
                            | 'motion_desc'
                            | 'motion_asc'
                            | 'unstable_desc'
                            | 'unstable_asc'
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="latest">최신순</option>
                      <option value="oldest">오래된순</option>
                      <option value="score_desc">고득점순</option>
                      <option value="score_asc">저득점순</option>
                      <option value="frames_desc">프레임 많은순</option>
                      <option value="motion_desc">유사도 높은순</option>
                      <option value="motion_asc">유사도 낮은순</option>
                      <option value="unstable_desc">불안정 관절 많은순</option>
                      <option value="unstable_asc">불안정 관절 적은순</option>
                    </select>
                  </label>
                  <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-xs text-gray-400 lg:col-span-2">
                    업로드 카드가 이 정렬 기준에 맞춰 즉시 재배열됩니다.
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {filteredUploads.length ? (
                    filteredUploads.map((upload) => (
                      <div key={upload.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{upload.original_filename}</p>
                            <p className="text-xs text-gray-500">{upload.id}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Pill text={upload.status} />
                            <Pill text={upload.analysis_ready ? 'analysis ready' : 'analysis pending'} />
                            <Pill text={`${upload.extracted_frame_count} frames`} />
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 text-xs text-gray-400 sm:grid-cols-2">
                          <p>user {upload.user_id}</p>
                          <p>dance {upload.dance_reference_id ?? '-'}</p>
                          <p>score {upload.analysis_report?.total_score ?? '-'}</p>
                          <p>source {upload.source_frame_count || '-'}</p>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={upload.source_video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-cyan-200"
                          >
                            원본 영상
                          </a>
                          {upload.report_url && (
                            <Link
                              href={upload.report_url}
                              className="rounded-xl border border-fuchsia-400/30 px-3 py-2 text-xs font-semibold text-fuchsia-200"
                            >
                              리포트 보기
                            </Link>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">조건에 맞는 업로드가 없습니다.</p>
                  )}
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-6">
              <SectionCard title="선택된 사용자" subtitle="닉네임, 포인트, 권한, 상태를 바로 수정할 수 있습니다.">
                {selectedUser ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-1">
                      <p className="text-lg font-semibold text-white">{selectedUser.nickname}</p>
                      <p className="text-xs text-gray-500">{selectedUser.email}</p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Pill text={`#${selectedUser.id}`} />
                        <Pill text={selectedUser.status} />
                        <Pill text={selectedUser.is_admin ? 'admin' : 'user'} />
                      </div>
                    </div>

                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-gray-400">닉네임</span>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                        value={userDraft.nickname}
                        onChange={(event) =>
                          setUserDraft((current) => ({ ...current, nickname: event.target.value }))
                        }
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-gray-400">포인트</span>
                        <input
                          type="number"
                          min={0}
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                          value={userDraft.points}
                          onChange={(event) =>
                            setUserDraft((current) => ({
                              ...current,
                              points: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-gray-400">상태</span>
                        <select
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                          value={userDraft.status}
                          onChange={(event) =>
                            setUserDraft((current) => ({
                              ...current,
                              status: event.target.value as User['status'],
                            }))
                          }
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={userDraft.is_admin}
                        onChange={(event) =>
                          setUserDraft((current) => ({
                            ...current,
                            is_admin: event.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm text-gray-200">관리자 권한</span>
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void updateSelectedUser()}
                        className="rounded-xl px-4 py-2.5 font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #b041ff, #ff2d78)' }}
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedUser) return
                          setUserDraft({
                            nickname: selectedUser.nickname,
                            points: selectedUser.points,
                            status: selectedUser.status,
                            is_admin: Boolean(selectedUser.is_admin),
                          })
                        }}
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-200"
                      >
                        되돌리기
                      </button>
                    </div>

                    <p className="text-xs text-gray-500">생성일: {formatDateTime(selectedUser.created_at)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">선택된 사용자가 없습니다.</p>
                )}
              </SectionCard>

              <SectionCard title="선택된 세션" subtitle="클릭한 세션의 리포트와 상태를 바로 확인할 수 있습니다.">
                {selectedSession ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-white">Session #{selectedSession.id}</p>
                        <Pill text={selectedSession.session_status} />
                      </div>
                      <p className="text-xs text-gray-500">user {selectedSession.user_id}</p>
                      <p className="text-xs text-gray-500">dance {selectedSession.dance_reference_id}</p>
                      <p className="text-xs text-gray-500">시작: {formatDateTime(selectedSession.started_at)}</p>
                      <p className="text-xs text-gray-500">종료: {formatDateTime(selectedSession.ended_at)}</p>
                      <p className="text-xs text-gray-500">
                        총점: {selectedSession.total_score ?? '-'} / 최저 구간: {selectedSession.lowest_section_score ?? '-'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">동작 유사도</p>
                        <p className="mt-1 text-lg font-black text-cyan-300">
                          {Math.round(selectedSession.motion_similarity ?? 0)}%
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">평균 오차</p>
                        <p className="mt-1 text-lg font-black text-rose-300">
                          {(selectedSession.average_angle_error ?? 0).toFixed(1)}°
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">불안정 관절</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(selectedSession.most_wrong_joints ?? []).length > 0 ? (
                          selectedSession.most_wrong_joints!.map((joint) => <Pill key={joint} text={joint} />)
                        ) : (
                          <span className="text-sm text-gray-400">없음</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">추천 프리셋</p>
                      {(() => {
                        const preset = recommendSessionPreset(selectedSession, selectedReport)
                        return (
                          <>
                            <p className="mt-1 text-sm font-semibold text-white">{preset.label}</p>
                            <p className="mt-1 text-xs leading-relaxed text-gray-400">{preset.description}</p>
                          </>
                        )
                      })()}
                    </div>

                    <div className="grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-gray-400">시작 시각</span>
                          <input
                            type="datetime-local"
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                            value={sessionDraft.started_at}
                            onChange={(event) =>
                              setSessionDraft((current) => ({ ...current, started_at: event.target.value }))
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-gray-400">종료 시각</span>
                          <input
                            type="datetime-local"
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                            value={sessionDraft.ended_at}
                            onChange={(event) =>
                              setSessionDraft((current) => ({ ...current, ended_at: event.target.value }))
                            }
                          />
                        </label>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-gray-400">총점</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                            value={sessionDraft.total_score}
                            onChange={(event) =>
                              setSessionDraft((current) => ({ ...current, total_score: event.target.value }))
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-gray-400">최저 구간 점수</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                            value={sessionDraft.lowest_section_score}
                            onChange={(event) =>
                              setSessionDraft((current) => ({
                                ...current,
                                lowest_section_score: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>

                      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={sessionDraft.unlock_avatar_render}
                          onChange={(event) =>
                            setSessionDraft((current) => ({
                              ...current,
                              unlock_avatar_render: event.target.checked,
                            }))
                          }
                        />
                        <span className="text-sm text-gray-200">아바타 렌더 해금</span>
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-gray-400">세션 상태</span>
                        <select
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                          value={sessionDraft.session_status}
                          onChange={(event) =>
                            setSessionDraft((current) => ({
                              ...current,
                              session_status: event.target.value as 'active' | 'completed' | 'abandoned',
                            }))
                          }
                        >
                          <option value="active">active</option>
                          <option value="completed">completed</option>
                          <option value="abandoned">abandoned</option>
                        </select>
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void updateSelectedSession()}
                          className="rounded-xl px-4 py-2.5 font-bold text-white"
                          style={{ background: 'linear-gradient(135deg, #00c2ff, #b041ff)' }}
                        >
                          세션 저장
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedSession) return
                            setSessionDraft({
                              session_status: toEditableSessionStatus(selectedSession.session_status),
                              started_at: selectedSession.started_at.slice(0, 16),
                              ended_at: selectedSession.ended_at ? selectedSession.ended_at.slice(0, 16) : '',
                              total_score:
                                selectedSession.total_score === undefined || selectedSession.total_score === null
                                  ? ''
                                  : String(selectedSession.total_score),
                              lowest_section_score:
                                selectedSession.lowest_section_score === undefined ||
                                selectedSession.lowest_section_score === null
                                  ? ''
                                  : String(selectedSession.lowest_section_score),
                              unlock_avatar_render: selectedSession.unlock_avatar_render,
                            })
                          }}
                          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-200"
                        >
                          되돌리기
                        </button>
                      </div>
                    </div>

                    <Link
                      href={`/report/${selectedSession.id}`}
                      className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #00c2ff, #b041ff)' }}
                    >
                      리포트 보기
                    </Link>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">분석 요약</p>
                        <p className="text-xs text-gray-500">
                          {selectedReportLoading ? '불러오는 중' : formatDateTime(selectedReport?.created_at)}
                        </p>
                      </div>

                      {selectedReport ? (
                        <div className="mt-3 space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <StatCard label="Score" value={selectedReport.total_score} accent="#ffd700" />
                            <StatCard
                              label="Weakest"
                              value={selectedReport.weakest_section?.section_name ?? '-'}
                              accent="#ff2d78"
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">동작 유사도</p>
                              <p className="mt-1 text-lg font-black text-cyan-300">
                                {Math.round(selectedReport.motion_similarity ?? 0)}%
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">평균 오차</p>
                              <p className="mt-1 text-lg font-black text-rose-300">
                                {selectedReport.average_angle_error.toFixed(1)}°
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">불안정 관절</p>
                              <p className="mt-1 text-lg font-black text-amber-300">
                                {selectedReport.most_wrong_joints.length}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed text-gray-300">
                            {selectedReport.report_json.coach_comment}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedReport.most_wrong_joints.slice(0, 3).map((joint) => (
                              <Pill key={joint} text={joint} />
                            ))}
                          </div>
                          <ul className="space-y-2">
                            {selectedReport.report_json.improvement_tips.slice(0, 3).map((tip) => (
                              <li
                                key={tip}
                                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-300"
                              >
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-gray-500">
                          {selectedReportLoading ? '리포트를 불러오는 중입니다.' : '아직 리포트가 없습니다.'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">선택된 세션이 없습니다.</p>
                )}
              </SectionCard>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="렌더 상태" subtitle="최근 아바타 렌더 작업의 상태를 확인합니다.">
              <div className="space-y-3">
                {renders.map((render) => (
                  <div
                    key={render.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-white">Render #{render.id}</p>
                      <p className="text-xs text-gray-500">
                        session {render.session_id} · avatar {render.avatar_id}
                      </p>
                    </div>
                    <span className="text-xs text-gray-300">{render.render_status}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="리워드 목록" subtitle="운영 중인 보상 아이템을 확인합니다.">
              <div className="space-y-3">
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-white">{reward.item_name}</p>
                      <p className="text-xs text-gray-500">{reward.item_type}</p>
                    </div>
                    <p className="font-bold text-amber-300 text-sm">{reward.price_points}P</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  )
}
