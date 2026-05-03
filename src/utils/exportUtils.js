import { formatDate } from './dates.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const LOAN_STATUS_LABEL = {
  active: 'Activo',
  renewed: 'Renovado',
  returned: 'Devuelto',
  overdue: 'Vencido',
}

// ── Mappers de datos ──────────────────────────────────────────────────────────

export function loansToRows(loans) {
  return loans.map(l => ({
    Usuario: l.borrower?.full_name ?? l.user_name ?? '—',
    Documento: l.borrower?.document_id ?? l.document_id ?? '—',
    Libro: l.books?.title ?? l.book_title ?? '—',
    Autor: l.books?.author ?? l.book_author ?? '—',
    Categoría: l.books?.categories?.name ?? '—',
    'Fecha préstamo': formatDate(l.loan_date),
    'Fecha vencimiento': formatDate(l.due_date),
    'Fecha devolución': l.return_date ? formatDate(l.return_date) : '—',
    Estado: LOAN_STATUS_LABEL[l.status] ?? l.status,
    'Registrado por': l.creator?.full_name ?? '—',
    'Devuelto por': l.returner?.full_name ?? '—',
  }))
}

export function finesToRows(fines) {
  return fines.map(f => ({
    Usuario: f.user_name ?? '—',
    Documento: f.document_id ?? '—',
    Libro: f.book_title ?? '—',
    Autor: f.book_author ?? '—',
    'Días vencido': f.days_overdue,
    'Monto (COP)': f.amount,
    Estado: f.waived ? 'Condonada' : 'Cobrada',
    'Motivo condonación': f.waived_reason ?? '—',
    'Gestionado por': f.collector_name ?? '—',
    Fecha: formatDate(f.paid_at),
  }))
}

export function topBooksToRows(books) {
  return books.map((b, i) => ({
    '#': i + 1,
    Título: b.title ?? '—',
    Autor: b.author ?? '—',
    'Veces prestado': b.count,
  }))
}

export function topCategoriesToRows(cats) {
  return cats.map((c, i) => ({
    '#': i + 1,
    Categoría: c.name ?? '—',
    'Veces prestado': c.count,
  }))
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function rowsToCsv(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = v => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ]
  return '﻿' + lines.join('\r\n') // BOM para Excel en español
}

export function downloadCsv(rows, filename) {
  const csv = rowsToCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename)
}

// ── Excel (lazy) ──────────────────────────────────────────────────────────────

export async function downloadExcel(sheets, filename) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows)
    const colWidths = rows.reduce((acc, row) => {
      Object.keys(row).forEach((key, i) => {
        const len = Math.max(String(key).length, String(row[key] ?? '').length)
        acc[i] = Math.max(acc[i] ?? 10, Math.min(len + 2, 40))
      })
      return acc
    }, [])
    ws['!cols'] = colWidths.map(w => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws, name)
  })
  XLSX.writeFile(wb, filename)
}

// ── PDF (lazy) ────────────────────────────────────────────────────────────────

export async function downloadPdf(sections, filename, title) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  let y = 18
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(title, pageW / 2, y, { align: 'center' })
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Generado el ${new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}`, pageW / 2, y, { align: 'center' })
  doc.setTextColor(0)
  y += 10

  sections.forEach(({ title: sectionTitle, rows }, idx) => {
    if (!rows.length) return

    if (idx > 0) {
      doc.addPage()
      y = 18
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(sectionTitle, 14, y)
    y += 6

    const headers = Object.keys(rows[0])
    autoTable(doc, {
      startY: y,
      head: [headers],
      body: rows.map(r => headers.map(h => r[h] ?? '—')),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [200, 75, 49], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 247, 244] },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 10
  })

  doc.save(filename)
}
