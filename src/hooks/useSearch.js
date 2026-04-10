import { useState, useCallback, useEffect } from 'react'
import { useDebounce } from './useDebounce'

export function useSearch(initialFilters = {}) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 350)

  // Reset page cuando cambia búsqueda o filtros
  useEffect(() => { setPage(1) }, [debouncedSearch, filters])

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setSearch('')
    setFilters(initialFilters)
    setPage(1)
  }, [initialFilters])

  return {
    search,
    setSearch,
    debouncedSearch,
    filters,
    updateFilter,
    clearFilters,
    page,
    setPage,
  }
}
