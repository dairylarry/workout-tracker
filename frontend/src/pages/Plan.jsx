import { useNavigate } from 'react-router-dom'
import '../styles/Plan.css'

const SESSIONS = [
  {
    title: 'Lower A — Strength + Hypertrophy',
    exercises: [
      { name: 'Barbell Back Squat', sets: '5/3/1', reps: '—', rest: '3–4 min' },
      { name: 'Bulgarian Split Squat', sets: '3', reps: '8–12/leg (RIR 2)', rest: '90 sec', subs: ['DB Lunge', 'Goblet Split Squat'] },
      { name: 'Romanian Deadlift (or DB/KB RDL)', sets: '3', reps: '6–10 (RIR 2)', rest: '2 min', subs: ['DB Romanian Deadlift', 'KB Romanian Deadlift'] },
      { name: 'Barbell Hip Thrust (or DB/KB hip thrust)', sets: '3', reps: '8–12 (RIR 2)', rest: '90 sec', subs: ['DB Hip Thrust', 'KB Hip Thrust'] },
      { name: 'Standing Calf Raise (or single-leg DB calf raise)', sets: '3', reps: '12–15 (RIR 1)', rest: '60 sec', subs: ['Single-Leg DB Calf Raise'] },
    ],
    notes: ['On weeks with a long run ≥60 min Saturday, cap BSS at 8 reps/leg.'],
  },
  {
    title: 'Upper A — Strength + Hypertrophy',
    exercises: [
      { name: 'Flat Barbell Bench Press', sets: '5/3/1', reps: '—', rest: '3–4 min' },
      { name: 'Weighted Pull-Up', sets: '3', reps: '6–10 (RIR 2)', rest: '90 sec', subs: ['Lat Pulldown', 'Band-Assisted Pull-Up'] },
      { name: 'Barbell Bent-Over Row (or DB/KB bent-over row)', sets: '3', reps: '8–10 (RIR 2)', rest: '90 sec', subs: ['DB Bent-Over Row', 'KB Bent-Over Row'] },
      { name: 'Seated DB Shoulder Press', sets: '3', reps: '8–12 (RIR 2)', rest: '90 sec', subs: ['Standing DB Shoulder Press', 'Machine Shoulder Press'] },
      { name: 'Cable Lateral Raise (or DB lateral raise)', sets: '3', reps: '12–15 (RIR 1)', rest: '60 sec', subs: ['DB Lateral Raise'] },
      { name: 'Tricep Rope Pushdown', sets: '3', reps: '10–12 (RIR 1)', rest: '60 sec', subs: ['Tricep Bar Pushdown', 'Band Tricep Pushdown'] },
      { name: 'EZ Bar Curl (or DB curl)', sets: '3', reps: '10–12 (RIR 1)', rest: '60 sec', subs: ['DB Curl', 'Barbell Curl'] },
    ],
    notes: ['Superset: Tricep Rope Pushdown + EZ Bar Curl — do back to back, rest after the curl.'],
  },
  {
    title: 'Lower B — Hypertrophy',
    exercises: [
      { name: 'Hack Squat (or goblet squat)', sets: '3', reps: '8–12 (RIR 2)', rest: '2 min', subs: ['Goblet Squat', 'Leg Press'] },
      { name: 'Nordic Curl', sets: '3', reps: '5–8 (RIR 2)', rest: '2 min', subs: ['Seated Leg Curl', 'Lying Leg Curl'] },
      { name: 'Single-Leg Romanian Deadlift (DB or KB)', sets: '3', reps: '8–10/leg (RIR 2)', rest: '90 sec', subs: ['DB Single-Leg RDL', 'KB Single-Leg RDL'] },
      { name: 'Barbell Hip Thrust (or DB/KB hip thrust)', sets: '3', reps: '8–12 (RIR 2)', rest: '90 sec', subs: ['DB Hip Thrust', 'KB Hip Thrust'] },
      { name: 'Leg Extension (or cable leg extension) (optional)', sets: '3', reps: '12–15 (RIR 1)', rest: '60 sec', subs: ['Cable Leg Extension'] },
      { name: 'Seated Calf Raise (or seated DB calf raise)', sets: '3', reps: '15–20 (RIR 1)', rest: '60 sec', subs: ['Seated DB Calf Raise'] },
    ],
    notes: [
      'Nordic Curls: 3–5 sec eccentric, controlled return; start at 4–5 reps and build.',
      'On weeks with a long run ≥60 min Saturday, make Leg Extension optional.',
      'Superset: Leg Extension + Seated Calf Raise.',
    ],
  },
  {
    title: 'Upper B — Hypertrophy',
    exercises: [
      { name: 'Barbell Overhead Press', sets: '3', reps: '6–8 (RIR 2)', rest: '2 min', subs: ['DB Overhead Press', 'Landmine Press'] },
      { name: 'Pull-Up', sets: '3', reps: '8–12 (RIR 2)', rest: '90 sec', subs: ['Lat Pulldown', 'Band-Assisted Pull-Up'] },
      { name: 'Incline DB Press', sets: '3', reps: '8–12 (RIR 2)', rest: '90 sec', subs: ['Incline Barbell Press', 'Machine Incline Press'] },
      { name: 'Chest-Supported DB Row (or single-arm DB row)', sets: '3', reps: '10–12 (RIR 2)', rest: '90 sec', subs: ['Single-Arm DB Row', 'Machine Row'] },
      { name: 'Cable Face Pull', sets: '3', reps: '12–15 (RIR 1)', rest: '60 sec', subs: ['Band Face Pull', 'Rear Delt Fly'] },
      { name: 'Cable Lateral Raise (or DB lateral raise)', sets: '3', reps: '15–20 (RIR 1)', rest: '60 sec', subs: ['DB Lateral Raise'] },
      { name: 'Overhead Tricep Extension (DB or cable) (optional)', sets: '3', reps: '10–12 (RIR 1)', rest: '60 sec', subs: ['DB Overhead Tricep Extension', 'Cable Overhead Extension'] },
      { name: 'Hammer Curl', sets: '3', reps: '10–12 (RIR 1)', rest: '60 sec', subs: ['DB Hammer Curl', 'Cross-Body Hammer Curl'] },
    ],
    notes: [
      'Superset A: Cable Face Pull + Cable Lateral Raise.',
      'Superset B: Overhead Tricep Extension + Hammer Curl (if doing optional).',
      'If anterior shoulder discomfort develops, drop an OHP set first.',
    ],
  },
]

