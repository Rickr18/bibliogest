import { supabase } from './supabaseClient'

export const reportsService = {
  async getDashboardStats() {
    const { data, error } = await supabase.rpc('get_dashboard_stats')
    if (error) throw error
    return data
  },

  async getLoansByMonth(year) {
    const { data, error } = await supabase
      .from('loans')
      .select('loan_date')
      .gte('loan_date', `${year}-01-01`)
      .lte('loan_date', `${year}-12-31`)
    if (error) throw error
    // Agrupar por mes en JS
    const byMonth = Array(12).fill(0)
    data.forEach(l => {
      const month = new Date(l.loan_date).getMonth()
      byMonth[month]++
    })
    return byMonth
  },

  async getMostLoanedBooks(limit = 10) {
    // Intentar RPC (requiere migración 013); fallback a query JS
    const rpc = await supabase.rpc('get_most_loaned_books', { p_limit: limit })
    if (!rpc.error) return rpc.data ?? []

    const { data, error } = await supabase
      .from('loans')
      .select('book_id, books(title, author)')
    if (error) throw error
    const counts = {}
    data.forEach(l => {
      if (!l.book_id || !l.books) return
      if (!counts[l.book_id]) counts[l.book_id] = { ...l.books, count: 0 }
      counts[l.book_id].count++
    })
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, limit)
  },

  async getMostLoanedCategories(limit = 6) {
    // Intentar RPC (requiere migración 013); fallback a query JS
    const rpc = await supabase.rpc('get_most_loaned_categories', { p_limit: limit })
    if (!rpc.error) return rpc.data ?? []

    const { data, error } = await supabase
      .from('loans')
      .select('book_id, books(category_id, categories(name))')
    if (error) throw error
    const counts = {}
    data.forEach(l => {
      const name = l.books?.categories?.name
      if (name) counts[name] = (counts[name] ?? 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }
}
