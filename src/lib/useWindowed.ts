// R89 — reusable windowed-render hook. Any list view renders at most `page × pageSize`
// rows at a time (with an explicit Load-more), so the DOM stays bounded no matter how
// large the underlying dataset grows. Pairs with useMemo'd derivations upstream.
import { useEffect, useMemo, useState } from 'react'

export function useWindowed<T>(items: T[], pageSize = 30) {
  const [page, setPage] = useState(1)
  // Reset the window when the underlying list identity/size changes (filter, new data).
  useEffect(() => { setPage(1) }, [items.length])
  const visible = useMemo(() => items.slice(0, page * pageSize), [items, page, pageSize])
  return {
    visible,
    total: items.length,
    hasMore: visible.length < items.length,
    remaining: Math.max(0, items.length - visible.length),
    loadMore: () => setPage((p) => p + 1),
  }
}
