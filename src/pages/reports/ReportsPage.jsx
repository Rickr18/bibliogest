import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts'
import { Link } from 'react-router-dom'
import { reportsService } from '../../services/reportsService.js'
import { finesService } from '../../services/finesService.js'
import { Spinner } from '../../components/ui/Misc.jsx'
import {
  downloadCsv, downloadExcel, downloadPdf,
  loansToRows, finesToRows, topBooksToRows, topCategoriesToRows,
} from '../../utils/exportUtils.js'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const YEAR = new Date().getFullYear()

const PIE_COLORS = ['#16a34a', '#c84b31']
const CAT_COLORS = ['#c84b31', '#2563eb', '#d97706', '#7c3aed', '#16a34a', '#0891b2']

const CUSTOM_TOOLTIP_STYLE = {
  background: 'white',
  border: '1px solid #eceae3',
  borderRadius: '8px',
  fontSize: '13px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  padding: '8px 12px',
}

function SectionTitle({ children, subtitle }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', color: 'var(--color-ink)', margin: 0 }}>
        {children}
      </h3>
      {subtitle && (
        <p style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginTop: '3px' }}>{subtitle}</p>
      )}
    </div>
  )
}

function ChartError({ message }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '200px', flexDirection: 'column', gap: '8px',
      color: 'var(--color-ink-4)', fontSize: '13px',
    }}>
      <span style={{ fontSize: '24px' }}>⚠️</span>
      <span>{message ?? 'No se pudieron cargar los datos'}</span>
    </div>
  )
}

