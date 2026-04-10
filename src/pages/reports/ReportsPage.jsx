import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { reportsService } from '../../services/reportsService.js'
import { Spinner } from '../../components/ui/Misc.jsx'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const YEAR = new Date().getFullYear()

const PIE_COLORS = ['#c84b31', '#2563eb', '#16a34a', '#d97706']

export function ReportsPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: reportsService.getDashboardStats,
  })

  const { data: monthlyRaw, isLoading: loadingMonthly } = useQuery({
    queryKey: ['loans-by-month', YEAR],
    queryFn: () => reportsService.getLoansByMonth(YEAR),
  })

  const { data: topBooks = [], isLoading: loadingTop } = useQuery({
    queryKey: ['most-loaned'],
    queryFn: reportsService.getMostLoanedBooks,
  })

  const monthlyData = (monthlyRaw ?? []).map((count, i) => ({
    month: MONTHS[i],
    préstamos: count,
  }))

  const disponibilidadData = stats
    ? [
        { name: 'Disponibles', value: stats.available_books ?? 0 },
        { name: 'En préstamo', value: (stats.total_books ?? 0) - (stats.available_books ?? 0) },
      ]
    : []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Estadísticas y movimientos del sistema</p>
        </div>
      </div>

      {/* KPI resumen */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Total libros', value: stats.total_books, color: '#2563eb' },
            { label: 'Disponibles', value: stats.available_books, color: '#16a34a' },
            { label: 'Préstamos activos', value: stats.active_loans, color: '#c84b31' },
            { label: 'Vencidos', value: stats.overdue_loans, color: '#dc2626' },
            { label: 'Usuarios', value: stats.total_users, color: '#d97706' },
            { label: 'Este mes', value: stats.loans_this_month, color: '#7c3aed' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
              <p className="stat-label">{label}</p>
              <p className="stat-value" style={{ fontSize: '28px', color }}>{value ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Préstamos por mes */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '20px' }}>
            Préstamos por mes — {YEAR}
          </h3>
          {loadingMonthly ? (
            <Spinner center />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceae3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9b9bb5' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9b9bb5' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #eceae3',
                    borderRadius: '8px',
                    fontSize: '13px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="préstamos" fill="#c84b31" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Disponibilidad */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '20px' }}>
            Disponibilidad
          </h3>
          {disponibilidadData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={disponibilidadData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {disponibilidadData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #eceae3',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: '13px', color: '#2d2d4e' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Spinner center />
          )}
        </div>
      </div>

      {/* Libros más prestados */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-paper-3)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px' }}>
            Libros más prestados
          </h3>
        </div>
        {loadingTop ? (
          <Spinner center />
        ) : topBooks.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-ink-3)', fontSize: '14px' }}>
            Aún no hay suficientes datos de préstamos
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Título</th>
                  <th>Autor</th>
                  <th style={{ textAlign: 'right' }}>Total préstamos</th>
                  <th>Popularidad</th>
                </tr>
              </thead>
              <tbody>
                {topBooks.map((book, i) => {
                  const maxCount = topBooks[0]?.count ?? 1
                  const pct = Math.round((book.count / maxCount) * 100)
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--color-ink-4)', fontSize: '13px', width: '40px' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                      </td>
                      <td style={{ fontWeight: '600', color: 'var(--color-ink)' }}>{book.title}</td>
                      <td style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>{book.author}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--color-accent)' }}>{book.count}</td>
                      <td style={{ width: '160px' }}>
                        <div style={{ background: 'var(--color-paper-3)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: 'var(--color-accent)',
                              borderRadius: '99px',
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
