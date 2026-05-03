import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { loansService } from '../../services/loansService.js'
import { usersService } from '../../services/usersService.js'
import { finesService } from '../../services/finesService.js'
import { categoriesService } from '../../services/categoriesService.js'
import { useSearch } from '../../hooks/useSearch.js'
import { SearchBar, FilterSelect } from '../../components/ui/SearchBar.jsx'
import { Pagination, Spinner, EmptyState, LoanStatusBadge } from '../../components/ui/Misc.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { formatDate, getDaysLeft } from '../../utils/dates.js'
import { useAuthStore, useUIStore } from '../../store/index.js'
import { USER_ROLES, FINE_PER_DAY_COP } from '../../utils/constants.js'

const FINE_PER_DAY = FINE_PER_DAY_COP

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
  const [returnModal, setReturnModal] = useState(null)  // { loan, fine, daysOverdue }
  const [finePaid, setFinePaid] = useState(false)
  const [waivedReason, setWaivedReason] = useState('')
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

  useEffect(() => {
    loansService.autoMarkOverdue().then(() => {
      qc.invalidateQueries({ queryKey: ['loans'] })
    })
  }, [])

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
    mutationFn: async ({ loanId, loan, fine, daysOverdue }) => {
      await loansService.returnBook(loanId, staffProfile?.id ?? null)
      // Siempre registrar si había multa — cobrada o condonada
      if (fine > 0 && daysOverdue > 0) {
        await finesService.record({
          loanId,
          userId: loan.borrower?.id ?? loan.user_id,
          collectedBy: staffProfile?.id ?? null,
          amount: fine,
          daysOverdue,
          waived: !finePaid,
          waivedReason: !finePaid ? (waivedReason.trim() || 'Sin motivo especificado') : null,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] })
      qc.invalidateQueries({ queryKey: ['books'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['fines-stats'] })
      addToast(
        finePaid ? 'Devolución registrada y multa cobrada' : 'Devolución registrada — multa condonada',
        finePaid ? 'success' : 'warning'
      )
      setReturnModal(null)
      setFinePaid(false)
      setWaivedReason('')
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
                      <td><LoanStatusBadge status={loan.status} dueDate={loan.due_date} /></td>
                      <td>
                        {(isActive || loan.status === 'overdue') && days < 0 && (
                          <div>
                            <span className="badge badge-red" style={{ fontSize: '11px' }}>{Math.abs(days)}d vencido</span>
                            <p style={{ fontSize: '11px', color: 'var(--color-red)', marginTop: '2px', fontWeight: '600' }}>
                              ${(Math.abs(days) * FINE_PER_DAY).toLocaleString('es-CO')}
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
                            <button className="btn btn-secondary btn-sm" onClick={() => {
                              const refDate = loan.original_due_date || loan.due_date
                              const d = getDaysLeft(refDate)
                              const approvedFine = (loan.loan_notifications ?? [])
                                .filter(n => n.status === 'approved' && Number(n.fine_amount) > 0)
                                .reduce((max, n) => Math.max(max, Number(n.fine_amount)), 0)
                              const calcFine = d < 0 ? Math.abs(d) * FINE_PER_DAY : 0
                              const fine = calcFine > 0 ? calcFine : approvedFine
                              const daysOverdue = fine > 0 ? (calcFine > 0 ? Math.abs(d) : Math.round(fine / FINE_PER_DAY)) : 0
                              setReturnModal({ loan, fine, daysOverdue })
                            }}>
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
                          {loan.borrower?.id && (
                            <Link
                              to={`/users/${loan.borrower.id}`}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '11px' }}
                            >
                              Ver perfil
                            </Link>
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
      <Modal open={Boolean(returnModal)} onClose={() => { setReturnModal(null); setFinePaid(false); setWaivedReason('') }} title="Registrar devolución">
        {returnModal && (() => {
          const { loan, fine, daysOverdue } = returnModal
          return (
            <div>
              <div style={{ background: 'var(--color-paper-2)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-ink)', marginBottom: '4px' }}>
                  {loan.books?.title}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>
                  Prestado a: <strong>{loan.borrower?.full_name}</strong>
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', marginTop: '4px' }}>
                  Vencía: {formatDate(loan.original_due_date || loan.due_date)}
                </p>
              </div>

              {fine > 0 ? (
                <div style={{ background: 'var(--color-red-soft)', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--color-red)', fontWeight: '600', marginBottom: '10px' }}>
                    ⚠️ {daysOverdue} días de retraso — Multa: ${fine.toLocaleString('es-CO')} COP
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={finePaid}
                      onChange={e => setFinePaid(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-red)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--color-red)', fontWeight: '600' }}>
                      Multa cobrada en este momento (${fine.toLocaleString('es-CO')} COP)
                    </span>
                  </label>
                  {!finePaid && (
                    <div style={{ marginTop: '10px', marginLeft: '26px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--color-red)', opacity: 0.8, marginBottom: '6px' }}>
                        La multa quedará registrada como <strong>condonada</strong> con tu nombre. Indica el motivo:
                      </p>
                      <input
                        className="input"
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                        placeholder="Ej: acuerdo con el usuario, error de fecha, etc."
                        value={waivedReason}
                        onChange={e => setWaivedReason(e.target.value)}
                        maxLength={200}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
                    Sin multa — devolución a tiempo
                  </p>
                </div>
              )}

              {/* Quién registra */}
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
                    <p style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginBottom: '1px' }}>Registrando como</p>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-ink)' }}>
                      {staffProfile.full_name}
                      <span style={{ fontWeight: '400', color: 'var(--color-ink-3)', marginLeft: '6px' }}>
                        · {USER_ROLES[staffProfile.role] ?? staffProfile.role}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Bloquear confirmar si hay multa, no se marcó cobrada y no hay motivo */}
              {fine > 0 && !finePaid && !waivedReason.trim() && (
                <p style={{ fontSize: '12px', color: 'var(--color-red)', marginBottom: '12px', textAlign: 'right' }}>
                  Escribe el motivo de condonación para continuar.
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => { setReturnModal(null); setFinePaid(false); setWaivedReason('') }}>Cancelar</button>
                <button
                  className="btn btn-primary"
                  onClick={() => returnMutation.mutate({ loanId: loan.id, loan, fine, daysOverdue })}
                  disabled={returnMutation.isPending || (fine > 0 && !finePaid && !waivedReason.trim())}
                >
                  {returnMutation.isPending ? 'Registrando...' : finePaid ? 'Confirmar devolución y cobro' : 'Confirmar — multa condonada'}
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
