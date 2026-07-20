import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTags, putTags } from '../lib/dynamodb'
import { DEFAULT_TAGS, nextTagColor } from '../constants/tags'
import TagChip from '../components/TagChip'
import '../styles/ManageTags.css'

export default function ManageTags() {
  const navigate = useNavigate()
  const [tags, setTags] = useState(null)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

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
          <div key={tag.id} className="mt-row">
            <TagChip tag={tag} />
            <button
              className="mt-delete-btn"
              onClick={() => handleDelete(tag.id)}
            >
              Remove
            </button>
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
