/**
 * hooks/useWebSocketDance.ts
 * Real-time dance stream manager.
 * Contract v1 is SSE: EventSource receives LiveFrameData from GET /api/stream/live.
 * The file name is kept for compatibility with existing imports.
 */

'use client'

import { useCallback, useEffect, useRef } from 'react'

import type { LiveFrameData } from '@/lib/types'
import { useDanceStore } from '@/store/danceStore'
import { generateMockLiveFrame, resetMockFrameCounter } from '@/lib/mock'

const MOCK_MODE = (process.env.NEXT_PUBLIC_MOCK_MODE ?? 'true') === 'true'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
const MOCK_FRAME_INTERVAL_MS = 67
const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_ATTEMPTS = 5

interface UseWebSocketDanceReturn {
  /** Opens the SSE stream for a practice session. */
  connect: (sessionId: string) => void
  disconnect: () => void
  connectedSessionId: string | null
}

export function useWebSocketDance(): UseWebSocketDanceReturn {
  const { applyLiveFrame, setWsConnectionStatus } = useDanceStore()

  const eventSourceRef = useRef<EventSource | null>(null)
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const streamUrlRef = useRef<string | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intentionalDisconnectRef = useRef(false)

  const clearMockInterval = useCallback(() => {
    if (mockIntervalRef.current !== null) {
      clearInterval(mockIntervalRef.current)
      mockIntervalRef.current = null
    }
  }, [])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.onopen = null
      eventSourceRef.current.onmessage = null
      eventSourceRef.current.onerror = null
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  const connectMock = useCallback(
    (sessionId: string) => {
      clearMockInterval()
      resetMockFrameCounter()
      setWsConnectionStatus('connecting')

      setTimeout(() => {
        setWsConnectionStatus('connected')
        mockIntervalRef.current = setInterval(() => {
          const frame: LiveFrameData = generateMockLiveFrame(sessionId)
          applyLiveFrame(frame)
        }, MOCK_FRAME_INTERVAL_MS)
      }, 600)
    },
    [applyLiveFrame, setWsConnectionStatus, clearMockInterval]
  )

  const connectReal = useCallback(
    (streamUrl: string) => {
      closeEventSource()
      clearReconnectTimer()
      setWsConnectionStatus('connecting')

      const eventSource = new EventSource(streamUrl)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        reconnectAttemptsRef.current = 0
        setWsConnectionStatus('connected')
      }

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const frame = JSON.parse(event.data as string) as LiveFrameData
          applyLiveFrame(frame)
        } catch (err) {
          console.error('[SSE] Failed to parse frame:', err)
        }
      }

      eventSource.onerror = () => {
        if (intentionalDisconnectRef.current) {
          setWsConnectionStatus('disconnected')
          return
        }

        setWsConnectionStatus('error')

        if (
          eventSource.readyState === EventSource.CLOSED &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          reconnectAttemptsRef.current += 1
          clearReconnectTimer()
          reconnectTimerRef.current = setTimeout(() => {
            if (
              !intentionalDisconnectRef.current &&
              sessionIdRef.current &&
              streamUrlRef.current
            ) {
              connectReal(streamUrlRef.current)
            }
          }, RECONNECT_DELAY_MS)
        }
      }
    },
    [applyLiveFrame, setWsConnectionStatus, closeEventSource, clearReconnectTimer]
  )

  const connect = useCallback(
    (sessionId: string) => {
      intentionalDisconnectRef.current = false
      reconnectAttemptsRef.current = 0
      sessionIdRef.current = sessionId
      // TODO(real API): prefer StartSessionResponse.stream_url if the backend returns a signed stream URL.
      streamUrlRef.current = `${API_BASE}/api/stream/live?session_id=${sessionId}`

      if (MOCK_MODE) {
        connectMock(sessionId)
      } else {
        connectReal(streamUrlRef.current)
      }
    },
    [connectMock, connectReal]
  )

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true
    clearMockInterval()
    clearReconnectTimer()
    closeEventSource()
    setWsConnectionStatus('disconnected')
    sessionIdRef.current = null
    streamUrlRef.current = null
  }, [clearMockInterval, clearReconnectTimer, closeEventSource, setWsConnectionStatus])

  useEffect(() => {
    return () => {
      intentionalDisconnectRef.current = true
      clearMockInterval()
      clearReconnectTimer()
      closeEventSource()
    }
  }, [clearMockInterval, clearReconnectTimer, closeEventSource])

  return {
    connect,
    disconnect,
    connectedSessionId: sessionIdRef.current,
  }
}
