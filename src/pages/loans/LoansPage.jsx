import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { loansService } from '../../services/loansService.js'
import { usersService } from '../../services/usersService.js'
import { categoriesService } from '../../services/categoriesService.js'
import { useSearch } from '../../hooks/useSearch.js'
import { SearchBar, FilterSelect } from '../../components/ui/SearchBar.jsx'
import { Pagination, Spinner, EmptyState, LoanStatusBadge } from '../../components/ui/Misc.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { formatDate, getDaysLeft } from '../../utils/dates.js'
import { useAuthStore, useUIStore } from '../../store/index.js'
import { USER_ROLES } from '../../utils/constants.js'

const FINE_PER_DAY = 500 // COP

function StaffTag({ name, role }) {
  if (!name) return <span style={{ fontSize: '11px', color: 'var(--color-ink-4)' }}>—</span>
  return (
    <span style={{ fontSize: '11px', color: 'var(--color-ink-3)' }}>
      {name}
      <span style={{
        marginLeft: '4px', fontSize: '10px', fontWeight: '600',
        color: role === 'admin' ? 'var(--color-accent)' : 'var(--color-ink-4)',
      }}>
        ({USER_ROLES[role] ?? role})
      </span>
    </span>
  )
}

export function LoansPage() {
  const [urlParams] = useSearchParams()
  const [returnModal, setReturnModal] = useState(null)
  const { search, setSearch, debouncedSearch, filters, updateFilter, page, setPage } = useSearch({
    status: urlParams.get('status') ?? '',
    overdue: '',
    category_id: '',
  })

  const addToast = useUIStore(s => s.addToast)
  const qc = useQueryClient()
  const authUser = useAuthStore(s => s.user)

  // Perfil del staff que registra devoluciones
  const { data: staffProfile } = useQuery({
    queryKey: ['staff-profile', authUser?.id],
    queryFn: () => usersService.getByAuthId(authUser.id),
    enabled: Boolean(authUser?.id),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['loans', debouncedSearch, filters, page],
    queryFn: () => loansService.getAll({
      status: filters.status || null,
      overdue: filters.overdue === 'yes',
      categoryId: filters.category_id || null,
      page,
    }),
    keepPreviousData: true,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.getAll,
  })

  const returnMutation = useMutation({
    mutationFn: loanId => loansService.returnBook(loanId, staffProfile?.id ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] })
      qc.invalidateQueries({ queryKey: ['books'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      addToast('Devolución registrada correctamente', 'success')
      setReturnModal(null)
    },
    onError: err => addToast(err.message, 'error'),
  })

  const overdueMutation = useMutation({
    mutationFn: loanId => loansService.markOverdue(loanId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      addToast('Préstamo marcado como vencido', 'error')
    },
    onError: err => addToast(err.message, 'error'),
  })

  const loans = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Préstamos</h1>
          <p className="page-subtitle">{data?.count ?? '—'} préstamos en el sistema</p>
        </div>
        <Link to="/loans/new" className="btn btn-primary">+ Nuevo préstamo</Link>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por usuario o libro..." style={{ flex: '1', minWidth: '200px' }} />
        <FilterSelect label="Estado" value={filters.status} onChange={v => updateFilter('status', v)}
          options={[
            { value: '', label: 'Todos los estados' },
            { value: 'active', label: 'Activos' },
            { value: 'returned', label: 'Devueltos' },
            { value: 'overdue', label: 'Vencidos' },
            { value: 'renewed', label: 'Renovados' },
          ]}
        />
        <FilterSelect label="Categoría" value={filters.category_id} onChange={v => updateFilter('category_id', v)}
          options={[
            { value: '', label: 'Todas las categorías' },
            ...categories.map(c => ({ value: c.id, label: c.name })),
          ]}
        />
        <FilterSelect label="Vencidos" value={filters.overdue} onChange={v => updateFilter('overdue', v)}
          options={[{ value: '', label: 'Todos' }, { value: 'yes', label: 'Solo vencidos' }]}
        />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? <Spinner center /> : loans.length === 0 ? (
          <EmptyState icon="📋" title="Sin préstamos" desc="No hay préstamos que coincidan con los filtros"
            action={<Link to="/loans/new" className="btn btn-primary">+ Nuevo préstamo</Link>} />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Libro</th>
                  <th>Categoría</th>
                  <th>Préstamo</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th>Días / Multa</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loans.map(loan => {
                  const days = getDaysLeft(loan.due_date)
                  const isActive = loan.status === 'active' || loan.status === 'renewed'
                  const fine = days < 0 && isActive ? Math.abs(days) * FINE_PER_DAY : 0
                  return (
                    <tr key={loan.id}>
                      <td>
                        <p style={{ fontWeight: '600', color: 'var(--color-ink)', marginBottom: '2px' }}>
                          {loan.borrower?.full_name}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontFamily: 'monospace' }}>
                          {loan.borrower?.document_id}
                        </p>
                      </td>
                      <td>
                        <p style={{ fontSize: '13px', color: 'var(--color-ink)' }}>{loan.books?.title}</p>
                        <p style={{ fontSize: '11px', color: 'var(--color-ink-3)' }}>{loan.books?.author}</p>
                      </td>
                      <td>
                        {loan.books?.categories?.name
                          ? <span className="badge badge-gray" style={{ fontSize: '11px' }}>{loan.books.categories.name}</span>
                          : '—'}
                      </td>
                      <td>
                        <p style={{ fontSize: '13px' }}>{formatDate(loan.loan_date)}</p>
                        {loan.creator?.full_name && (
                          <div style={{ marginTop: '2px' }}>
                            <StaffTag name={loan.creator.full_name} role={loan.creator.role} />
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '13px' }}>{formatDate(loan.due_date)}</td>
                      <td><LoanStatusBadge status={loan.status} /></td>
                      <td>
                        {isActive && days < 0 && (
                          <div>
                            <span className="badge badge-red" style={{ fontSize: '11px' }}>{Math.abs(days)}d vencido</span>
                            <p style={{ fontSize: '11px', color: 'var(--color-red)', marginTop: '2px', fontWeight: '600' }}>
                              ${fine.toLocaleString('es-CO')}
                            </p>
                          </div>
                        )}
                        {isActive && days >= 0 && (
                          <span className={`badge ${days <= 2 ? 'badge-amber' : 'badge-blue'}`} style={{ fontSize: '11px' }}>
                            {days === 0 ? 'Vence hoy' : `${days}d restantes`}
                          </span>
                        )}
                        {loan.status === 'returned' && (
                          <div>
                            <p style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>{formatDate(loan.return_date)}</p>
                            {loan.returner?.full_name && (
                              <div style={{ marginTop: '2px' }}>
                                <StaffTag name={loan.returner.full_name} role={loan.returner.role} />
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {isActive && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setReturnModal(loan)}>
                              Registrar devolución
                            </button>
                          )}
                          {/* Mostrar solo si está activo Y vencido pero aún no marcado como overdue */}
                          {loan.status === 'active' && days < 0 && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => overdueMutation.mutate(loan.id)}
                              disabled={overdueMutation.isPending}
                              title="Cambia el estado oficial a 'Vencido' en la base de datos"
                            >
                              Marcar vencido
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '0 16px' }}>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>

      {/* Modal devolución */}
      <Modal open={Boolean(returnModal)} onClose={() => setReturnModal(null)} title="Registrar devolución">
        {returnModal && (() => {
          const days = getDaysLeft(returnModal.due_date)
          const fine = days < 0 ? Math.abs(days) * FINE_PER_DAY : 0
          return (
            <div>
              <div style={{ background: 'var(--color-paper-2)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-ink)', marginBottom: '4px' }}>
                  {returnModal.books?.title}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>
                  Prestado a: <strong>{returnModal.borrower?.full_name}</strong>
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', marginTop: '4px' }}>
                  Vencía: {formatDate(returnModal.due_date)}
                </p>
                {fine > 0 && (
                  <div style={{ marginTop: '12px', background: 'var(--color-red-soft)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--color-red)', fontWeight: '600' }}>
                      ⚠️ {Math.abs(days)} días de retraso — Multa: ${fine.toLocaleString('es-CO')} COP
                    </p>
                  </div>
                )}
              </div>

              {/* Quién registra la devolución */}
              {staffProfile && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: 'var(--color-paper)', borderRadius: 'var(--radius)',
                  padding: '10px 14px', marginBottom: '16px',
                  border: '1px solid var(--color-paper-3)',
                }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'var(--color-accent)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: '700', flexShrink: 0,
                  }}>
                    {staffProfile.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginBottom: '1px' }}>
                      Registrando como
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-ink)' }}>
                      {staffProfile.full_name}
                      <span style={{ fontWeight: '400', color: 'var(--color-ink-3)', marginLeft: '6px' }}>
                        · {USER_ROLES[staffProfile.role] ?? staffProfile.role}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '14px', color: 'var(--color-ink-2)', marginBottom: '24px' }}>
                ¿Confirmas la devolución? El inventario se actualizará automáticamente.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setReturnModal(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={() => returnMutation.mutate(returnModal.id)} disabled={returnMutation.isPending}>
                  {returnMutation.isPending ? 'Registrando...' : 'Confirmar devolución'}
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
