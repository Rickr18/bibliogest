// ID del administrador principal en la tabla users (users.id, UUID generado por la BD)
// Comparar con currentProfile?.id (actor) o existing?.id / id param (target)
export const PRINCIPAL_ADMIN_ID = '019da92b-0723-4708-808d-bd7e5c5ee7a8'

export const LOAN_STATUS = {
  active: { label: 'Activo', color: 'blue' },
  returned: { label: 'Devuelto', color: 'green' },
  overdue: { label: 'Vencido', color: 'red' },
  renewed: { label: 'Renovado', color: 'amber' },
}

export const USER_ROLES = {
  reader: 'Lector',
  staff: 'Bibliotecario',
  admin: 'Administrador',
}

export const DEACTIVATION_REASONS = {
  fine_pending:   'Multa pendiente por retraso superior a 5 días',
  rule_violation: 'Incumplimiento de normas de la biblioteca',
  doc_expired:    'Documento vencido o no verificado',
  suspension:     'Suspensión temporal',
  voluntary:      'Baja voluntaria',
  other:          'Otro motivo',
}

export const DEFAULT_LOAN_DAYS = 14
export const FINE_PER_DAY_COP = 500   // Multa en pesos colombianos por día de retraso
export const ITEMS_PER_PAGE = 20
