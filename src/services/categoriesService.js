import { supabase } from './supabaseClient.js'

export const categoriesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('categories')
      .select('*, books(count)')
      .order('name')
    if (error) throw error
    return data.map(cat => ({ ...cat, book_count: cat.books?.[0]?.count ?? 0 }))
  },

  async create({ name, description }) {
    const { data, error } = await supabase.from('categories').insert({ name, description }).select().single()
    if (error) throw error
    return data
  },

  async update(id, { name, description }) {
    const { data, error } = await supabase.from('categories').update({ name, description }).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async delete(id) {
    // Verificar que no tenga libros asociados
    const { count } = await supabase.from('books').select('id', { count: 'exact', head: true }).eq('category_id', id)
    if (count > 0) throw new Error(`No se puede eliminar: tiene ${count} libro(s) asociado(s)`)
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
  },
}
