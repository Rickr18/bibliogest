import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesService } from '../../services/categoriesService.js'
import { useUIStore } from '../../store/index.js'
import { Modal } from '../../components/ui/Modal.jsx'
import { Spinner, EmptyState } from '../../components/ui/Misc.jsx'

function CategoryForm({ initial = {}, onSave, onCancel, loading }) {
  const [name, setName] = useState(initial.name ?? '')
  const [description, setDescription] = useState(initial.description ?? '')

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ name, description }) }}>
      <div className="field">
        <label className="label">Nombre de la categoría *</label>
        <input className="input" required value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Literatura, Ciencias..." autoFocus />
      </div>
      <div className="field">
        <label className="label">Descripción</label>
        <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción breve de la categoría..." />
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : initial.id ? 'Guardar cambios' : 'Crear categoría'}
        </button>
      </div>
    </form>
  )
}

export function CategoriesPage() {
  const [modalCreate, setModalCreate] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const qc = useQueryClient()
  const addToast = useUIStore(s => s.addToast)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.getAll,
  })

  const createMutation = useMutation({
    mutationFn: categoriesService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); addToast('Categoría creada', 'success'); setModalCreate(false) },
    onError: err => addToast(err.message, 'error'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, ...data }) => categoriesService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); addToast('Categoría actualizada', 'success'); setEditTarget(null) },
    onError: err => addToast(err.message, 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: categoriesService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); addToast('Categoría eliminada', 'success') },
    onError: err => addToast(err.message, 'error'),
  })

  function handleDelete(cat) {
    if (confirm(`¿Eliminar la categoría "${cat.name}"?`)) deleteMutation.mutate(cat.id)
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p className="page-subtitle">Clasificación temática del inventario de libros</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalCreate(true)}>+ Nueva categoría</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? <Spinner center /> : categories.length === 0 ? (
          <EmptyState icon="🏷️" title="Sin categorías" desc="Crea la primera categoría para clasificar los libros"
            action={<button className="btn btn-primary" onClick={() => setModalCreate(true)}>+ Nueva categoría</button>} />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th style={{ textAlign: 'center' }}>Libros</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                          🏷️
                        </div>
                        <span style={{ fontWeight: '600', color: 'var(--color-ink)' }}>{cat.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>{cat.description ?? '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-gray">{cat.book_count ?? 0}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditTarget(cat)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat)} disabled={deleteMutation.isPending}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear */}
      <Modal open={modalCreate} onClose={() => setModalCreate(false)} title="Nueva categoría">
        <CategoryForm
          onSave={data => createMutation.mutate(data)}
          onCancel={() => setModalCreate(false)}
          loading={createMutation.isPending}
        />
      </Modal>

      {/* Modal editar */}
      <Modal open={Boolean(editTarget)} onClose={() => setEditTarget(null)} title="Editar categoría">
        {editTarget && (
          <CategoryForm
            initial={editTarget}
            onSave={data => editMutation.mutate({ id: editTarget.id, ...data })}
            onCancel={() => setEditTarget(null)}
            loading={editMutation.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
