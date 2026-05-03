import { supabase } from './supabaseClient.js'

export const finesService = {
  async record({ loanId, userId, collectedBy, amount, daysOverdue, waived = false, waivedReason = null, notes = null }) {
    const { data, error } = await supabase
      .from('fine_payments')
      .insert({
        loan_id: loanId, user_id: userId, collected_by: collectedBy,
        amount, days_overdue: daysOverdue,
        waived, waived_reason: waivedReason, notes,
      })
      .select().single()
    if (error) throw error
    return data
  },

  async getAll({ page = 1, limit = 30 } = {}) {
    const from = (page - 1) * limit
    const { data, error, count } = await supabase
      .from('fine_payments_view')
      .select('*', { count: 'exact' })
      .order('paid_at', { ascending: false })
      .range(from, from + limit - 1)
    if (error) throw error
    return { data, count, totalPages: Math.ceil(count / limit) }
  },

  async getStats() {
    const { data, error } = await supabase.rpc('get_fines_stats')
    if (error) throw error
    return data
  },

  async getAllForExport() {
    const { data, error } = await supabase
      .from('fine_payments_view')
      .select('*')
      .order('paid_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },
}
