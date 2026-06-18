/**
 * Export an array of flat row objects to a .xlsx file and trigger a download.
 * The keys of the first row become the column headers (in order).
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
  const workbook = XLSX.utils.book_new()
  // Sheet names are capped at 31 chars by the spec.
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}
