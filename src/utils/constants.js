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

export const DEFAULT_LOAN_DAYS = 14
export const FINE_PER_DAY_COP = 500   // Multa en pesos colombianos por día de retraso
export const ITEMS_PER_PAGE = 20
