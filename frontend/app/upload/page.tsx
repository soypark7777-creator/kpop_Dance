'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { api } from '@/lib/api'
import type { DanceReference, VideoUploadJob } from '@/lib/types'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function statusLabel(status: VideoUploadJob['status']): string {
  switch (status) {
    case 'completed':
      return '프레임 추출 완료'
    case 'processing':
      return '처리 중'
    case 'failed':
      return '추출 실패'
    case 'extraction_unavailable':
      return 'OpenCV 없음'
    default:
      return '업로드됨'
  }
}

export default function UploadPage() {
  const [dances, setDances] = useState<DanceReference[]>([])
  const [selectedDanceId, setSelectedDanceId] = useState<number | ''>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [job, setJob] = useState<VideoUploadJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    api.dance
      .getAll()
      .then((items) => {
        if (mounted) {
          setDances(items)
          setSelectedDanceId(items[0]?.id ?? '')
        }
      })
      .catch(() => {
        if (mounted) {
          setError('안무 목록을 불러오지 못했습니다.')
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedFile) {
      setVideoPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(selectedFile)
    setVideoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedFile])

  const selectedDance = useMemo(
    () => dances.find((dance) => dance.id === selectedDanceId) ?? null,
    [dances, selectedDanceId]
  )

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('업로드할 영상 파일을 선택해 주세요.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await api.upload.uploadVideo({
        file: selectedFile,
        dance_reference_id: typeof selectedDanceId === 'number' ? selectedDanceId : undefined,
        notes: notes.trim() || undefined,
      })
      setJob(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh px-5 py-6 md:py-10 text-white" style={{ background: 'linear-gradient(180deg, #09090f 0%, #0d0d18 100%)' }}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Video Ingest</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">영상 업로드와 프레임 추출</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              댄스 영상을 올리면 서버가 저장하고, 가능한 경우 프레임 미리보기를 추출합니다.
              이 결과는 이후 자세 분석과 점수 계산의 시작점이 됩니다.
            </p>
          </div>
          <Link
            href="/practice"
            className="hidden rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-200 md:inline-flex"
          >
            연습 화면
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="mb-5">
              <h2 className="text-xl font-black">업로드 설정</h2>
              <p className="mt-1 text-sm text-gray-400">파일 하나만 선택하면 서버 저장과 프레임 추출을 한 번에 시작합니다.</p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-300">기준 안무</span>
                <select
                  value={selectedDanceId}
                  onChange={(event) => setSelectedDanceId(event.target.value ? Number(event.target.value) : '')}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                >
                  {dances.map((dance) => (
                    <option key={dance.id} value={dance.id}>
                      {dance.title} - {dance.artist_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-300">영상 파일</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl border border-dashed border-white/15 bg-black/25 px-4 py-3 text-sm text-gray-300 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-sm file:font-bold file:text-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-300">메모</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder="예: 촬영 각도가 비슷한지 비교하고 싶어요."
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleUpload()}
                  disabled={loading || !selectedFile}
                  className="rounded-2xl px-5 py-3 text-sm font-black text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #00c2ff, #b041ff)' }}
                >
                  {loading ? '업로드 중...' : '영상 업로드'}
                </button>
                <Link
                  href="/practice"
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 transition-colors hover:border-white/20 hover:text-white"
                >
                  연습으로 이동
                </Link>
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <h2 className="text-xl font-black">로컬 미리보기</h2>
              <p className="mt-1 text-sm text-gray-400">선택한 영상은 업로드 전에도 바로 확인할 수 있습니다.</p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                {videoPreviewUrl ? (
                  <video src={videoPreviewUrl} controls className="h-64 w-full object-cover" />
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                    아직 선택된 영상이 없습니다.
                  </div>
                )}
              </div>
              {selectedFile && (
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{selectedFile.name}</span>
                  <span>{formatFileSize(selectedFile.size)}</span>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-cyan-400/20 bg-cyan-500/5 p-5 backdrop-blur">
              <h2 className="text-xl font-black">업로드 결과</h2>
              <p className="mt-1 text-sm text-gray-400">
                서버가 저장한 뒤, 가능한 경우 프레임 미리보기까지 추출합니다.
              </p>

              {job ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">상태</p>
                      <p className="mt-2 text-lg font-black text-cyan-200">{statusLabel(job.status)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">추출 프레임</p>
                      <p className="mt-2 text-lg font-black text-amber-200">{job.extracted_frame_count}개</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">FPS</p>
                      <p className="mt-1 font-black text-white">{job.source_fps.toFixed(1)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">프레임 수</p>
                      <p className="mt-1 font-black text-white">{job.source_frame_count || '-'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">길이</p>
                      <p className="mt-1 font-black text-white">
                        {job.source_duration_seconds ? `${job.source_duration_seconds.toFixed(1)}s` : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-semibold text-white">{job.message ?? '완료'}</p>
                    <p className="mt-1 text-xs text-gray-500">업로드 ID: {job.id}</p>
                    <p className="mt-1 text-xs text-gray-500">원본 파일: {job.original_filename}</p>
                    {selectedDance && (
                      <p className="mt-1 text-xs text-gray-500">
                        기준 안무: {selectedDance.title} - {selectedDance.artist_name}
                      </p>
                    )}
                    <a
                      href={job.source_video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:border-cyan-400/30 hover:text-cyan-100"
                    >
                      원본 영상 열기
                    </a>
                    {job.report_url && (
                      <Link
                        href={job.report_url}
                        className="mt-3 ml-3 inline-flex rounded-xl border border-fuchsia-400/30 px-3 py-2 text-xs font-semibold text-fuchsia-200 transition-colors hover:border-fuchsia-300 hover:text-fuchsia-100"
                      >
                        리포트 보기
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                  업로드 후 결과가 여기에 표시됩니다.
                </div>
              )}
            </section>
          </div>
        </section>

        {job && job.preview_frames.length > 0 && (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="mb-4">
              <h2 className="text-xl font-black">프레임 미리보기</h2>
              <p className="mt-1 text-sm text-gray-400">
                서버가 저장한 영상을 잘 잘라냈는지 이 영역에서 바로 확인할 수 있습니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {job.preview_frames.map((frame) => (
                <div key={frame.file_name} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  <img src={frame.file_url} alt={frame.file_name} className="h-40 w-full object-cover" />
                  <div className="space-y-1 p-3">
                    <p className="text-sm font-semibold text-white">#{frame.frame_index}</p>
                    <p className="text-xs text-gray-500">{frame.timestamp_seconds.toFixed(2)}s</p>
                    <p className="text-xs text-cyan-200 break-all">{frame.file_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {job && !job.frame_extraction_available && (
          <section className="rounded-3xl border border-amber-400/20 bg-amber-500/5 p-5 text-amber-100">
            <h2 className="text-lg font-black">프레임 추출이 아직 비활성화되어 있습니다</h2>
            <p className="mt-2 text-sm text-amber-100/80">
              서버에 OpenCV가 설치되면 업로드 직후 자동으로 프레임을 잘라서 보여줄 수 있습니다.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
