export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export const getDaysLeft = (dueDateStr) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDateStr)
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24))
  return diff
}

export const isOverdue = (dueDateStr, status) => {
  if (status === 'returned') return false
  return getDaysLeft(dueDateStr) < 0
}

export const getDueDateFromToday = (days = 14) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
