import { createContext, useContext, useState, useEffect } from 'react'
import { getAllSessionTypes, putSessionType, getExerciseLibrary, putExercise } from './dynamodb'
import { PROGRAM } from './programConfig'
import { EXERCISE_SEED } from './exerciseLibrarySeed'

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
