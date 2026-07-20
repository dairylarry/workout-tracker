export const TAG_COLORS = [
  { bg: '#fef3c7', text: '#92400e' }, // amber
  { bg: '#ffedd5', text: '#c2410c' }, // orange
  { bg: '#dbeafe', text: '#1e40af' }, // blue
  { bg: '#d1fae5', text: '#065f46' }, // green
  { bg: '#ede9fe', text: '#5b21b6' }, // purple
  { bg: '#fce7f3', text: '#9d174d' }, // pink
  { bg: '#fee2e2', text: '#991b1b' }, // red
  { bg: '#ccfbf1', text: '#134e4a' }, // teal
  { bg: '#e0e7ff', text: '#3730a3' }, // indigo
  { bg: '#ecfccb', text: '#365314' }, // lime
  { bg: '#ffe4e6', text: '#9f1239' }, // rose
]

export const DEFAULT_TAGS = [
  { id: 'deload', name: 'Deload', color: TAG_COLORS[0] },
]

export function nextTagColor(existingCount) {
  return TAG_COLORS[existingCount % TAG_COLORS.length]
}

// Returns effective tag IDs for a session, handling legacy sessions that stored
// deload as a boolean field instead of the tags array.
export function resolveSessionTags(session) {
  const tags = [...(session.tags || [])]
  // Legacy: pre-tag sessions stored deload as a boolean field
  if (session.deload && !tags.includes('deload')) tags.unshift('deload')
  return tags
}

// Same as resolveSessionTags but for exercise history entries in the library.
export function resolveHistoryTags(entry) {
  const tags = [...(entry.tags || [])]
  // Legacy: pre-tag exercise history stored deload as a boolean field
  if (entry.deload && !tags.includes('deload')) tags.unshift('deload')
  return tags
}
