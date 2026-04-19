'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { api } from '@/lib/api'
import type { AuthLoginRequest, AuthRegisterRequest } from '@/lib/types'

type Mode = 'login' | 'register'

const LOGIN_DEFAULT: AuthLoginRequest = {
  email: '',
  password: '',
}

const REGISTER_DEFAULT: AuthRegisterRequest = {
  email: '',
  password: '',
  password_confirm: '',
  nickname: '',
  avatar_id: '',
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-500">{hint}</span>}
    </label>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [login, setLogin] = useState(LOGIN_DEFAULT)
  const [register, setRegister] = useState(REGISTER_DEFAULT)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const isRegisterMode = mode === 'register'

  const submitLogin = async () => {
    setLoading(true)
    setMessage('')
    try {
      const result = await api.auth.login(login)
      setMessage('로그인 성공')
      router.push(result.user.is_admin ? '/admin' : '/')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const submitRegister = async () => {
    if (register.password !== register.password_confirm) {
      setMessage('비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const result = await api.auth.register(register)
      setMessage('회원가입 성공')
      router.push(result.user.is_admin ? '/admin' : '/')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-gray-400 hover:text-white">
            ← 홈으로
          </Link>
          <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-bold text-fuchsia-300">
            로그인 · 회원가입
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section
            className="relative overflow-hidden rounded-[28px] border p-6"
            style={{
              background: 'linear-gradient(180deg, rgba(19,19,31,0.96), rgba(9,9,18,0.98))',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="absolute -top-20 right-0 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative z-10 space-y-4">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-fuchsia-300">My Avatar Dance Master</p>
              <h1 className="text-4xl font-black leading-tight text-white md:text-5xl">
                {isRegisterMode ? '새 계정을 만들고' : '다시 들어와서'}
                <span className="block bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-rose-300 bg-clip-text text-transparent">
                  춤 연습을 이어가요
                </span>
              </h1>
              <p className="max-w-xl text-sm leading-6 text-gray-400">
                회원가입을 하면 연습 기록, 리포트, 아바타 해금 흐름을 이어서 사용할 수 있어요.
                관리자는 부트스트랩 계정으로 바로 로그인할 수 있습니다.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-gray-500">1</p>
                  <p className="mt-2 text-sm font-bold text-white">회원가입</p>
                  <p className="mt-1 text-xs text-gray-500">이메일, 닉네임, 비밀번호 입력</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-gray-500">2</p>
                  <p className="mt-2 text-sm font-bold text-white">로그인</p>
                  <p className="mt-1 text-xs text-gray-500">토큰이 저장되고 API가 연결됨</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-gray-500">3</p>
                  <p className="mt-2 text-sm font-bold text-white">관리자 진입</p>
                  <p className="mt-1 text-xs text-gray-500">운영 대시보드로 이동</p>
                </div>
              </div>
            </div>
          </section>

          <section
            className="rounded-[28px] border p-6"
            style={{
              background: 'rgba(19,19,31,0.92)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  !isRegisterMode ? 'bg-white text-black' : 'text-gray-400'
                }`}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  isRegisterMode ? 'bg-white text-black' : 'text-gray-400'
                }`}
              >
                회원가입
              </button>
            </div>

            <div className="space-y-4">
              {isRegisterMode ? (
                <>
                  <Field label="이메일">
                    <input
                      type="email"
                      value={register.email}
                      onChange={(event) => setRegister((current) => ({ ...current, email: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      placeholder="you@example.com"
                    />
                  </Field>
                  <Field label="닉네임">
                    <input
                      type="text"
                      value={register.nickname}
                      onChange={(event) => setRegister((current) => ({ ...current, nickname: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      placeholder="댄서닉네임"
                    />
                  </Field>
                  <Field label="비밀번호" hint="8자 이상 입력해주세요.">
                    <input
                      type="password"
                      value={register.password}
                      onChange={(event) => setRegister((current) => ({ ...current, password: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      placeholder="비밀번호"
                    />
                  </Field>
                  <Field label="비밀번호 확인">
                    <input
                      type="password"
                      value={register.password_confirm}
                      onChange={(event) =>
                        setRegister((current) => ({ ...current, password_confirm: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      placeholder="비밀번호 다시 입력"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => void submitRegister()}
                    disabled={loading}
                    className="w-full rounded-2xl px-4 py-3.5 text-sm font-black text-white disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #b041ff, #ff2d78)' }}
                  >
                    회원가입
                  </button>
                </>
              ) : (
                <>
                  <Field label="이메일">
                    <input
                      type="email"
                      value={login.email}
                      onChange={(event) => setLogin((current) => ({ ...current, email: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      placeholder="you@example.com"
                    />
                  </Field>
                  <Field label="비밀번호">
                    <input
                      type="password"
                      value={login.password}
                      onChange={(event) => setLogin((current) => ({ ...current, password: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      placeholder="비밀번호"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => void submitLogin()}
                    disabled={loading}
                    className="w-full rounded-2xl px-4 py-3.5 text-sm font-black text-white disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #00c2ff, #b041ff)' }}
                  >
                    로그인
                  </button>
                </>
              )}

              {message && (
                <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-200">
                  {message}
                </p>
              )}

              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-gray-400">
                <p className="font-semibold text-gray-200">관리자 로그인</p>
                <p className="mt-1">기본 관리자 계정은 `admin@kpopdance.local` / `change-me-admin` 입니다.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
