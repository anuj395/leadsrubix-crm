/**
 * hooks/useTableConfig.ts
 *
 * Loads the dynamic table column config for a given screen by calling the
 * normalized screen-config resolve endpoint. Role is derived from the
 * authenticated user; industry can be passed explicitly (e.g. when a SuperAdmin
 * is browsing another industry's data).
 */
import { useState, useEffect, useCallback } from 'react'
import type { DbColumnConfig } from '../components/DataTable/types'
import { resolveScreen } from '../services/screenAdminService'

interface UseTableConfigResult {
  columns: DbColumnConfig[]
  loading: boolean
  error: string | null
  reload: () => void
  screenName: string
}

// Whitelist of types that the DataTable understands. Anything else falls back
// to plain text rendering.
const TABLE_TYPES = new Set(['text', 'badge', 'avatar', 'date', 'number'])

export function useTableConfig(
  screen: string,
  industryId?: string,
): UseTableConfigResult {
  const [columns, setColumns] = useState<DbColumnConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [screenName, setScreenName] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function fetchConfig() {
      try {
        if (!industryId) {
          if (!cancelled) {
            setColumns([])
            setScreenName('')
            setError('Missing industryId — cannot load table configuration')
          }
          return
        }

        const data = await resolveScreen({
          screenKey: screen,
          industryCode: industryId,
        })

        const cols: DbColumnConfig[] = data.table_headers.map((h) => ({
          key: h.key,
          label: h.label,
          type: (TABLE_TYPES.has(h.type) ? h.type : 'text') as DbColumnConfig['type'],
          visible: h.visible !== false,
          sortable: h.sortable,
        }))

        if (!cancelled) {
          setColumns(cols)
          setScreenName(industryId === 'temp0001' ? '' : (data.screen?.name || ''))
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load table config'
          setError(msg)
          setColumns([])
          setScreenName('')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchConfig()
    return () => {
      cancelled = true
    }
  }, [screen, industryId, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { columns, loading, error, reload, screenName }
}
