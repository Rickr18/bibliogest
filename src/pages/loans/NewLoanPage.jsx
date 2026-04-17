import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loansService } from '../../services/loansService.js'
import { booksService } from '../../services/booksService.js'
import { usersService } from '../../services/usersService.js'
import { categoriesService } from '../../services/categoriesService.js'
import { useAuthStore, useUIStore } from '../../store/index.js'
import { useSearch } from '../../hooks/useSearch.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import { SearchBar } from '../../components/ui/SearchBar.jsx'
import { Spinner, ReputationBadge } from '../../components/ui/Misc.jsx'
import { getDueDateFromToday, formatDate } from '../../utils/dates.js'
import { DEFAULT_LOAN_DAYS } from '../../utils/constants.js'

export function NewLoanPage() {
  const navigate = useNavigate()
  const [urlParams] = useSearchParams()
  const qc = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)
  const authUser = useAuthStore(s => s.user)

  const [selectedUser, setSelectedUser]   = useState(null)
  const [selectedBooks, setSelectedBooks] = useState([])
  const [dueDate, setDueDate]             = useState(getDueDateFromToday(DEFAULT_LOAN_DAYS))
  const [notes, setNotes]                 = useState('')

  const { data: selectedUserReputation } = useQuery({
    queryKey: ['user-reputation', selectedUser?.id],
    queryFn: () => usersService.getReputation(selectedUser.id),
    enabled: Boolean(selectedUser?.id),
  })

  // Panel derecho: estado de búsqueda y categoría
  const [panelSearch, setPanelSearch]       = useState('')
  const [panelCategory, setPanelCategory]   = useState('')
  const debouncedPanelSearch                = useDebounce(panelSearch, 300)

  // Perfil del staff que registra el préstamo
  const { data: staffProfile } = useQuery({
    queryKey: ['staff-profile', authUser?.id],
    queryFn: () => usersService.getByAuthId(authUser.id),
    enabled: Boolean(authUser?.id),
  })

  // Búsquedas del formulario izquierdo
  const userSearch = useSearch()
  const bookSearch = useSearch()

  const { data: usersData } = useQuery({
    queryKey: ['users-search', userSearch.debouncedSearch],
    queryFn: () => usersService.getAll({ search: userSearch.debouncedSearch, limit: 8 }),
    enabled: userSearch.debouncedSearch.length > 1,
  })

  const { data: booksData } = useQuery({
    queryKey: ['books-search', bookSearch.debouncedSearch],
    queryFn: () => booksService.getAll({ search: bookSearch.debouncedSearch, available: true, limit: 10 }),
    enabled: bookSearch.debouncedSearch.length > 1,
  })

  // Panel derecho: libros disponibles (siempre cargados)
  const { data: panelData, isLoading: panelLoading, isError: panelError } = useQuery({
    queryKey: ['books-panel', debouncedPanelSearch, panelCategory],
    queryFn: () => booksService.getAll({
      search: debouncedPanelSearch,
      available: true,
      categoryId: panelCategory || null,
      limit: 60,
    }),
    staleTime: 30_000,
    retry: 1,
  })

  // Categorías para el filtro del panel
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.getAll,
  })

  // Pre-seleccionar libro si viene de URL
  const preBookId = urlParams.get('bookId')
  const { data: preBook } = useQuery({
    queryKey: ['book', preBookId],
    queryFn: () => booksService.getById(preBookId),
    enabled: Boolean(preBookId),
  })
  useEffect(() => {
    if (preBook && !selectedBooks.find(b => b.id === preBook.id)) {
      setSelectedBooks([preBook])
    }
  }, [preBook])

  const selectedBookIds = new Set(selectedBooks.map(b => b.id))
  const filteredDropdown = booksData?.data?.filter(b => !selectedBookIds.has(b.id)) ?? []

  function addBook(book) {
    if (!selectedBookIds.has(book.id)) {
      setSelectedBooks(prev => [...prev, book])
      bookSearch.setSearch('')
    }
  }

  function togglePanelBook(book) {
    if (selectedBookIds.has(book.id)) {
      setSelectedBooks(prev => prev.filter(b => b.id !== book.id))
    } else {
      setSelectedBooks(prev => [...prev, book])
    }
  }

  function removeBook(bookId) {
    setSelectedBooks(prev => prev.filter(b => b.id !== bookId))
  }

  const mutation = useMutation({
    mutationFn: (loans) => loansService.createBatch(loans),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['loans'] })
      qc.invalidateQueries({ queryKey: ['books'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      addToast(`${data.length} préstamo(s) registrado(s) correctamente`, 'success')
      navigate('/loans')
    },
    onError: (err) => addToast(err.message, 'error'),
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!selectedUser)          return addToast('Selecciona un usuario', 'warning')
    if (selectedBooks.length === 0) return addToast('Agrega al menos un libro', 'warning')
    mutation.mutate(selectedBooks.map(book => ({
      user_id:    selectedUser.id,
      book_id:    book.id,
      due_date:   dueDate,
      notes:      notes || null,
      created_by: staffProfile?.id ?? null,
    })))
  }

  const dropdownStyle = {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
    background: 'white', border: '1px solid var(--color-paper-3)',
    borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', zIndex: 20, overflow: 'hidden',
  }
  const dropdownBtnStyle = {
    display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px',
    border: 'none', background: 'none', cursor: 'pointer',
    borderBottom: '1px solid var(--color-paper-2)', transition: 'background 0.1s',
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nuevo préstamo</h1>
          <p className="page-subtitle">Registra uno o más libros para un usuario</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

          {/* ══════════════════════════════════════
              COLUMNA IZQUIERDA — Formulario
          ══════════════════════════════════════ */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* 1. Usuario */}
            <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '16px' }}>
                1. Seleccionar usuario
              </h3>
              {selectedUser ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--color-blue-soft)', border: '1px solid var(--color-blue)',
                  borderRadius: 'var(--radius)', padding: '14px 16px',
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', color: 'var(--color-ink)' }}>{selectedUser.full_name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginBottom: '8px' }}>
                      Doc: {selectedUser.document_id} · {selectedUser.email ?? selectedUser.phone}
                    </p>
                    {selectedUserReputation && (
                      <ReputationBadge reputation={selectedUserReputation} showDetail />
                    )}
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedUser(null)}>
                    Cambiar
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <SearchBar value={userSearch.search} onChange={userSearch.setSearch}
                    placeholder="Buscar por nombre, documento o correo..." />
                  {usersData?.data?.length > 0 && (
                    <div style={dropdownStyle}>
                      {usersData.data.map(u => (
                        <button key={u.id} type="button"
                          onClick={() => { setSelectedUser(u); userSearch.setSearch('') }}
                          style={dropdownBtnStyle}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-paper)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <p style={{ fontWeight: '500', fontSize: '14px', color: 'var(--color-ink)' }}>{u.full_name}</p>
                          <p style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>Doc: {u.document_id} · {u.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {userSearch.debouncedSearch.length > 1 && !usersData?.data?.length && (
                    <p style={{ fontSize: '13px', color: 'var(--color-ink-4)', marginTop: '8px' }}>
                      Sin resultados. <a href="/users/new" style={{ color: 'var(--color-accent)' }}>Registrar nuevo usuario</a>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 2. Libros seleccionados + buscador */}
            <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '16px' }}>
                2. Libros del préstamo
                {selectedBooks.length > 0 && (
                  <span className="badge badge-green" style={{ marginLeft: '10px', fontSize: '12px' }}>
                    {selectedBooks.length} seleccionado{selectedBooks.length > 1 ? 's' : ''}
                  </span>
                )}
              </h3>

              {/* Lista de libros ya agregados */}
              {selectedBooks.length > 0 && (
                <div style={{
                  border: '1px solid var(--color-paper-3)', borderRadius: 'var(--radius)',
                  overflow: 'hidden', marginBottom: '16px',
                }}>
                  {selectedBooks.map((book, i) => (
                    <div key={book.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderBottom: i < selectedBooks.length - 1 ? '1px solid var(--color-paper-2)' : 'none',
                      background: 'var(--color-green-soft)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          width: '22px', height: '22px', borderRadius: '50%',
                          background: 'var(--color-green)', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: '700', flexShrink: 0,
                        }}>{i + 1}</span>
                        <div>
                          <p style={{ fontWeight: '600', fontSize: '13px', color: 'var(--color-ink)' }}>{book.title}</p>
                          <p style={{ fontSize: '11px', color: 'var(--color-ink-3)' }}>
                            {book.author} · {book.available_copies} disponible(s)
                          </p>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeBook(book.id)}
                        style={{
                          width: '26px', height: '26px', borderRadius: '50%',
                          border: '1px solid var(--color-red)', background: 'transparent',
                          color: 'var(--color-red)', cursor: 'pointer', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                        }}
                        title="Quitar libro"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Buscador por texto (dropdown) */}
              <div style={{ position: 'relative' }}>
                <SearchBar value={bookSearch.search} onChange={bookSearch.setSearch}
                  placeholder={selectedBooks.length === 0
                    ? 'También puedes buscar por título, autor o ISBN...'
                    : 'Buscar otro libro por título, autor o ISBN...'} />
                {filteredDropdown.length > 0 && (
                  <div style={dropdownStyle}>
                    {filteredDropdown.map(b => (
                      <button key={b.id} type="button" onClick={() => addBook(b)}
                        style={dropdownBtnStyle}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-paper)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <p style={{ fontWeight: '500', fontSize: '14px', color: 'var(--color-ink)' }}>{b.title}</p>
                        <p style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>
                          {b.author} ·
                          <span className="badge badge-green" style={{ marginLeft: '6px', fontSize: '11px' }}>
                            {b.available_copies} disp.
                          </span>
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {bookSearch.debouncedSearch.length > 1 && !filteredDropdown.length && (
                  <p style={{ fontSize: '13px', color: 'var(--color-ink-4)', marginTop: '8px' }}>
                    {booksData?.data?.length > 0 ? 'Ese libro ya está en la lista.' : 'Sin resultados o sin stock.'}
                  </p>
                )}
              </div>
            </div>

            {/* 3. Condiciones */}
            <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '12px' }}>
                3. Condiciones del préstamo
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', marginBottom: '16px' }}>
                La fecha de vencimiento aplica a todos los libros.
              </p>
              <div className="field-row">
                <div className="field">
                  <label className="label">Fecha de préstamo</label>
                  <input className="input" type="date" value={getDueDateFromToday(0)} disabled style={{ opacity: 0.6 }} />
                </div>
                <div className="field">
                  <label className="label">Fecha de vencimiento *</label>
                  <input className="input" type="date" required value={dueDate}
                    min={getDueDateFromToday(0)}
                    onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label className="label">Notas u observaciones</label>
                <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Observaciones adicionales..." />
              </div>
            </div>

            {/* Resumen */}
            {selectedUser && selectedBooks.length > 0 && (
              <div style={{
                background: 'var(--color-ink)', color: 'white',
                borderRadius: 'var(--radius-lg)', padding: '18px 22px', marginBottom: '16px',
              }}>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Resumen del préstamo
                </p>
                <p style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                  {selectedUser.full_name} lleva{' '}
                  <span style={{ color: '#f4a582' }}>
                    {selectedBooks.length} libro{selectedBooks.length > 1 ? 's' : ''}
                  </span>
                </p>
                <ul style={{ margin: '4px 0 8px 0', padding: '0 0 0 16px' }}>
                  {selectedBooks.map(b => (
                    <li key={b.id} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>
                      {b.title}
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                  Devuelve el {formatDate(dueDate)}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/loans')}>Cancelar</button>
              <button type="submit" className="btn btn-primary btn-lg"
                disabled={mutation.isPending || !selectedUser || selectedBooks.length === 0}>
                {mutation.isPending
                  ? 'Registrando...'
                  : `Registrar ${selectedBooks.length > 1 ? `${selectedBooks.length} préstamos` : 'préstamo'}`}
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════
              COLUMNA DERECHA — Libros disponibles
          ══════════════════════════════════════ */}
          <div style={{ width: '320px', flexShrink: 0, position: 'sticky', top: '80px' }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Cabecera del panel */}
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--color-paper-3)',
                background: 'var(--color-paper)',
              }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', marginBottom: '10px' }}>
                  Libros disponibles
                  {panelData?.count != null && (
                    <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--color-ink-4)', marginLeft: '6px' }}>
                      ({panelData.count})
                    </span>
                  )}
                </h3>
                {/* Búsqueda en panel */}
                <input
                  className="input"
                  style={{ marginBottom: '8px', fontSize: '13px' }}
                  placeholder="Filtrar por título o autor..."
                  value={panelSearch}
                  onChange={e => setPanelSearch(e.target.value)}
                />
                {/* Filtro por categoría */}
                <select
                  className="input"
                  style={{ fontSize: '13px' }}
                  value={panelCategory}
                  onChange={e => setPanelCategory(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Lista de libros del panel */}
              <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                {panelLoading ? (
                  <div style={{ padding: '24px', textAlign: 'center' }}>
                    <Spinner />
                    <p style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginTop: '8px' }}>Cargando libros...</p>
                  </div>
                ) : panelError ? (
                  <p style={{ padding: '20px 16px', fontSize: '13px', color: 'var(--color-red)', textAlign: 'center' }}>
                    Error al cargar libros. Recarga la página.
                  </p>
                ) : !panelData?.data?.length ? (
                  <p style={{ padding: '20px 16px', fontSize: '13px', color: 'var(--color-ink-4)', textAlign: 'center' }}>
                    Sin libros disponibles
                  </p>
                ) : (
                  panelData.data.map(book => {
                    const isSelected = selectedBookIds.has(book.id)
                    return (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => togglePanelBook(book)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--color-paper-2)',
                          border: 'none',
                          background: isSelected ? 'var(--color-green-soft)' : 'white',
                          cursor: 'pointer',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) e.currentTarget.style.background = 'var(--color-paper)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = isSelected ? 'var(--color-green-soft)' : 'white'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: '13px', fontWeight: '600',
                              color: isSelected ? 'var(--color-green)' : 'var(--color-ink)',
                              marginBottom: '2px',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {isSelected && '✓ '}{book.title}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--color-ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {book.author}
                            </p>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            <span className={`badge ${isSelected ? 'badge-green' : book.available_copies <= 1 ? 'badge-amber' : 'badge-blue'}`}
                              style={{ fontSize: '10px' }}>
                              {book.available_copies} disp.
                            </span>
                            {book.categories?.name && (
                              <p style={{ fontSize: '10px', color: 'var(--color-ink-4)', marginTop: '3px' }}>
                                {book.categories.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              {/* Pie del panel: hint */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-paper-3)', background: 'var(--color-paper)' }}>
                <p style={{ fontSize: '11px', color: 'var(--color-ink-4)', textAlign: 'center' }}>
                  Clic para agregar · Clic en ✓ para quitar
                </p>
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}
