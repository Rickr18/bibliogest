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
    const { data, error } = await supabase
      .from('loans')
      .select('book_id, books(title, author)')
      .order('created_at', { ascending: false })
    if (error) throw error
    const counts = {}
    data.forEach(l => {
      if (!counts[l.book_id]) counts[l.book_id] = { ...l.books, count: 0 }
      counts[l.book_id].count++
    })
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, limit)
  }
}
