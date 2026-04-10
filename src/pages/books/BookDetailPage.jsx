import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { booksService } from '../../services/booksService.js'
import { supabase } from '../../services/supabaseClient.js'
import { formatDate } from '../../utils/dates.js'
import { LoanStatusBadge, Spinner, EmptyState } from '../../components/ui/Misc.jsx'
import { useUIStore } from '../../store/index.js'
import { USER_ROLES } from '../../utils/constants.js'

export function BookDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: () => booksService.getById(id),
  })

  const { data: loanHistory = [] } = useQuery({
    queryKey: ['book-loans', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select(`
          *,
          borrower:users!loans_user_id_fkey(full_name, document_id, phone),
          creator:users!loans_created_by_fkey(full_name, role),
          returner:users!loans_returned_by_fkey(full_name, role)
        `)
        .eq('book_id', id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
    enabled: Boolean(id),
  })

  const deleteMutation = useMutation({
    mutationFn: () => booksService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] })
      addToast('Libro eliminado', 'success')
      navigate('/books')
    },
    onError: (err) => addToast(err.message, 'error'),
  })

  function handleDelete() {
    if (confirm(`¿Eliminar "${book?.title}"? Esta acción no se puede deshacer.`)) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) return <Spinner center />
  if (!book) return <EmptyState title="Libro no encontrado" />

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <p style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginBottom: '6px' }}>
            <Link to="/books" style={{ color: 'var(--color-ink-3)', textDecoration: 'none' }}>Libros</Link>
            {' › '}
            {book.title}
          </p>
          <h1 className="page-title" style={{ fontSize: '24px' }}>{book.title}</h1>
          <p className="page-subtitle">{book.author}{book.year ? ` · ${book.year}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to={`/books/${id}/edit`} className="btn btn-secondary">Editar</Link>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
            Eliminar
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Datos del libro */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '16px' }}>
            Ficha bibliográfica
          </h3>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            {[
              ['ISBN', book.isbn],
              ['Editorial', book.publisher],
              ['Año', book.year],
              ['Categoría', book.categories?.name],
              ['Ubicación', book.location],
            ].map(([label, val]) => val ? (
              <tr key={label}>
                <td style={{ color: 'var(--color-ink-3)', padding: '7px 0', width: '120px', fontWeight: '500' }}>{label}</td>
                <td style={{ color: 'var(--color-ink)' }}>{val}</td>
              </tr>
            ) : null)}
          </table>
          {book.description && (
            <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', marginTop: '16px', lineHeight: '1.6', borderTop: '1px solid var(--color-paper-3)', paddingTop: '16px' }}>
              {book.description}
            </p>
          )}
        </div>

        {/* Stock */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '16px' }}>
            Estado del inventario
          </h3>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div className="stat-card" style={{ flex: 1, padding: '16px' }}>
              <p className="stat-label">Disponibles</p>
              <p className="stat-value" style={{ fontSize: '28px', color: book.available_copies > 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                {book.available_copies}
              </p>
            </div>
            <div className="stat-card" style={{ flex: 1, padding: '16px' }}>
              <p className="stat-label">Total ejemplares</p>
              <p className="stat-value" style={{ fontSize: '28px' }}>{book.total_copies}</p>
            </div>
          </div>
          <div
            style={{
              height: '8px',
              background: 'var(--color-paper-3)',
              borderRadius: '99px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(book.available_copies / book.total_copies) * 100}%`,
                background: book.available_copies === 0 ? 'var(--color-red)' : 'var(--color-green)',
                borderRadius: '99px',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginTop: '8px' }}>
            {book.total_copies - book.available_copies} ejemplar(es) en préstamo actualmente
          </p>

          {book.available_copies > 0 && (
            <Link
              to={`/loans/new?bookId=${id}`}
              className="btn btn-primary"
              style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}
            >
              + Registrar préstamo
            </Link>
          )}
        </div>
      </div>

      {/* Historial de préstamos del libro */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px' }}>Historial de préstamos</h3>
          {loanHistory.length > 0 && (
            <span className="badge badge-gray">{loanHistory.length} registro{loanHistory.length > 1 ? 's' : ''}</span>
          )}
        </div>
        {loanHistory.length === 0 ? (
          <EmptyState icon="📋" title="Sin historial" desc="Este libro aún no ha sido prestado" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lector</th>
                  <th>Préstamo</th>
                  <th>Registrado por</th>
                  <th>Vencimiento</th>
                  <th>Devolución</th>
                  <th>Aceptado por</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loanHistory.map((loan) => (
                  <tr key={loan.id}>
                    {/* Lector */}
                    <td>
                      <p style={{ fontWeight: '600', fontSize: '13px', color: 'var(--color-ink)' }}>
                        {loan.borrower?.full_name ?? '—'}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontFamily: 'monospace' }}>
                        {loan.borrower?.document_id}
                      </p>
                    </td>
                    {/* Fecha de préstamo */}
                    <td style={{ fontSize: '13px' }}>{formatDate(loan.loan_date)}</td>
                    {/* Quien registró el préstamo */}
                    <td>
                      {loan.creator?.full_name ? (
                        <>
                          <p style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: '500' }}>
                            {loan.creator.full_name}
                          </p>
                          <p style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', color: loan.creator.role === 'admin' ? 'var(--color-accent)' : 'var(--color-ink-4)' }}>
                            {USER_ROLES[loan.creator.role] ?? loan.creator.role}
                          </p>
                        </>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>—</span>
                      )}
                    </td>
                    {/* Vencimiento */}
                    <td style={{ fontSize: '13px' }}>{formatDate(loan.due_date)}</td>
                    {/* Fecha de devolución */}
                    <td style={{ fontSize: '13px' }}>
                      {loan.return_date ? formatDate(loan.return_date) : (
                        <span style={{ color: 'var(--color-ink-4)' }}>Pendiente</span>
                      )}
                    </td>
                    {/* Quien registró la devolución */}
                    <td>
                      {loan.returner?.full_name ? (
                        <>
                          <p style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: '500' }}>
                            {loan.returner.full_name}
                          </p>
                          <p style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', color: loan.returner.role === 'admin' ? 'var(--color-accent)' : 'var(--color-ink-4)' }}>
                            {USER_ROLES[loan.returner.role] ?? loan.returner.role}
                          </p>
                        </>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>—</span>
                      )}
                    </td>
                    {/* Estado */}
                    <td><LoanStatusBadge status={loan.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
