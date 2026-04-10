import { supabase } from './supabaseClient.js'

export const booksService = {
  async getAll({ search = '', categoryId = null, available = null, page = 1, limit = 20 } = {}) {
    let query = supabase
      .from('books')
      .select('*, categories(name)', { count: 'exact' })

    if (search) query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,isbn.ilike.%${search}%`)
    if (categoryId) query = query.eq('category_id', categoryId)
    if (available === true) query = query.gt('available_copies', 0)
    if (available === false) query = query.eq('available_copies', 0)

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1).order('title')
    const { data, error, count } = await query
    if (error) throw error
    return { data, count, totalPages: Math.ceil(count / limit) }
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('books').select('*, categories(name)').eq('id', id).single()
    if (error) throw error
    return data
  },

  async create(book) {
    const { data, error } = await supabase.from('books').insert(book).select().single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    // Nunca enviamos available_copies al editar — lo maneja el trigger sync_available_copies
    const { available_copies, ...safeUpdates } = updates
    const { data, error } = await supabase.from('books').update(safeUpdates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase.from('books').delete().eq('id', id)
    if (error) throw error
  },

  async getCategories() {
    // Traemos categorías con conteo de libros usando la función de Supabase
    const { data, error } = await supabase
      .from('categories')
      .select('*, books(count)')
      .order('name')
    if (error) throw error
    // Aplanar conteo
    return data.map(c => ({ ...c, book_count: c.books?.[0]?.count ?? 0 }))
  },
}
