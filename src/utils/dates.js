import { supabase } from '../services/supabaseClient.js'

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  // Solo añadir T12:00:00 a fechas puras (YYYY-MM-DD) para evitar desfase UTC
  // Las fechas con hora (timestamptz) ya vienen completas y no deben modificarse
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + 'T12:00:00' : dateStr
  return new Date(normalized).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export const getDaysLeft = (dueDateStr) => {
  // Compara solo componentes de fecha local (sin conversión UTC)
  const now = new Date()
  const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const [dy, dm, dd] = String(dueDateStr).slice(0, 10).split('-').map(Number)
  const dueMs = Date.UTC(dy, dm - 1, dd)
  return Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24))
}

export const isOverdue = (dueDateStr, status) => {
  if (status === 'returned') return false
  return getDaysLeft(dueDateStr) < 0
}

// Fecha local del navegador en formato YYYY-MM-DD (para min de inputs)
export const localToday = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Fecha en Bogotá desde Postgres — fuente de verdad para queries
export const getTodayBogota = async () => {
  const { data, error } = await supabase.rpc('today_bogota')
  if (error) return localToday() // fallback
  return data // 'YYYY-MM-DD'
}

// Mantener compatibilidad — solo para inputs de UI (no para queries)
export const getDueDateFromToday = (days = 14) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