const SCHEDULE = [
  { day: 'Mon', activity: 'Lower A' },
  { day: 'Tue', activity: 'Upper A' },
  { day: 'Wed', activity: 'Easy–moderate run, 30–50 min' },
  { day: 'Thu', activity: 'Lower B' },
  { day: 'Fri', activity: 'Upper B' },
  { day: 'Sat', activity: 'Long run, 60–90 min (moderate effort max)' },
  { day: 'Sun', activity: 'Rest or yoga' },
]

export default function Plan() {
  const navigate = useNavigate()

  return (
    <div className="plan">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <h2>Spring 2026 Program</h2>

      <div className="plan-meta">
        <p><strong>Split:</strong> Upper/Lower A/B · 4 days/week</p>
        <p><strong>Intensity:</strong> Compounds RIR 2 · Isolations RIR 1</p>
        <p><strong>Progression:</strong> Double progression on all accessories. 5/3/1 on Bench + Squat.</p>
        <p><strong>Deload:</strong> Every 5–6 weeks, or after 2+ weeks of declining performance. Cut sets ~40%, keep loads.</p>
        <p><strong>Core:</strong> 10 min after each session (handstands, ab wheel, hollow body)</p>
      </div>

      {SESSIONS.map(session => (
        <div key={session.title} className="plan-section">
          <h3>{session.title}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Sets</th>
                  <th>Reps</th>
                  <th>Rest</th>
                </tr>
              </thead>
              <tbody>
                {session.exercises.map(ex => (
                  <tr key={ex.name}>
                    <td>
                      {ex.name}
                      {ex.subs && (
                        <span className="plan-subs">Subs: {ex.subs.join(', ')}</span>
                      )}
                    </td>
                    <td>{ex.sets}</td>
                    <td>{ex.reps}</td>
                    <td>{ex.rest}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {session.notes.map(note => (
            <p key={note} className="plan-note">{note}</p>
          ))}
        </div>
      ))}

      <div className="plan-section">
        <h3>Weekly Schedule</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Day</th><th>Activity</th></tr>
            </thead>
            <tbody>
              {SCHEDULE.map(row => (
                <tr key={row.day}>
                  <td>{row.day}</td>
                  <td>{row.activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="plan-section">
        <h3>Nutrition</h3>
        <ul>
          <li>Protein: 170–190g/day</li>
          <li>Calories: ~150–300 kcal below maintenance. Eat near maintenance on Lower days.</li>
          <li>Pre-lift (60–90 min before): 30–50g carbs + 30g protein, low fat</li>
          <li>Post-lift (within 90 min): 40–60g carbs + 40g protein</li>
          <li>If weight drops faster than 0.5 lb/week for 2+ weeks, add 150–200 kcal on training days</li>
        </ul>
      </div>

      <div className="plan-section">
        <h3>Plateau Management</h3>
        <ul>
          <li>Double-progression lifts: if stalled 2+ weeks through a deload, drop load 10% and rebuild</li>
          <li>5/3/1 lifts: if AMRAP drops below target for 2+ weeks after deload, reset training max 10%</li>
        </ul>
      </div>
    </div>
  )
}
