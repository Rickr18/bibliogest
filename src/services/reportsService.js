import { supabase } from './supabaseClient'

export const reportsService = {
  // Todos los préstamos del año para exportación (sin paginación)
  async getAllLoansForExport(year = new Date().getFullYear()) {
    const { data, error } = await supabase
      .from('loans')
      .select(`
        loan_date, due_date, return_date, status, original_due_date,
        borrower:users!loans_user_id_fkey(full_name, document_id),
        books(title, author, categories(name)),
        creator:users!loans_created_by_fkey(full_name),
        returner:users!loans_returned_by_fkey(full_name)
      `)
      .gte('loan_date', `${year}-01-01`)
      .lte('loan_date', `${year}-12-31`)
      .order('loan_date', { ascending: false })
    if (error) throw error
    return data ?? []
  },


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
    const rpc = await supabase.rpc('get_most_loaned_books', { p_limit: limit })
    if (!rpc.error) return rpc.data ?? []

    // Fallback: dos queries separadas para evitar problemas de RLS en joins
    const { data: loans, error: loansErr } = await supabase
      .from('loans')
      .select('book_id')
    if (loansErr) throw loansErr

    const counts = {}
    loans.forEach(l => {
      if (!l.book_id) return
      counts[l.book_id] = (counts[l.book_id] ?? 0) + 1
    })

    const topIds = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id)

    if (topIds.length === 0) return []

    const { data: books, error: booksErr } = await supabase
      .from('books')
      .select('id, title, author')
      .in('id', topIds)
    if (booksErr) throw booksErr

    return topIds
      .map(id => {
        const book = books.find(b => b.id === id)
        return book ? { book_id: id, title: book.title, author: book.author, count: counts[id] } : null
      })
      .filter(Boolean)
  },

  async getMostLoanedCategories(limit = 6) {
    const rpc = await supabase.rpc('get_most_loaned_categories', { p_limit: limit })
    if (!rpc.error) return rpc.data ?? []

    // Fallback: dos queries separadas
    const { data: loans, error: loansErr } = await supabase
      .from('loans')
      .select('book_id')
    if (loansErr) throw loansErr

    const bookCounts = {}
    loans.forEach(l => {
      if (!l.book_id) return
      bookCounts[l.book_id] = (bookCounts[l.book_id] ?? 0) + 1
    })

    const bookIds = Object.keys(bookCounts)
    if (bookIds.length === 0) return []

    const { data: books, error: booksErr } = await supabase
      .from('books')
      .select('id, category_id, categories(name)')
      .in('id', bookIds)
    if (booksErr) throw booksErr

    const catCounts = {}
    books.forEach(b => {
      const name = b.categories?.name
      if (name) catCounts[name] = (catCounts[name] ?? 0) + (bookCounts[b.id] ?? 0)
    })

    return Object.entries(catCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }
}
