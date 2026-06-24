/**
 * Export an array of flat row objects to a .xlsx file and trigger a download.
 * The keys of the first row become the column headers (in order).
 *
 * The sheet is tidied up for readability: columns are auto-sized to their widest
 * value and an auto-filter is applied to the header row, so the file looks
 * presentable when opened in Excel/LibreOffice.
 *
 * `xlsx` is imported dynamically so it stays out of the main bundle and is only
 * fetched when the user actually exports.
 */
export async function exportToXlsx(
  filename: string,
  sheetName: string,
  rows: Record<string, string | number | null>[],
): Promise<void> {
  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Auto-size each column to the widest cell (header or value), within bounds.
  const headers = Object.keys(rows[0] ?? {})
  worksheet['!cols'] = headers.map((header) => {
    const widest = rows.reduce((max, row) => {
      const value = row[header]
      const len = value == null ? 0 : String(value).length
      return Math.max(max, len)
    }, header.length)
    // Clamp so a stray long value can't blow the column out.
    return { wch: Math.min(Math.max(widest + 2, 8), 40) }
  })

  // Add a filter dropdown over the header row.
  if (headers.length > 0 && rows.length > 0) {
    worksheet['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: rows.length, c: headers.length - 1 },
      }),
    }
  }

  const workbook = XLSX.utils.book_new()
  // Sheet names are capped at 31 chars by the spec.
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}
