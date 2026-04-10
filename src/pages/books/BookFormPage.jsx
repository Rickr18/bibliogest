import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { booksService } from '../../services/booksService.js'
import { categoriesService } from '../../services/categoriesService.js'
import { useUIStore } from '../../store/index.js'
import { Spinner } from '../../components/ui/Misc.jsx'
import { Modal } from '../../components/ui/Modal.jsx'

export function BookFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const addToast = useUIStore(s => s.addToast)
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')

  const [form, setForm] = useState({
    title: '', author: '', isbn: '', publisher: '',
    year: '', category_id: '', total_copies: 1,
    location: '', description: '',
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.getAll,
  })

  const { data: existing, isLoading: loadingBook } = useQuery({
    queryKey: ['book', id],
    queryFn: () => booksService.getById(id),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) setForm({
      title: existing.title ?? '', author: existing.author ?? '',
      isbn: existing.isbn ?? '', publisher: existing.publisher ?? '',
      year: existing.year ?? '', category_id: existing.category_id ?? '',
      total_copies: existing.total_copies ?? 1,
      location: existing.location ?? '', description: existing.description ?? '',
    })
  }, [existing])

  const mutation = useMutation({
    mutationFn: isEdit
      ? data => booksService.update(id, data)
      : data => booksService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      addToast(isEdit ? 'Libro actualizado' : 'Libro registrado', 'success')
      navigate('/books')
    },
    onError: err => addToast(err.message, 'error'),
  })

  const createCatMutation = useMutation({
    mutationFn: categoriesService.create,
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setForm(f => ({ ...f, category_id: cat.id }))
      addToast(`Categoría "${cat.name}" creada`, 'success')
      setShowNewCat(false)
      setNewCatName('')
      setNewCatDesc('')
    },
    onError: err => addToast(err.message, 'error'),
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      year: form.year ? Number(form.year) : null,
      total_copies: Number(form.total_copies),
      category_id: form.category_id || null,
    }
    // Al editar, NO enviamos available_copies — lo calcula el trigger
    if (!isEdit) payload.available_copies = Number(form.total_copies)
    mutation.mutate(payload)
  }

  if (isEdit && loadingBook) return <Spinner center />

  return (
    <div style={{ maxWidth: '700px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Editar libro' : 'Agregar libro'}</h1>
          <p className="page-subtitle">{isEdit ? `Editando: ${existing?.title ?? '...'}` : 'Completa la información del libro'}</p>
        </div>
      </div>

      {isEdit && existing && (
        <div style={{ background: 'var(--color-blue-soft)', border: '1px solid var(--color-blue)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--color-blue)' }}>
          ℹ️ Al cambiar el número de ejemplares, los disponibles se recalculan automáticamente descontando los préstamos activos.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '20px' }}>Información bibliográfica</h3>

          <div className="field">
            <label className="label">Título *</label>
            <input className="input" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Título del libro" />
          </div>
          <div className="field">
            <label className="label">Autor *</label>
            <input className="input" required value={form.author} onChange={e => set('author', e.target.value)} placeholder="Nombre del autor" />
          </div>

          <div className="field-row">
            <div className="field">
              <label className="label">ISBN</label>
              <input className="input" value={form.isbn} onChange={e => set('isbn', e.target.value)} placeholder="978-..." />
            </div>
            <div className="field">
              <label className="label">Año</label>
              <input className="input" type="number" min="1000" max="2099" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2024" />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label className="label">Editorial</label>
              <input className="input" value={form.publisher} onChange={e => set('publisher', e.target.value)} placeholder="Editorial" />
            </div>
            <div className="field">
              <label className="label">Categoría</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)} style={{ flex: 1 }}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" className="btn btn-secondary btn-sm" style={{ flexShrink: 0, whiteSpace: 'nowrap' }} onClick={() => setShowNewCat(true)}>
                  + Nueva
                </button>
              </div>
            </div>
          </div>

          <div className="field">
            <label className="label">Descripción</label>
            <textarea className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Breve sinopsis..." />
          </div>
        </div>

        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '20px' }}>Inventario y ubicación</h3>
          <div className="field-row">
            <div className="field">
              <label className="label">Total de ejemplares *</label>
              <input className="input" type="number" min="1" required value={form.total_copies} onChange={e => set('total_copies', e.target.value)} />
              <p style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '4px' }}>
                {isEdit ? 'Los disponibles se recalculan automáticamente.' : 'Los disponibles = total al crear.'}
              </p>
            </div>
            <div className="field">
              <label className="label">Ubicación en estantería</label>
              <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Ej: Estante A - Sección 3" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/books')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar libro'}
          </button>
        </div>
      </form>

      {/* Modal crear categoría rápida */}
      <Modal open={showNewCat} onClose={() => setShowNewCat(false)} title="Nueva categoría">
        <form onSubmit={e => { e.preventDefault(); createCatMutation.mutate({ name: newCatName, description: newCatDesc }) }}>
          <div className="field">
            <label className="label">Nombre *</label>
            <input className="input" required value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Ej: Filosofía, Historia..." autoFocus />
          </div>
          <div className="field">
            <label className="label">Descripción</label>
            <textarea className="input" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Descripción breve..." />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowNewCat(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={createCatMutation.isPending}>
              {createCatMutation.isPending ? 'Creando...' : 'Crear y seleccionar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
