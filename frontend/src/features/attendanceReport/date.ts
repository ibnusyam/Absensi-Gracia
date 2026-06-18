/** Local date as YYYY-MM-DD (avoids the UTC off-by-one of toISOString). */
export function todayString(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}
