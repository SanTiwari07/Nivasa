import { useSyncExternalStore } from 'react'

/** A tiny persisted list of listing ids (saved stays, compare tray), shared across components. */
function createIdStore(key: string, max: number) {
  const listeners = new Set<() => void>()
  let ids: string[] = read()

  function read(): string[] {
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max) : []
    } catch {
      return []
    }
  }
  function write(next: string[]) {
    ids = next
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* storage unavailable: keep in memory for this tab */
    }
    listeners.forEach((l) => l())
  }
  return {
    subscribe(l: () => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    get: () => ids,
    has: (id: string) => ids.includes(id),
    /** Returns false when the list is full. */
    toggle(id: string): boolean {
      if (ids.includes(id)) {
        write(ids.filter((x) => x !== id))
        return true
      }
      if (ids.length >= max) return false
      write([...ids, id])
      return true
    },
    clear: () => write([]),
  }
}

export const savedStore = createIdStore('nivasa.saved', 50)
export const compareStore = createIdStore('nivasa.compare', 3)
export const COMPARE_MAX = 3

export function useIds(store: typeof savedStore): string[] {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
