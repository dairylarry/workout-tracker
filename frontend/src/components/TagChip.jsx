export default function TagChip({ tag, active, onToggle }) {
  const colorStyle = { backgroundColor: tag.color.bg, color: tag.color.text }

  if (onToggle) {
    return (
      <button
        className={`tag-chip${active ? ' tag-chip--active' : ''}`}
        style={active ? colorStyle : undefined}
        onClick={() => onToggle(tag.id)}
      >
        {tag.name}
      </button>
    )
  }

  return (
    <span className="tag-chip tag-chip--badge" style={colorStyle}>
      {tag.name}
    </span>
  )
}
