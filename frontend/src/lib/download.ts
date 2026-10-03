const NUMBER = /^[+-]?\d+(\.\d+)?%?$/
const FORMULA_START = /^[=+\-@\t\r]/

function csvCell(value: string): string {
  // Free text such as coach notes must not run as a spreadsheet formula.
  const safe = FORMULA_START.test(value) && !NUMBER.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
