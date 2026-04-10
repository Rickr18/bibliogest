import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { booksService } from '../../services/booksService.js'
import { useSearch } from '../../hooks/useSearch.js'
import { SearchBar, FilterSelect } from '../../components/ui/SearchBar.jsx'
import { Pagination, Spinner, EmptyState } from '../../components/ui/Misc.jsx'

export function BooksPage() {
  const { search, setSearch, debouncedSearch, filters, updateFilter, page, setPage } = useSearch({
    categoryId: '',
    available: '',
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: booksService.getCategories,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['books', debouncedSearch, filters, page],
    queryFn: () =>
      booksService.getAll({
        search: debouncedSearch,
        categoryId: filters.categoryId || null,
        available: filters.available === 'yes' ? true : filters.available === 'no' ? false : null,
        page,
      }),
    keepPreviousData: true,
  })

  const books = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario de libros</h1>
          <p className="page-subtitle">{data?.count ?? '—'} libros registrados</p>
        </div>
        <Link to="/books/new" className="btn btn-primary">+ Agregar libro</Link>
      </div>

      {/* Filtros */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por título, autor o ISBN..."
          style={{ flex: '1', minWidth: '220px' }}
        />
        <FilterSelect
          label="Categoría"
          value={filters.categoryId}
          onChange={(v) => updateFilter('categoryId', v)}
          options={[
            { value: '', label: 'Todas las categorías' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <FilterSelect
          label="Disponibilidad"
          value={filters.available}
          onChange={(v) => updateFilter('available', v)}
          options={[
            { value: '', label: 'Todos' },
            { value: 'yes', label: 'Disponibles' },
            { value: 'no', label: 'Sin stock' },
          ]}
        />
      </div>

      {/* Tabla */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <Spinner center />
        ) : books.length === 0 ? (
          <EmptyState
            icon="📚"
            title="No se encontraron libros"
            desc="Intenta con otro término de búsqueda o ajusta los filtros"
            action={
              <Link to="/books/new" className="btn btn-primary">
                + Agregar primer libro
              </Link>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Título / Autor</th>
                  <th>ISBN</th>
                  <th>Categoría</th>
                  <th>Ubicación</th>
                  <th style={{ textAlign: 'center' }}>Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr key={book.id}>
                    <td>
                      <p style={{ fontWeight: '600', color: 'var(--color-ink)', marginBottom: '2px' }}>
                        {book.title}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>
                        {book.author} {book.year ? `· ${book.year}` : ''}
                      </p>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-ink-3)' }}>
                      {book.isbn ?? '—'}
                    </td>
                    <td>
                      {book.categories?.name ? (
                        <span className="badge badge-gray">{book.categories.name}</span>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>
                      {book.location ?? '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={`badge ${
                          book.available_copies === 0
                            ? 'badge-red'
                            : book.available_copies < 2
                            ? 'badge-amber'
                            : 'badge-green'
                        }`}
                      >
                        {book.available_copies}/{book.total_copies}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Link to={`/books/${book.id}`} className="btn btn-ghost btn-sm">Ver</Link>
                        <Link to={`/books/${book.id}/edit`} className="btn btn-secondary btn-sm">Editar</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '0 16px' }}>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>
    </div>
  )
}
