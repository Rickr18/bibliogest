import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { usersService } from '../../services/usersService.js'
import { useSearch } from '../../hooks/useSearch.js'
import { SearchBar, FilterSelect } from '../../components/ui/SearchBar.jsx'
import { Pagination, Spinner, EmptyState } from '../../components/ui/Misc.jsx'
import { formatDate } from '../../utils/dates.js'
import { USER_ROLES } from '../../utils/constants.js'

export function UsersPage() {
  const { search, setSearch, debouncedSearch, filters, updateFilter, page, setPage } = useSearch({
    role: '',
    active: 'true',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['users', debouncedSearch, filters, page],
    queryFn: () =>
      usersService.getAll({
        search: debouncedSearch,
        role: filters.role || null,
        active: filters.active === '' ? null : filters.active === 'true',
        page,
      }),
    keepPreviousData: true,
  })

  const users = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">{data?.count ?? '—'} usuarios registrados</p>
        </div>
        <Link to="/users/new" className="btn btn-primary">+ Registrar usuario</Link>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, documento o correo..."
          style={{ flex: '1', minWidth: '220px' }}
        />
        <FilterSelect
          label="Rol"
          value={filters.role}
          onChange={(v) => updateFilter('role', v)}
          options={[
            { value: '', label: 'Todos los roles' },
            { value: 'reader', label: 'Lectores' },
            { value: 'staff', label: 'Bibliotecarios' },
            { value: 'admin', label: 'Administradores' },
          ]}
        />
        <FilterSelect
          label="Estado"
          value={filters.active}
          onChange={(v) => updateFilter('active', v)}
          options={[
            { value: 'true', label: 'Activos' },
            { value: 'false', label: 'Inactivos' },
            { value: '', label: 'Todos' },
          ]}
        />
      </div>

      {/* Tabla */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <Spinner center />
        ) : users.length === 0 ? (
          <EmptyState
            icon="👤"
            title="Sin usuarios"
            desc="No hay usuarios que coincidan con la búsqueda"
            action={<Link to="/users/new" className="btn btn-primary">+ Registrar usuario</Link>}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Rol</th>
                  <th>Registrado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '34px', height: '34px',
                            borderRadius: '50%',
                            background: 'var(--color-accent-soft)',
                            color: 'var(--color-accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: '600', flexShrink: 0,
                          }}
                        >
                          {user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <span style={{ fontWeight: '600', color: 'var(--color-ink)' }}>{user.full_name}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-ink-3)' }}>
                      {user.document_id}
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      <div>{user.email ?? '—'}</div>
                      <div style={{ color: 'var(--color-ink-3)', fontSize: '12px' }}>{user.phone ?? ''}</div>
                    </td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-red' : user.role === 'staff' ? 'badge-amber' : 'badge-gray'}`}>
                        {USER_ROLES[user.role] ?? user.role}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>
                      {formatDate(user.created_at)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Link to={`/users/${user.id}`} className="btn btn-ghost btn-sm">Ver historial</Link>
                        <Link to={`/users/${user.id}/edit`} className="btn btn-secondary btn-sm">Editar</Link>
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
