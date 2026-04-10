import { supabase, supabaseAdmin } from './supabaseClient.js'

export const usersService = {
  async getAll({ search = '', role = null, active = true, page = 1, limit = 20 } = {}) {
    let query = supabase.from('users').select('*', { count: 'exact' })
    if (search) query = query.or(`full_name.ilike.%${search}%,document_id.ilike.%${search}%,email.ilike.%${search}%`)
    if (role) query = query.eq('role', role)
    if (active !== null) query = query.eq('active', active)
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1).order('full_name')
    const { data, error, count } = await query
    if (error) throw error
    return { data, count, totalPages: Math.ceil(count / limit) }
  },

  async getById(id) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  async getByAuthId(authId) {
    const { data, error } = await supabase.from('users').select('*').eq('auth_id', authId).single()
    if (error) throw error
    return data
  },

  async getLoanHistory(userId) {
    const { data, error } = await supabase
      .from('user_loan_history_view').select('*').eq('user_id', userId)
      .order('loan_date', { ascending: false })
    if (error) throw error
    return data
  },

  // Lector: solo tabla users, sin cuenta Auth
  async create(user) {
    const { data, error } = await supabase.from('users').insert(user).select().single()
    if (error) throw error
    return data
  },

  // Todos los roles: crea cuenta en Auth + registro en tabla users con contraseña temporal
  async createWithAuth({ full_name, email, document_id, phone, role, notes, tempPassword }) {
    if (!supabaseAdmin) throw new Error('Falta VITE_SUPABASE_SERVICE_ROLE_KEY en .env.local')

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name, role },
    })
    if (authError) throw new Error(`Error creando cuenta: ${authError.message}`)

    const { data, error } = await supabase.from('users').insert({
      full_name, email, document_id, phone, role, notes,
      auth_id: authData.user.id,
      must_change_password: true,
      temp_password_set: true,
    }).select().single()

    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw error
    }
    return { user: data, tempPassword }
  },

  async update(id, updates) {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

export const notificationsService = {
  async create({ loan_id, user_id, new_return_date, message, fine_amount }) {
    const { data, error } = await supabase
      .from('loan_notifications')
      .insert({ loan_id, user_id, type: 'delay_notice', new_return_date, message, fine_amount })
      .select().single()
    if (error) throw error
    return data
  },

  async getAll({ status = null } = {}) {
    let query = supabase.from('notifications_view').select('*')
    if (status) query = query.eq('status', status)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async updateStatus(id, status, reviewedBy) {
    const { data, error } = await supabase
      .from('loan_notifications')
      .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async getByUser(userId) {
    const { data, error } = await supabase
      .from('loan_notifications')
      .select('*, loans(due_date, books(title))')
      .eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
}
