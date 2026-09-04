/**
 * Date helpers shared by the document forms.
 *
 * The API's `docDate`/`expiryDate` are Postgres `date` columns — a calendar day
 * with no time zone. `toISOString()` would convert through UTC and shift the day
 * backwards for anyone east of Greenwich (Thailand is UTC+7, so any time before
 * 07:00 lands on the previous date), so the parts are read in local time.
 */
export function toIsoDate(value) {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** `2026-09-04` → `4 ก.ย. 2026`, for display. */
export function formatThaiDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Same, with the time — used where a row shows when a document was raised. */
export function formatThaiDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
