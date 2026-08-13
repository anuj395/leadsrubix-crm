export function exportToCSV(data: any[], columns: any[], filename = 'export.csv') {
  if (!data || data.length === 0) return

  const headers = columns.map(col => col.label || col.headerName || col.key || col.field).filter(Boolean)
  const keys = columns.map(col => col.key || col.field).filter(Boolean)

  const rows = [headers.join(',')]

  data.forEach((row) => {
    const values = keys.map((key) => {
      const val = row[key]
      if (val === undefined || val === null) return '""'
      const str = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ')
      return `"${str}"`
    })
    rows.push(values.join(','))
  })

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
