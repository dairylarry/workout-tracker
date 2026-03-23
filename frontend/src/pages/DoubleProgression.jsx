import { useNavigate } from 'react-router-dom'
import '../styles/DoubleProgression.css'

const EXAMPLE_PHASE1 = [
  { session: 1, weight: 50, sets: [8, 8, 8], note: 'At bottom of 8–12; keep weight.' },
  { session: 2, weight: 50, sets: [9, 8, 8], note: 'Add reps where you can.' },
  { session: 3, weight: 50, sets: [9, 9, 8] },
  { session: 4, weight: 50, sets: [9, 9, 9] },
  { session: 5, weight: 50, sets: [10, 9, 9] },
  { session: 6, weight: 50, sets: [10, 10, 9] },
  { session: 7, weight: 50, sets: [10, 10, 10] },
  { session: 8, weight: 50, sets: [11, 10, 10] },
  { session: 9, weight: 50, sets: [11, 11, 10] },
  { session: 10, weight: 50, sets: [11, 11, 11] },
  { session: 11, weight: 50, sets: [12, 11, 11], note: 'First set at 12 — not done yet.' },
  { session: 12, weight: 50, sets: [12, 12, 11] },
  { session: 13, weight: 50, sets: [12, 12, 12], note: 'All sets at top → add load.', highlight: true },
]

export default function DoubleProgression() {
  const navigate = useNavigate()

  return (
    <div className="dp">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <h2>Double Progression (with RIR)</h2>

      <div className="dp-section">
        <p className="dp-intro">
          <strong>Double progression:</strong> add reps until the top of the prescribed rep range,
          then add load and reset to the bottom. <strong>RIR</strong> is separate: it describes how
          hard each set is (~RIR 2 on compounds, ~RIR 1 on isolations), not when to change weight.
        </p>
      </div>

      <div className="dp-section">
        <h3>Rule in one line</h3>
        <p>Hold weight steady and build reps to the <strong>top</strong> of the bracket; then increase
        load and drop reps back toward the <strong>bottom</strong>. Repeat.</p>
      </div>

      <div className="dp-section">
        <h3>Example: Incline DB Press</h3>
        <p className="dp-config">3 sets · 8–12 reps · ~RIR 2</p>
        <ul className="dp-key-points">
          <li><strong>Bottom:</strong> 8 reps</li>
          <li><strong>Top:</strong> 12 reps</li>
          <li><strong>Trigger:</strong> hit 12, 12, 12 on all sets → go up (+5 lb/hand)</li>
        </ul>
      </div>

      <div className="dp-section">
        <h3>Phase 1 — Same weight, reps climb</h3>
        <p>Open with a weight where 8 reps leaves about 2 reps in reserve (RIR 2). Example: 50 lb dumbbells.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>lbs</th>
                <th>S1</th>
                <th>S2</th>
                <th>S3</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLE_PHASE1.map(row => (
                <tr key={row.session} className={row.highlight ? 'highlight-row' : ''}>
                  <td>{row.session}</td>
                  <td>{row.weight}</td>
                  <td>{row.sets[0]}</td>
                  <td>{row.sets[1]}</td>
                  <td>{row.sets[2]}</td>
                  <td className="note-cell">{row.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="dp-note">Sessions won't always move one rep forward; repeating a week is fine.
        The idea is fixed weight until 12, 12, 12.</p>
      </div>

      <div className="dp-section">
        <h3>Phase 2 — Add load, reps reset</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>lbs</th>
                <th>S1</th>
                <th>S2</th>
                <th>S3</th>
              </tr>
            </thead>
            <tbody>
              <tr className="highlight-row">
                <td>14</td>
                <td><strong>55</strong></td>
                <td><strong>8</strong></td>
                <td><strong>8</strong></td>
                <td><strong>8</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Heavier weight → back toward the bottom of 8–12. Then climb 8 → … → 12 again on 55s.</p>
      </div>

      <div className="dp-section">
        <h3>RIR sanity check</h3>
        <p>Double progression says <strong>when</strong> to bump weight (all sets at the top of the range).
        RIR says <strong>whether</strong> the weight is appropriate: if the next step up (e.g. 55s for 8s) is
        RIR 0, the jump is too big — use a smaller increment if available, or stay at the old weight until
        12, 12, 12 feels less like max effort before trying the jump again.</p>
      </div>

      <div className="dp-section">
        <h3>Why "double"</h3>
        <p>Two staged progressions: <strong>reps up</strong> at the same load, then <strong>load up</strong> with
        reps reset. Not "twice as fast."</p>
      </div>
    </div>
  )
}