// ── Botón de exportación con menú desplegable ─────────────────────────────────
function ExportMenu({ onCsv, onExcel, onPdf, loading }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-secondary btn-sm"
        style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        onClick={() => setOpen(o => !o)}
        disabled={loading}
      >
        {loading ? '⏳ Exportando…' : '⬇ Exportar'}
        <span style={{ fontSize: '10px' }}>▾</span>
      </button>
      {open && !loading && (
        <>
          {/* overlay para cerrar al hacer click fuera */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: '4px',
            background: 'white', border: '1px solid var(--color-paper-3)',
            borderRadius: 'var(--radius)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 10, minWidth: '140px', overflow: 'hidden',
          }}>
            {[
              { label: '📄 CSV', action: onCsv },
              { label: '📊 Excel (.xlsx)', action: onExcel },
              { label: '🖨 PDF', action: onPdf },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={() => { action(); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 14px', fontSize: '13px', border: 'none',
                  background: 'none', cursor: 'pointer', color: 'var(--color-ink)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-paper-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const KPI_DEFS = [
  { key: 'total_books',     label: 'Total libros',       color: '#2563eb', icon: '📚', bg: '#eff6ff' },
  { key: 'available_books', label: 'Disponibles',        color: '#16a34a', icon: '✅', bg: '#f0fdf4' },
  { key: 'active_loans',    label: 'Préstamos activos',  color: '#c84b31', icon: '🔄', bg: '#fff5f3' },
  { key: 'overdue_loans',   label: 'Vencidos',           color: '#dc2626', icon: '⏰', bg: '#fef2f2' },
  { key: 'total_users',     label: 'Usuarios',           color: '#d97706', icon: '👤', bg: '#fffbeb' },
  { key: 'loans_this_month',label: 'Este mes',           color: '#7c3aed', icon: '📅', bg: '#faf5ff' },
]

export function ReportsPage() {
  const [exporting, setExporting] = useState(false)

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: reportsService.getDashboardStats,
  })

  const { data: monthlyRaw, isLoading: loadingMonthly, isError: errorMonthly } = useQuery({
    queryKey: ['loans-by-month', YEAR],
    queryFn: () => reportsService.getLoansByMonth(YEAR),
  })

  const { data: topBooks = [], isLoading: loadingTop, isError: errorTop } = useQuery({
    queryKey: ['most-loaned'],
    queryFn: () => reportsService.getMostLoanedBooks(),
  })

  const { data: topCategories = [], isLoading: loadingCats, isError: errorCats } = useQuery({
    queryKey: ['most-loaned-categories'],
    queryFn: () => reportsService.getMostLoanedCategories(),
  })

  const { data: finesStats } = useQuery({
    queryKey: ['fines-stats'],
    queryFn: () => finesService.getStats(),
  })

  const monthlyData = (monthlyRaw ?? []).map((count, i) => ({
    month: MONTHS[i],
    préstamos: count,
  }))

  const totalLoansYear = (monthlyRaw ?? []).reduce((s, c) => s + c, 0)

  // ── Funciones de exportación ──────────────────────────────────────────────

  async function fetchExportData() {
    const [loans, fines] = await Promise.all([
      reportsService.getAllLoansForExport(YEAR),
      finesService.getAllForExport(),
    ])
    return { loans, fines }
  }

  async function handleExportCsv(target) {
    setExporting(true)
    try {
      if (target === 'rankings') {
        const bookRows = topBooksToRows(topBooks)
        const catRows  = topCategoriesToRows(topCategories)
        downloadCsv(bookRows, `libros_mas_prestados_${YEAR}.csv`)
        if (catRows.length) downloadCsv(catRows, `categorias_mas_prestadas_${YEAR}.csv`)
      } else if (target === 'loans') {
        const loans = await reportsService.getAllLoansForExport(YEAR)
        downloadCsv(loansToRows(loans), `prestamos_${YEAR}.csv`)
      } else if (target === 'fines') {
        const fines = await finesService.getAllForExport()
        downloadCsv(finesToRows(fines), `multas_${YEAR}.csv`)
      } else {
        // Todo en archivos separados
        const { loans, fines } = await fetchExportData()
        downloadCsv(loansToRows(loans),       `prestamos_${YEAR}.csv`)
        downloadCsv(finesToRows(fines),        `multas_${YEAR}.csv`)
        downloadCsv(topBooksToRows(topBooks),  `libros_mas_prestados_${YEAR}.csv`)
        downloadCsv(topCategoriesToRows(topCategories), `categorias_mas_prestadas_${YEAR}.csv`)
      }
    } finally { setExporting(false) }
  }

  async function handleExportExcel(target) {
    setExporting(true)
    try {
      if (target === 'rankings') {
        downloadExcel([
          { name: 'Libros más prestados', rows: topBooksToRows(topBooks) },
          { name: 'Categorías',            rows: topCategoriesToRows(topCategories) },
        ], `rankings_${YEAR}.xlsx`)
      } else if (target === 'loans') {
        const loans = await reportsService.getAllLoansForExport(YEAR)
        downloadExcel([{ name: 'Préstamos', rows: loansToRows(loans) }], `prestamos_${YEAR}.xlsx`)
      } else if (target === 'fines') {
        const fines = await finesService.getAllForExport()
        downloadExcel([{ name: 'Multas', rows: finesToRows(fines) }], `multas_${YEAR}.xlsx`)
      } else {
        const { loans, fines } = await fetchExportData()
        downloadExcel([
          { name: 'Préstamos',            rows: loansToRows(loans) },
          { name: 'Multas',               rows: finesToRows(fines) },
          { name: 'Libros más prestados', rows: topBooksToRows(topBooks) },
          { name: 'Categorías',           rows: topCategoriesToRows(topCategories) },
        ], `reporte_completo_${YEAR}.xlsx`)
      }
    } finally { setExporting(false) }
  }

  async function handleExportPdf(target) {
    setExporting(true)
    try {
      if (target === 'rankings') {
        downloadPdf([
          { title: 'Libros más prestados', rows: topBooksToRows(topBooks) },
          { title: 'Categorías más prestadas', rows: topCategoriesToRows(topCategories) },
        ], `rankings_${YEAR}.pdf`, `Rankings de préstamos · ${YEAR}`)
      } else if (target === 'loans') {
        const loans = await reportsService.getAllLoansForExport(YEAR)
        downloadPdf([{ title: `Todos los préstamos ${YEAR}`, rows: loansToRows(loans) }],
          `prestamos_${YEAR}.pdf`, `Préstamos ${YEAR}`)
      } else if (target === 'fines') {
        const fines = await finesService.getAllForExport()
        downloadPdf([{ title: 'Libro contable de multas', rows: finesToRows(fines) }],
          `multas_${YEAR}.pdf`, `Multas · BiblioGest`)
      } else {
        const { loans, fines } = await fetchExportData()
        downloadPdf([
          { title: `Todos los préstamos ${YEAR}`, rows: loansToRows(loans) },
          { title: 'Libro contable de multas',    rows: finesToRows(fines) },
          { title: 'Libros más prestados',        rows: topBooksToRows(topBooks) },
          { title: 'Categorías más prestadas',    rows: topCategoriesToRows(topCategories) },
        ], `reporte_completo_${YEAR}.pdf`, `Reporte BiblioGest · ${YEAR}`)
      }
    } finally { setExporting(false) }
  }

  const disponibilidadData = stats
    ? [
        { name: 'Disponibles',  value: stats.available_books ?? 0 },
        { name: 'En préstamo',  value: (stats.total_books ?? 0) - (stats.available_books ?? 0) },
      ]
    : []

  const availablePct = stats && stats.total_books > 0
    ? Math.round(((stats.available_books ?? 0) / stats.total_books) * 100)
    : null

  return (
    <div>
      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Estadísticas y movimientos del sistema · {YEAR}</p>
        </div>
        <ExportMenu
          loading={exporting}
          onCsv={() => handleExportCsv('all')}
          onExcel={() => handleExportExcel('all')}
          onPdf={() => handleExportPdf('all')}
        />
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      {loadingStats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {KPI_DEFS.map(k => (
            <div key={k.key} className="stat-card" style={{ borderTop: `3px solid ${k.color}`, minHeight: '88px' }} />
          ))}
        </div>
      ) : stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {KPI_DEFS.map(({ key, label, color, icon }) => (
            <div
              key={key}
              className="stat-card"
              style={{ borderTop: `3px solid ${color}`, padding: '16px', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{
                position: 'absolute', top: '10px', right: '12px',
                fontSize: '22px', opacity: 0.18, userSelect: 'none',
              }}>
                {icon}
              </div>
              <p className="stat-label" style={{ fontSize: '11px', marginBottom: '6px' }}>{label}</p>
              <p className="stat-value" style={{ fontSize: '30px', color, fontWeight: '700', lineHeight: 1 }}>
                {stats[key] ?? '—'}
              </p>
              {key === 'available_books' && availablePct !== null && (
                <p style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>
                  {availablePct}% del catálogo
                </p>
              )}
              {key === 'overdue_loans' && stats.overdue_loans > 0 && (
                <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                  Requieren atención
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Gráficos fila 1: Préstamos por mes + Disponibilidad ──────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Préstamos por mes */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <SectionTitle subtitle={`${totalLoansYear} préstamos en total`}>
              Préstamos por mes — {YEAR}
            </SectionTitle>
            {totalLoansYear > 0 && (
              <span style={{
                fontSize: '11px', fontWeight: '600', padding: '3px 8px',
                borderRadius: '99px', background: 'var(--color-accent-soft)',
                color: 'var(--color-accent)',
              }}>
                {totalLoansYear} total
              </span>
            )}
          </div>
          {loadingMonthly ? <Spinner center /> : errorMonthly ? <ChartError /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradLoan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#c84b31" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#c84b31" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceae3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9b9bb5' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9b9bb5' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="préstamos"
                  stroke="#c84b31"
                  strokeWidth={2.5}
                  fill="url(#gradLoan)"
                  dot={{ r: 3, fill: '#c84b31', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#c84b31' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Disponibilidad */}
        <div className="card" style={{ padding: '24px' }}>
          <SectionTitle subtitle="Estado actual del inventario">Disponibilidad</SectionTitle>
          {!stats ? <Spinner center /> : disponibilidadData.every(d => d.value === 0) ? (
            <ChartError message="Sin datos de inventario" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={disponibilidadData}
                    cx="50%" cy="50%"
                    innerRadius={52} outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                    startAngle={90} endAngle={-270}
                  >
                    {disponibilidadData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              {/* Leyenda manual más informativa */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                {disponibilidadData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: PIE_COLORS[i], display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ color: 'var(--color-ink-3)' }}>{d.name}</span>
                    </div>
                    <span style={{ fontWeight: '600', color: 'var(--color-ink)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Libros más prestados + Categorías más prestadas (lado a lado) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

        {/* Libros más prestados */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--color-paper-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', margin: 0 }}>Libros más prestados</h3>
              <p style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '2px' }}>
                Ranking acumulado de todos los tiempos
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {topBooks.length > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--color-ink-4)' }}>Top {topBooks.length}</span>
              )}
              {topBooks.length > 0 && (
                <ExportMenu
                  loading={exporting}
                  onCsv={() => handleExportCsv('rankings')}
                  onExcel={() => handleExportExcel('rankings')}
                  onPdf={() => handleExportPdf('rankings')}
                />
              )}
            </div>
          </div>

          {loadingTop ? (
            <div style={{ padding: '48px' }}><Spinner center /></div>
          ) : errorTop ? (
            <ChartError message="No se pudo cargar el ranking de libros" />
          ) : topBooks.length === 0 ? (
            <div style={{ padding: '36px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>📖</div>
              <p style={{ fontWeight: '600', color: 'var(--color-ink-2)', marginBottom: '4px', fontSize: '14px' }}>Aún no hay préstamos registrados</p>
              <p style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>
                El ranking aparecerá automáticamente una vez se registren préstamos en el sistema.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Título</th>
                    <th style={{ textAlign: 'right', width: '90px' }}>Préstamos</th>
                    <th style={{ width: '120px' }}>Popularidad</th>
                  </tr>
                </thead>
                <tbody>
                  {topBooks.map((book, i) => {
                    const maxCount = topBooks[0]?.count ?? 1
                    const pct = Math.round((book.count / maxCount) * 100)
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                    return (
                      <tr key={i}>
                        <td style={{ textAlign: 'center' }}>
                          {medal ? (
                            <span style={{ fontSize: '16px' }}>{medal}</span>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--color-ink-4)', fontWeight: '600' }}>{i + 1}</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: '600', color: 'var(--color-ink)', fontSize: '13px' }}>{book.title ?? '—'}</span>
                          {book.author && (
                            <p style={{ fontSize: '11px', color: 'var(--color-ink-4)', margin: 0 }}>{book.author}</p>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--color-accent)' }}>
                            {book.count}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--color-ink-4)', marginLeft: '3px' }}>
                            {book.count === 1 ? 'vez' : 'veces'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ flex: 1, background: 'var(--color-paper-3)', borderRadius: '99px', height: '5px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${pct}%`,
                                background: i === 0 ? 'linear-gradient(90deg, #c84b31, #e8754a)' : 'var(--color-accent)',
                                borderRadius: '99px', transition: 'width 0.4s ease',
                              }} />
                            </div>
                            <span style={{ fontSize: '10px', color: 'var(--color-ink-4)', width: '28px', textAlign: 'right' }}>
                              {pct}%
                            </span>
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

        {/* Categorías más prestadas */}
        <div className="card" style={{ padding: '20px' }}>
          <SectionTitle subtitle="Géneros o materias más solicitados">
            Categorías más prestadas
          </SectionTitle>
          {loadingCats ? <Spinner center /> : errorCats ? <ChartError /> : topCategories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-ink-4)', fontSize: '14px' }}>
              No hay datos de categorías disponibles aún
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, topCategories.length * 44)}>
              <BarChart
                data={topCategories}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eceae3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9b9bb5' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-ink-2)' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Bar dataKey="count" name="préstamos" radius={[0, 4, 4, 0]}>
                  {topCategories.map((_, i) => (
                    <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* ── Préstamos del año (exportable) ── */}
      <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
          <SectionTitle subtitle={`Todos los préstamos registrados en ${YEAR} — exporta para análisis externo`}>
            Préstamos del año
          </SectionTitle>
          <ExportMenu
            loading={exporting}
            onCsv={() => handleExportCsv('loans')}
            onExcel={() => handleExportExcel('loans')}
            onPdf={() => handleExportPdf('loans')}
          />
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', lineHeight: '1.6' }}>
          Descarga el listado completo de préstamos de {YEAR} con usuario, libro, categoría, fechas y estado.
          El Excel incluye todas las columnas para análisis en hoja de cálculo.
        </p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
          {[
            { label: `Préstamos ${YEAR}`, value: totalLoansYear, color: 'var(--color-accent)' },
            { label: 'Total libros en sistema', value: stats?.total_books ?? '—', color: 'var(--color-blue)' },
            { label: 'Activos ahora', value: stats?.active_loans ?? '—', color: 'var(--color-ink-3)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'var(--color-paper-2)', borderRadius: 'var(--radius)',
              padding: '10px 16px', borderLeft: `3px solid ${color}`,
            }}>
              <p style={{ fontSize: '10px', color: 'var(--color-ink-4)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Multas ── */}
      <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <SectionTitle subtitle="Pagos por retraso en devoluciones registrados en el sistema">
            Multas cobradas
          </SectionTitle>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <ExportMenu
              loading={exporting}
              onCsv={() => handleExportCsv('fines')}
              onExcel={() => handleExportExcel('fines')}
              onPdf={() => handleExportPdf('fines')}
            />
            <Link to="/fines" className="btn btn-secondary btn-sm" style={{ fontSize: '12px' }}>
              Ver libro contable →
            </Link>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Total recaudado', value: `$${Number(finesStats?.total_collected ?? 0).toLocaleString('es-CO')}`, color: 'var(--color-red)' },
            { label: 'Este mes',        value: `$${Number(finesStats?.this_month ?? 0).toLocaleString('es-CO')}`,        color: 'var(--color-accent)' },
            { label: 'Total cobros',    value: finesStats?.count ?? 0,                                                    color: 'var(--color-blue)' },
            { label: 'Cobros este mes', value: finesStats?.count_this_month ?? 0,                                         color: 'var(--color-amber)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card" style={{ borderLeft: `3px solid ${color}`, padding: '14px 16px' }}>
              <p className="stat-label" style={{ fontSize: '10px' }}>{label}</p>
              <p className="stat-value" style={{ fontSize: '20px', color }}>{value}</p>
            </div>
          ))}
        </div>
        {(finesStats?.count ?? 0) === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--color-ink-4)', marginTop: '16px', textAlign: 'center' }}>
            Aún no se han registrado multas. Se registran al confirmar una devolución con retraso.
          </p>
        )}
      </div>

    </div>
  )
}
