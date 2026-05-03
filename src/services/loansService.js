import { supabase } from './supabaseClient.js'
import { getTodayBogota } from '../utils/dates.js'

export const loansService = {
  async getAll({ status = null, userId = null, overdue = false, categoryId = null, page = 1, limit = 20 } = {}) {
    let query = supabase
      .from('loans')
      .select(`
        *,
        borrower:users!loans_user_id_fkey(id, full_name, document_id, phone),
        books(id, title, author, isbn, category_id, categories(name)),
        creator:users!loans_created_by_fkey(full_name, role),
        returner:users!loans_returned_by_fkey(full_name, role),
        loan_notifications(fine_amount, status, created_at)
      `, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (userId) query = query.eq('user_id', userId)
    if (overdue) { const today = await getTodayBogota(); query = query.lt('due_date', today).in('status', ['active', 'renewed']) }
    if (categoryId) query = query.eq('books.category_id', categoryId)

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1).order('created_at', { ascending: false })
    const { data, error, count } = await query
    if (error) throw error
    return { data, count, totalPages: Math.ceil(count / limit) }
  },

  async create(loan) {
    const { data, error } = await supabase.from('loans').insert(loan).select().single()
    if (error) throw error
    return data
  },

  async createBatch(loans) {
    const { data, error } = await supabase.from('loans').insert(loans).select()
    if (error) throw error
    return data
  },

  async markOverdue(loanId) {
    const { data, error } = await supabase
      .from('loans').update({ status: 'overdue' }).eq('id', loanId).select().single()
    if (error) throw error
    return data
  },

  async returnBook(loanId, returnedBy = null) {
    const { data, error } = await supabase
      .from('loans')
      .update({
        status: 'returned',
        return_date: await getTodayBogota(),
        returned_by: returnedBy,
      })
      .eq('id', loanId).select().single()
    if (error) throw error
    return data
  },

  async getActiveLoans() {
    const { data, error } = await supabase
      .from('active_loans_view').select('*').order('due_date')
    if (error) throw error
    return data
  },

  async getOverdue() {
    const { data, error } = await supabase
      .from('overdue_loans_view').select('*').order('days_overdue', { ascending: false })
    if (error) throw error
    return data
  },

  async updateDueDate(loanId, newDueDate) {
    const { data, error } = await supabase
      .from('loans')
      .update({ due_date: newDueDate, status: 'renewed' })
      .eq('id', loanId).select().single()
    if (error) throw error
    return data
  },

  // Préstamos activos/renovados/vencidos de un usuario (para portal lector)
  async getByUser(userId) {
    const { data, error } = await supabase
      .from('loans')
      .select('*, books(title, author, isbn)')
      .eq('user_id', userId)
      .in('status', ['active', 'renewed', 'overdue'])
      .order('due_date')
    if (error) throw error
    return data
  },

  async autoMarkOverdue() {
    const { error } = await supabase.rpc('mark_overdue_loans')
    if (error) console.warn('autoMarkOverdue:', error.message)
  },
}
