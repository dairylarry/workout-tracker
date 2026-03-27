/**
 * Seed data for core workout routines.
 *
 * Each routine is stored as a single DynamoDB item (CORE_ROUTINE#<id>).
 * The `routine` array defines blocks of exercises — each block has a
 * `numberOfTimes` repeat count and an ordered list of exercises.
 *
 * Optional block field:
 *   `label` — human-readable block name for UI display (e.g. "Phase 1 — 25/25")
 *
 * At playback time, the timer unfurls blocks into a flat exercise list
 * and forces restSeconds = 0 on the final exercise.
 *
 * category values: 'mat' | 'handstand' | 'skill' | 'equipment'
 */
export const CORE_WORKOUT_SEED = [
  {
    id: 'ground-level',
    name: 'Ground Level',
    category: 'mat',
    difficulty: 3,
    equipment: 'mat',
    equipmentOptional: 'dumbbell or kettlebell',
    routine: [
      {
        label: 'Warm-up',
        numberOfTimes: 1,
        exercises: [{ name: 'Dead Bug (alternating arm and leg)', workSeconds: 45, restSeconds: 15, cue: 'lower back pinned to mat, move only as far as you can control' }]
      },
      {
        numberOfTimes: 2,
        exercises: [
          { name: 'Hollow Body Hold', workSeconds: 40, restSeconds: 20, cue: 'long body, rib cage down, press lower back into mat' },
          { name: 'Reverse Crunch', workSeconds: 40, restSeconds: 20, cue: 'curl hips up, not momentum — control the lower' },
          { name: 'Plank Shoulder Tap', workSeconds: 40, restSeconds: 20, cue: 'hips still, feet wide if needed, slow taps' },
          { name: 'Left Side Plank Hold', workSeconds: 45, restSeconds: 0, cue: 'hips stacked, drive top hip to ceiling' },
          { name: 'Right Side Plank Hold', workSeconds: 45, restSeconds: 30, cue: 'hips stacked, drive top hip to ceiling' },
        ],
      },
      {
        label: 'Finisher',
        numberOfTimes: 1,
        exercises: [
          { name: 'Forearm Plank Hold', workSeconds: 45, restSeconds: 0, cue: 'full tension, RKC grip, squeeze everything' },
        ],
      },
    ],
    notes: 'Post-strength finisher. The 40/20 ratio is productive without being punishing after a hard session.',
    progressions: [
      'Harder variation: dead bug → 3-second lowering; hollow hold → hollow body rock.',
      'Reduce rest: cut to 15s across all intervals, then 10s.',
      'Add load: hold a light dumbbell or kettlebell overhead on dead bug and hollow hold.',
    ],
  },
  {
    id: 'ignition',
    name: 'Ignition',
    category: 'mat',
    difficulty: 4,
    equipment: 'mat',
    equipmentOptional: 'weight plate',
    routine: [
      {
        label: 'Phase 1 — 25/25',
        numberOfTimes: 1,
        exercises: [
          { name: 'Hollow Hold (tucked knees)', workSeconds: 25, restSeconds: 25, cue: 'rib cage down, press lower back into mat' },
          { name: 'Leg Lower (slow)', workSeconds: 25, restSeconds: 25, cue: '4-count descent, lower back stays pinned' },
          { name: 'Dead Bug (contralateral)', workSeconds: 25, restSeconds: 25, cue: 'opposite arm and leg, exhale on extension' },
        ],
      },
      {
        label: 'Phase 2 — 45/15',
        numberOfTimes: 1,
        exercises: [
          { name: 'Hollow Hold (tucked knees)', workSeconds: 45, restSeconds: 15, cue: 'rib cage down, press lower back into mat' },
          { name: 'Leg Lower (slow)', workSeconds: 45, restSeconds: 15, cue: '4-count descent, lower back stays pinned' },
          { name: 'Dead Bug (contralateral)', workSeconds: 45, restSeconds: 15, cue: 'opposite arm and leg, exhale on extension' },
        ],
      },
      {
        label: 'Phase 3 — 60/10',
        numberOfTimes: 1,
        exercises: [
          { name: 'Hollow Hold (tucked knees)', workSeconds: 60, restSeconds: 10, cue: 'rib cage down, press lower back into mat' },
          { name: 'Leg Lower (slow)', workSeconds: 60, restSeconds: 10, cue: '4-count descent, lower back stays pinned' },
          { name: 'Dead Bug (contralateral)', workSeconds: 60, restSeconds: 10, cue: 'opposite arm and leg, exhale on extension' },
        ],
      },
      {
        label: 'Finisher',
        numberOfTimes: 1,
        exercises: [
          { name: 'RKC Plank Hold', workSeconds: 30, restSeconds: 0, cue: 'squeeze everything, posterior pelvic tilt, max tension' },
        ],
      },
    ],
    notes: 'Three-phase structure that escalates work-to-rest ratio across identical exercises — 25/25, then 45/15, then 60/10. Ends with a 30s RKC plank as a prone finisher.',
    progressions: [
      'Harder variation: phase 3 hollow hold → hollow body rock; leg lower → straight-leg to floor hover.',
      'Compress phases: start at phase 2 timing and move directly to phase 3 after 2 minutes.',
      'Add load: phase 3 only — light plate held overhead for hollow hold and dead bug.',
    ],
  },
  {
    id: 'slow-burn',
    name: 'Slow Burn',
    category: 'mat',
    difficulty: 3,
    equipment: 'mat',
    equipmentOptional: 'dumbbell or kettlebell',
    routine: [
      {
        label: 'Phase 1 — 30/20',
        numberOfTimes: 1,
        exercises: [
          { name: 'Plank Shoulder Tap', workSeconds: 30, restSeconds: 20, cue: 'hips square, slow deliberate taps' },
          { name: 'Left Side Plank Hold', workSeconds: 30, restSeconds: 20, cue: 'hips stacked, drive top hip to ceiling' },
          { name: 'Right Side Plank Hold', workSeconds: 30, restSeconds: 20, cue: 'hips stacked, drive top hip to ceiling' },
          { name: 'Bear Hold (static)', workSeconds: 30, restSeconds: 30, cue: 'knees one inch off floor, flat back, breathe' },
        ],
      },
      {
        label: 'Phase 2 — 50/10',
        numberOfTimes: 1,
        exercises: [
          { name: 'Plank Shoulder Tap', workSeconds: 50, restSeconds: 10, cue: 'hips square, slow deliberate taps' },
          { name: 'Left Side Plank Hold', workSeconds: 50, restSeconds: 10, cue: 'hips stacked, drive top hip to ceiling' },
          { name: 'Right Side Plank Hold', workSeconds: 50, restSeconds: 10, cue: 'hips stacked, drive top hip to ceiling' },
          { name: 'Bear Hold (static)', workSeconds: 50, restSeconds: 10, cue: 'knees one inch off floor, flat back, breathe' },
        ],
      },
      {
        label: 'Finisher',
        numberOfTimes: 1,
        exercises: [
          { name: 'Hollow Body Hold', workSeconds: 45, restSeconds: 0, cue: 'long body, rib cage down, press lower back into mat' },
        ],
      },
    ],
    notes: 'Two-phase structure across the same four exercises — 30/20 then 50/10. Finishes with a 45s hollow hold to close with an anti-extension contrast.',
    progressions: [
      'Harder variation: phase 2 side plank → side plank with reach-through.',
      'Add phase 3: repeat exercises at 60s work / no rest for maximum density.',
      'Add load: phase 2 side plank → hold dumbbell stacked on hip.',
    ],
  },
  {
    id: 'fatigue-ladder',
    name: 'Fatigue Ladder',
    category: 'mat',
    difficulty: 4,
    equipment: 'mat',
    equipmentOptional: 'kettlebell or dumbbell',
    routine: [
      {
        label: 'Hollow Hold',
        numberOfTimes: 1,
        exercises: [
          { name: 'Hollow Body Hold', workSeconds: 150, restSeconds: 15, cue: 'long body, rib cage down, sustain tension' },
        ],
      },
      {
        label: 'Leg Lower',
        numberOfTimes: 1,
        exercises: [
          { name: 'Leg Lower (slow 4-count)', workSeconds: 120, restSeconds: 15, cue: '4-count descent, lower back pinned throughout' },
        ],
      },
      {
        label: 'Plank',
        numberOfTimes: 1,
        exercises: [
          { name: 'Plank Shoulder Tap', workSeconds: 90, restSeconds: 15, cue: 'hips square, feet wide if needed' },
        ],
      },
      {
        label: 'Side Planks',
        numberOfTimes: 1,
        exercises: [
          { name: 'Left Side Plank Hold', workSeconds: 30, restSeconds: 0, cue: 'hips stacked, drive top hip to ceiling' },
          { name: 'Right Side Plank Hold', workSeconds: 30, restSeconds: 15, cue: 'hips stacked, drive top hip to ceiling' },
        ],
      },
      {
        label: 'Dead Bug',
        numberOfTimes: 1,
        exercises: [
          { name: 'Dead Bug (arms overhead)', workSeconds: 30, restSeconds: 15, cue: 'arms fully extended overhead, ribs stay down' },
        ],
      },
      {
        label: 'Finisher',
        numberOfTimes: 1,
        exercises: [
          { name: 'Hollow Body Hold', workSeconds: 20, restSeconds: 0, cue: 'long body, everything tight, finish strong' },
        ],
      },
    ],
    notes: 'Descending ladder — 5 blocks (150s), 4 blocks (120s), 3 blocks (90s), 2 blocks split L/R side plank (30s each), 1 block dead bug (30s). Finishes with a 20s hollow hold.',
    progressions: [
      'Harder variation: hollow hold → hollow body rock; leg lower → straight-leg hover at the bottom.',
      'Ascending ladder: run the sequence in reverse (dead bug → side planks → plank → leg lower → hollow) for a different intensity arc.',
      'Add load: light kettlebell chest-loaded on all supine exercises.',
    ],
  },
  {
    id: 'push-pull-hold',
    name: 'Push Pull Hold',
    category: 'mat',
    difficulty: 3,
    equipment: 'mat',
    equipmentOptional: 'kettlebell or dumbbell',
    routine: [
      {
        numberOfTimes: 3,
        exercises: [
          { name: 'Dead Bug (alternating arm and leg)', workSeconds: 30, restSeconds: 0, cue: 'lower back pinned, move only as far as you can control' },
          { name: 'Hollow Body Hold', workSeconds: 30, restSeconds: 15, cue: 'long body, rib cage down, press lower back into mat' },
          { name: 'Reverse Crunch', workSeconds: 30, restSeconds: 0, cue: 'curl hips up, not momentum — control the lower' },
          { name: 'Tuck Hold (feet off floor, knees to chest)', workSeconds: 30, restSeconds: 15, cue: 'lower back flat, hold the compression' },
          { name: 'Plank Shoulder Tap', workSeconds: 30, restSeconds: 0, cue: 'hips still, feet wide if needed, slow taps' },
          { name: 'Forearm Plank Hold', workSeconds: 30, restSeconds: 10, cue: 'full tension, posterior pelvic tilt, breathe steady' },
        ],
      },
    ],
    notes: 'Contrast structure — each pair is a dynamic movement followed immediately by an isometric hold of the same pattern, with 10s rest after the hold. Three rounds.',
    progressions: [
      'Harder variation: hollow hold → hollow body rock; tuck hold → straight-leg hold.',
      'Remove inter-pair rest: eliminate the 10s rest so each pair flows directly into the next.',
      'Add load: light kettlebell held at chest during hollow hold and tuck hold.',
    ],
  },
  {
    id: 'ladder-side-plank-anchor',
    name: 'Ladder Side Plank Anchor',
    category: 'mat',
    difficulty: 5,
    equipment: 'mat',
    equipmentOptional: 'dumbbell',
    routine: [
      {
        label: 'Round 1',
        numberOfTimes: 1,
        exercises: [
          { name: 'Dead Bug', workSeconds: 45, restSeconds: 15, cue: 'lower back pinned' },
          { name: 'Hollow Body Rock', workSeconds: 45, restSeconds: 15, cue: 'stay compressed' },
          { name: 'Left Side Plank Hold', workSeconds: 20, restSeconds: 0, cue: 'hips stacked steady' },
          { name: 'Right Side Plank Hold', workSeconds: 20, restSeconds: 15, cue: 'hips stacked steady' },
          { name: 'Plank Shoulder Taps', workSeconds: 45, restSeconds: 15, cue: 'minimal hip sway' },
        ],
      },
      {
        label: 'Round 2',
        numberOfTimes: 1,
        exercises: [
          { name: 'Hollow Body Rock', workSeconds: 45, restSeconds: 15, cue: 'stay compressed' },
          { name: 'Left Side Plank Hold', workSeconds: 45, restSeconds: 15, cue: 'hips stacked steady' },
          { name: 'Plank Shoulder Taps', workSeconds: 45, restSeconds: 15, cue: 'minimal hip sway' },
        ],
      },
      {
        label: 'Round 3',
        numberOfTimes: 1,
        exercises: [
          { name: 'Right Side Plank Hold', workSeconds: 45, restSeconds: 15, cue: 'hips stacked steady' },
          { name: 'Plank Shoulder Taps', workSeconds: 45, restSeconds: 15, cue: 'minimal hip sway' },
        ],
      },
      {
        label: 'Round 4',
        numberOfTimes: 1,
        exercises: [
          { name: 'Forearm Plank Hold', workSeconds: 45, restSeconds: 0, cue: 'full tension, RKC grip, squeeze everything' },
        ],
      },
    ],
    notes: 'Descending ladder format (4→3→2→1). 15s rest at the end of each round. Side planks split left/right across rounds.',
    progressions: [
      'Increase work interval from 45s to 50s across all exercises.',
      'Remove 15s rest between ladder rounds entirely.',
      'Add load: hold a light dumbbell during side plank or taps.',
    ],
  },
  {
    id: 'ab-wheel-ladder',
    name: 'Ab Wheel 2-Block Ladder',
    category: 'equipment',
    difficulty: 5,
    equipment: 'ab wheel, mat',
    equipmentOptional: 'dumbbell',
    routine: [
      {
        label: 'Block A — Ab Wheel Ladder',
        numberOfTimes: 3,
        exercises: [
          { name: 'Ab Wheel Rollout', workSeconds: 45, restSeconds: 15, cue: 'brace hard, extend only as far as you can control' },
          { name: 'Ab Wheel Rollout', workSeconds: 30, restSeconds: 15, cue: 'brace hard, extend only as far as you can control' },
          { name: 'Ab Wheel Rollout', workSeconds: 20, restSeconds: 15, cue: 'brace hard, extend only as far as you can control' },
        ],
      },
      {
        label: 'Block B — Holds',
        numberOfTimes: 2,
        exercises: [
          { name: 'Hollow Body Hold', workSeconds: 30, restSeconds: 0, cue: 'long body, rib cage down, press lower back into mat' },
          { name: 'Right Side Plank Hold', workSeconds: 20, restSeconds: 0, cue: 'hips stacked, drive top hip to ceiling' },
          { name: 'Left Side Plank Hold', workSeconds: 20, restSeconds: 15, cue: 'hips stacked, drive top hip to ceiling' },
        ],
      },
    ],
    notes: 'No ab wheel? Substitute Plank Walk-Out Hold — start standing, hinge at hips, place hands on the floor, and walk them out until fully extended. Hold.',
    progressions: [
      'Harder variation: walk to maximum reach and hold the entire interval without returning.',
      'Increase load: increase Block A intervals by 10s each.',
      'Add load: hold dumbbell overhead during hollow body hold in Block B.',
    ],
  },
  {
    id: 'decline-sit-up',
    name: 'Decline Sit Up',
    category: 'equipment',
    difficulty: 3,
    equipment: 'decline bench, mat',
    equipmentOptional: 'dumbbell or weight plate',
    routine: [
      {
        numberOfTimes: 3,
        exercises: [
          { name: 'Decline Sit-Up', workSeconds: 35, restSeconds: 0, cue: 'controlled descent, don\'t yank with the neck' },
          { name: 'Decline Oblique Crunch (right)', workSeconds: 35, restSeconds: 0, cue: 'rotate toward opposite knee, slow and deliberate' },
          { name: 'Decline Oblique Crunch (left)', workSeconds: 35, restSeconds: 0, cue: 'rotate toward opposite knee, slow and deliberate' },
          { name: 'Russian Twist', workSeconds: 35, restSeconds: 0, cue: 'rotate from the torso, feet stay still' },
          { name: 'Decline Hollow Body Hold', workSeconds: 35, restSeconds: 25, cue: 'arms long, rib cage down, sustain tension' },
        ],
      },
    ],
    notes: 'Flexion and rotation focused. All exercises performed on the decline bench except Russian twist.',
    progressions: [
      'Add load: hold weight plate to chest during sit-ups and hollow body hold.',
      'Add load: hold dumbbell or plate during Russian twist.',
      'Reduce rest: cut to 10s between rounds.',
    ],
  },
  {
    id: 'ab-wheel-5-rounds',
    name: 'Ab Wheel 5-Rounds',
    category: 'equipment',
    difficulty: 4,
    equipment: 'ab wheel, mat',
    equipmentOptional: 'dumbbell',
    routine: [
      {
        numberOfTimes: 5,
        exercises: [
          { name: 'Ab Wheel Rollout', workSeconds: 45, restSeconds: 15, cue: 'brace hard, extend only as far as you can control' },
          { name: 'Dead Bug (alternating arm and leg)', workSeconds: 30, restSeconds: 30, cue: 'lower back pinned, use dead bug as active recovery' },
        ],
      },
    ],
    notes: 'Alternating pair — ab wheel is the primary work, dead bug serves as active recovery.',
    progressions: [
      'Harder variation: pause 2 seconds at full extension on each rollout.',
      'Harder variation: progress to standing ab wheel rollout.',
      'Add load: hold dumbbell in one hand during dead bug.',
    ],
  },
  {
    id: 'l-sit-progression',
    name: 'L-Sit Progression',
    category: 'skill',
    difficulty: 3,
    equipment: 'parallettes or dip bars',
    equipmentOptional: null,
    routine: [
      {
        label: 'Block A — L-Sit Holds',
        numberOfTimes: 5,
        exercises: [
          { name: 'L-Sit Hold', workSeconds: 30, restSeconds: 30, cue: 'use your best current variation — tuck, single-leg, or full' },
        ],
      },
      {
        label: 'Block B — Accessory',
        numberOfTimes: 2,
        exercises: [
          { name: 'Seated Leg Raise Hold', workSeconds: 30, restSeconds: 0, cue: 'legs straight, heels 1-2 inches off floor, press hands into ground' },
          { name: 'Hollow Body Hold', workSeconds: 30, restSeconds: 30, cue: 'long body, rib cage down, press lower back into mat' },
        ],
      },
    ],
    notes: 'Goal for Block A is to accumulate 60–90s total across the 5 rounds.',
    progressions: [
      'Work toward holding the full 30s unbroken each round. Add a 6th round once all 5 rounds feel controlled.',
      'Harder variation: progress from tuck L-sit → single-leg extended → full L-sit.',
      'Add volume: increase Block A hold to 40s once 30s feels consistent.',
    ],
  },
  {
    id: 'handstand-progression',
    name: 'Handstand Progression',
    category: 'handstand',
    difficulty: 3,
    equipment: 'wall, mat',
    equipmentOptional: null,
    routine: [
      {
        label: 'Wrist Warm-Up',
        numberOfTimes: 1,
        exercises: [
          { name: 'Wrist Rocks (forward, back, side)', workSeconds: 30, restSeconds: 0, cue: 'slow and controlled, full range each direction' },
          { name: 'Wrist Circles', workSeconds: 30, restSeconds: 0, cue: 'both directions, don\'t rush' },
        ],
      },
      {
        label: 'Back-to-Wall Holds',
        numberOfTimes: 4,
        exercises: [
          { name: 'Back-to-Wall Handstand Hold', workSeconds: 30, restSeconds: 30, cue: 'ribs down, glutes squeezed, heels rest lightly on wall' },
        ],
      },
      {
        label: 'Shoulder Taps',
        numberOfTimes: 3,
        exercises: [
          { name: 'Wall Handstand Shoulder Tap', workSeconds: 20, restSeconds: 40, cue: 'lift one hand slowly, tap shoulder, return — no hip shift' },
        ],
      },
      {
        label: 'Freestanding',
        numberOfTimes: 3,
        exercises: [
          { name: 'Freestanding Handstand Kick-Up', workSeconds: 30, restSeconds: 30, cue: 'kick up and hold as long as possible, don\'t chase the wall' },
        ],
      },
    ],
    notes: 'Back-to-wall means kicking up with your back facing the wall. For the last block, let yourself fall and reset between attempts rather than grinding a bad hold.',
    progressions: [
      'Extend holds: increase Back-to-Wall holds to 40s.',
      'Increase intensity: raise shoulder tap tempo in Shoulder Taps block.',
      'Add volume: add a 4th round to Freestanding as comfort with kick-ups builds.',
    ],
  },
  {
    id: 'jess-sims-2023',
    name: 'Jess Sims Hollow Hold 2023',
    category: 'mat',
    difficulty: 5,
    equipment: 'mat',
    routine: [
      {
        numberOfTimes: 2,
        exercises: [
          { name: 'Hollow Body Hold', workSeconds: 30, restSeconds: 0, cue: 'Low back glued to the mat, arms/legs extended.' },
          { name: 'Oblique Heel Taps', workSeconds: 30, restSeconds: 0, cue: '' },
          { name: 'Hollow Body Hold', workSeconds: 30, restSeconds: 0, cue: 'Keep that "banana" shape!' },
          { name: 'Dead Bug', workSeconds: 30, restSeconds: 0, cue: '' },
          { name: 'Hollow Body Hold', workSeconds: 30, restSeconds: 0, cue: 'Keep that "banana" shape!' },
          { name: 'Bicycle Crunches', workSeconds: 30, restSeconds: 0, cue: 'Elbow to opposite knee, slow and controlled.' },
          { name: 'Hollow Body Hold', workSeconds: 30, restSeconds: 0, cue: 'Keep that "banana" shape!' },
          { name: 'Scissor Kicks', workSeconds: 30, restSeconds: 0, cue: 'Legs straight, alternating up and down.' },
          { name: 'Hollow Body Hold', workSeconds: 30, restSeconds: 0, cue: 'Keep that "banana" shape!' },
          { name: 'Plank Shoulder Tap', workSeconds: 30, restSeconds: 0, cue: '' },
        ],
      },
    ],
    notes: '',
    progressions: [
      '2023: (1) Beggin, Maneskin (2) Physical, Dua Lipa (3) Wanksta, 50 Cent (4) Calm Down, Rema',
      '2022: (1) LA FAMA, Rosalia (2) In Da Getto, J Balvin & Skrillex (3) Tití Me Preguntó, Bad Bunny (4) Chicken Teriyaki, Rosalia',
    ],
  }
]
