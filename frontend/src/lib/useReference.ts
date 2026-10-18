import { useEffect, useState } from 'react'
import { api } from './api'
import { toSearchParams, fromSearchParams } from './prefs'
import type { College, Meta, Preferences, Transit } from './types'

export interface Reference {
  meta: Meta
  colleges: College[]
}

let refPromise: Promise<Reference> | null = null
let transitPromise: Promise<Transit> | null = null

function loadReference(): Promise<Reference> {
  refPromise ??= Promise.all([api.meta(), api.colleges()]).then(([meta, colleges]) => ({ meta, colleges }))
  refPromise.catch(() => { refPromise = null }) // allow a retry after a failure
  return refPromise
}

type State<T> = { data: T; error: null } | { data: null; error: string | null }

function useLoader<T>(load: () => Promise<T>): State<T> & { retry: () => void } {
  const [state, setState] = useState<State<T>>({ data: null, error: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    load().then(
      (data) => live && setState({ data, error: null }),
      (err: unknown) => live && setState({ data: null, error: err instanceof Error ? err.message : 'Something went wrong.' }),
    )
    return () => { live = false }
  }, [load, attempt])
  return { ...state, retry: () => { setState({ data: null, error: null }); setAttempt((a) => a + 1) } }
}

export function useReference() {
  return useLoader(loadReference)
}

function loadTransit(): Promise<Transit> {
  transitPromise ??= api.transit()
  transitPromise.catch(() => { transitPromise = null })
  return transitPromise
}

export function useTransit(): Transit | null {
  return useLoader(loadTransit).data
}

const LAST_KEY = 'nivasa.lastSearch'

/** The most recent search, so Saved and Compare can score stays the same way. */
export function rememberPreferences(p: Preferences) {
  try {
    localStorage.setItem(LAST_KEY, toSearchParams(p).toString())
  } catch {
    /* ignore */
  }
}

export function lastPreferences(): Preferences | null {
  try {
    const s = localStorage.getItem(LAST_KEY)
    return s ? fromSearchParams(new URLSearchParams(s)) : null
  } catch {
    return null
  }
}
