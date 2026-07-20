import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTags, putTags } from '../lib/dynamodb'
import { DEFAULT_TAGS, nextTagColor, TAG_COLORS } from '../constants/tags'
import TagChip from '../components/TagChip'
import '../styles/ManageTags.css'

export default function ManageTags() {
  const navigate = useNavigate()
  const [tags, setTags] = useState(null)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(null)

  useEffect(() => {
    async function load() {
      let loaded = await getTags()
      if (loaded === null) {
        loaded = DEFAULT_TAGS
        await putTags(loaded)
      }
      setTags(loaded)
    }
    load()
  }, [])

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (tags.some(t => t.id === id)) return
    const activeTags = tags.filter(t => !t.deleted)
    const color = nextTagColor(activeTags.length)
    const next = [...tags, { id, name, color }]
    setSaving(true)
    await putTags(next)
    setTags(next)
    setNewName('')
    setSaving(false)
  }

  async function handleDelete(id) {
    const next = tags.map(t => t.id === id ? { ...t, deleted: true } : t)
    await putTags(next)
    setTags(next)
    if (editingId === id) setEditingId(null)
  }

  function startEdit(tag) {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  async function handleSaveEdit() {
    const name = editName.trim()
    if (!name) return
    const next = tags.map(t =>
      t.id === editingId ? { ...t, name, color: editColor } : t
    )
    await putTags(next)
    setTags(next)
    setEditingId(null)
  }

  if (!tags) return <div className="manage-tags"><p>Loading...</p></div>

  const active = tags.filter(t => !t.deleted)

  return (
    <div className="manage-tags">
      <button className="back" onClick={() => navigate('/manage')}>← Back</button>
      <h2>Manage Tags</h2>
      <p className="mt-subtitle">Tags appear as selectable chips when logging a session.</p>

      <div className="mt-list">
        {active.length === 0 && <p className="mt-empty">No tags yet.</p>}
        {active.map(tag => (
          <div key={tag.id} className={`mt-row${editingId === tag.id ? ' mt-row--editing' : ''}`}>
            {editingId === tag.id ? (
              <div className="mt-edit-form">
                <input
                  className="mt-input mt-edit-input"
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                  maxLength={30}
                  autoFocus
                />
                <div className="mt-color-picker">
                  {TAG_COLORS.map((c, i) => (
                    <button
                      key={i}
                      className={`mt-color-swatch${editColor?.bg === c.bg ? ' mt-color-swatch--active' : ''}`}
                      style={{ backgroundColor: c.bg, color: c.text }}
                      onClick={() => setEditColor(c)}
                    >
                      Aa
                    </button>
                  ))}
                </div>
                <div className="mt-edit-actions">
                  <button className="mt-save-btn" onClick={handleSaveEdit} disabled={!editName.trim()}>
                    Save
                  </button>
                  <button className="mt-cancel-btn" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <TagChip tag={tag} />
                <div className="mt-row-actions">
                  <button className="mt-edit-btn" onClick={() => startEdit(tag)}>Edit</button>
                  <button className="mt-delete-btn" onClick={() => handleDelete(tag.id)}>×</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-add-row">
        <input
          className="mt-input"
          type="text"
          placeholder="New tag name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          maxLength={30}
        />
        <button
          className="mt-add-btn"
          onClick={handleAdd}
          disabled={!newName.trim() || saving}
        >
          Add
        </button>
      </div>
    </div>
  )
}
