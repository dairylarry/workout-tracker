import { createContext, useContext, useState, useEffect } from 'react'
import { getAllSessionTypes, putSessionType, getExerciseLibrary, putExercise, getCoreRoutines, putCoreRoutine } from '../lib/dynamodb'
import { PROGRAM } from '../seeds/programConfigSeed'
import { EXERCISE_SEED } from '../seeds/exerciseLibrarySeed'
import { CORE_WORKOUT_SEED } from '../seeds/coreWorkoutLibrarySeed'

const ProgramContext = createContext(null)

export function ProgramProvider({ children }) {
  const [program, setProgram] = useState(null)
  const [exerciseLibrary, setExerciseLibrary] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const items = await getAllSessionTypes()
        if (items.length > 0) {
          // Build program from DynamoDB
          const sessionTypes = {}
          for (const item of items) {
            const id = item.SK.replace('SESSION_TYPE#', '')
            const { PK, SK, ...data } = item
            sessionTypes[id] = data
          }

          // Seed any session types present in the seed but missing from DynamoDB
          const existingIds = new Set(Object.keys(sessionTypes))
          const missingIds = Object.keys(PROGRAM.sessionTypes).filter(id => !existingIds.has(id))
          if (missingIds.length > 0) {
            console.log('Seeding missing session types:', missingIds)
            for (const id of missingIds) {
              await putSessionType(id, PROGRAM.sessionTypes[id])
              sessionTypes[id] = PROGRAM.sessionTypes[id]
            }
          }

          setProgram({ name: 'Spring 2026', sessionTypes })
        } else {
          // First load — seed from programConfig.js
          console.log('No program config in DynamoDB — seeding from programConfig.js')
          await seedFromConfig()
          setProgram(PROGRAM)
        }

        // Load exercise library (seed if empty)
        let lib = await getExerciseLibrary()
        if (lib.length === 0) {
          console.log('No exercise library in DynamoDB — seeding')
          await seedExerciseLibrary()
          lib = await getExerciseLibrary()
        }
        setExerciseLibrary(lib)

        // Load core routines (seed if empty)
        const coreRoutines = await getCoreRoutines()
        if (coreRoutines.length === 0) {
          console.log('No core routines in DynamoDB — seeding')
          await seedCoreRoutines()
        }
      } catch (e) {
        console.error('Failed to load program config:', e)
        // Fallback to hardcoded config
        setProgram(PROGRAM)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function updateProgram(sessionTypeId, updatedSessionType) {
    setProgram(prev => ({
      ...prev,
      sessionTypes: {
        ...prev.sessionTypes,
        [sessionTypeId]: updatedSessionType,
      },
    }))
  }

  function refreshExerciseLibrary(lib) {
    setExerciseLibrary(lib)
  }

  return (
    <ProgramContext.Provider value={{ program, exerciseLibrary, loading, updateProgram, refreshExerciseLibrary }}>
      {children}
    </ProgramContext.Provider>
  )
}

export function useProgram() {
  const ctx = useContext(ProgramContext)
  if (!ctx) throw new Error('useProgram must be used within ProgramProvider')
  return ctx
}

/**
 * Seed DynamoDB from programConfig.js.
 * Call this on first load or when programConfig.js is updated.
 */
export async function seedFromConfig() {
  for (const [id, sessionType] of Object.entries(PROGRAM.sessionTypes)) {
    await putSessionType(id, sessionType)
  }
  console.log('Program config seeded to DynamoDB')
}

/**
 * Seed exercise library from exerciseLibrarySeed.js.
 */
export async function seedExerciseLibrary() {
  for (const exercise of EXERCISE_SEED) {
    await putExercise({ ...exercise, createdAt: new Date().toISOString().split('T')[0] })
  }
  console.log(`Exercise library seeded: ${EXERCISE_SEED.length} exercises`)
}

/**
 * Seed core workout routines from coreWorkoutLibrarySeed.js.
 */
export async function seedCoreRoutines() {
  for (const routine of CORE_WORKOUT_SEED) {
    await putCoreRoutine(routine)
  }
  console.log(`Core routines seeded: ${CORE_WORKOUT_SEED.length} routines`)
}
