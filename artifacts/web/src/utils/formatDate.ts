export function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

/**
 * Generates an intelligent, layperson-friendly future follow-up date and time:
 * - During working hours (9 AM - 5 PM): Current time + 2 hours (rounded to top of the hour).
 * - After hours (after 5 PM): Next day at 11:00 AM.
 * - Early morning (before 9 AM): Today at 11:00 AM.
 * Formatted as standard HTML datetime-local string (YYYY-MM-DDTHH:mm).
 */
export function getSmartFollowUpDateTime(): string {
  const d = new Date()
  const currentHour = d.getHours()

  if (currentHour >= 9 && currentHour < 17) {
    d.setHours(d.getHours() + 2)
    d.setMinutes(0)
    d.setSeconds(0)
    d.setMilliseconds(0)
  } else if (currentHour >= 17) {
    d.setDate(d.getDate() + 1)
    d.setHours(11, 0, 0, 0)
  } else {
    d.setHours(11, 0, 0, 0)
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}