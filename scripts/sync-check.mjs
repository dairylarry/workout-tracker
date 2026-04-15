/**
 * sync-check.mjs
 *
 * Compares live DynamoDB state against the local seed files and reports differences.
 * Run whenever you want to check if seeds are out of sync with the live DB.
 *
 * Usage:
 *   node scripts/sync-check.mjs
 *
 * Requires AWS credentials in frontend/.env.local:
 *   AWS_ACCESS_KEY_ID=...
 *   AWS_SECRET_ACCESS_KEY=...
 *   AWS_REGION=...  (or AWS_DEFAULT_REGION)
 *
 * What it checks:
 *   1. Exercise library: names, family, defaultRepRange, defaultSets
 *   2. Program config: per-exercise sets, repRange, rir, subs (per session type)
 *
 * It does NOT auto-update the seeds — update them manually based on the report.
 * (exerciseLibrarySeed.js uses enum refs like MG.QUADS which can't be auto-generated cleanly.
 *  programConfigSeed.js is plain JS and is imported directly for accurate comparison.)
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Load env ---
const envPath = resolve(__dirname, '../frontend/.env.local')
const env = readFileSync(envPath, 'utf8')
  .split('\n')
  .filter(l => l.includes('='))
  .reduce((acc, l) => {
    const [k, ...v] = l.split('=')
    acc[k.trim()] = v.join('=').trim()
    return acc
  }, {})

const client = new DynamoDBClient({
  region: env.AWS_REGION || env.VITE_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || env.VITE_AWS_SECRET_ACCESS_KEY,
  },
})
const db = DynamoDBDocumentClient.from(client)
const TABLE = 'workout-tracker-db'
const PROGRAM_PK = 'PROGRAM#spring2026'

// Import program config directly — no enum deps, plain JS objects.
const { PROGRAM } = await import(resolve(__dirname, '../frontend/src/seeds/programConfigSeed.js'))

async function queryAll(pk, skPrefix) {
  const params = {
    TableName: TABLE,
    KeyConditionExpression: skPrefix
      ? 'PK = :pk AND begins_with(SK, :prefix)'
      : 'PK = :pk',
    ExpressionAttributeValues: skPrefix
      ? { ':pk': pk, ':prefix': skPrefix }
      : { ':pk': pk },
  }
  const res = await db.send(new QueryCommand(params))
  return res.Items || []
}

function rrStr(arr) {
  return arr ? `[${arr.join(',')}]` : 'null'
}

async function checkExerciseLibrary() {
  console.log('\n═══════════════════════════════════════')
  console.log('EXERCISE LIBRARY DIFF (DynamoDB vs Seed)')
  console.log('═══════════════════════════════════════')

  // exerciseLibrarySeed uses MG/FAM enums — parse as text for name/field extraction.
  const seedText = readFileSync(resolve(__dirname, '../frontend/src/seeds/exerciseLibrarySeed.js'), 'utf8')
  const seedNames = new Set([...seedText.matchAll(/name:\s*'([^']+)'/g)].map(m => m[1]))

  const dbItems = await queryAll('EXERCISE_LIB')
  const dbNames = new Set(dbItems.map(i => i.name))

  const onlyInDB = [...dbNames].filter(n => !seedNames.has(n)).sort()
  const onlyInSeed = [...seedNames].filter(n => !dbNames.has(n)).sort()

  if (onlyInDB.length) {
    console.log('\n🔴 In DynamoDB but NOT in seed (need to add to seed):')
    onlyInDB.forEach(n => {
      const item = dbItems.find(i => i.name === n)
      console.log(`  + ${n}: family=${item.family}, range=${rrStr(item.defaultRepRange)}, sets=${item.defaultSets}`)
    })
  }

  if (onlyInSeed.length) {
    console.log('\n🟡 In seed but NOT in DynamoDB (need to seed or delete from seed):')
    onlyInSeed.forEach(n => console.log(`  - ${n}`))
  }

  // Parse defaultRepRange + defaultSets from seed text per exercise
  const seedExercises = {}
  const exerciseBlocks = [...seedText.matchAll(/\{[^}]+name:\s*'([^']+)'[^}]+\}/g)]
  for (const block of exerciseBlocks) {
    const name = block[1]
    const text = block[0]
    const rrMatch = text.match(/defaultRepRange:\s*\[(\d+),\s*(\d+)\]/)
    const setsMatch = text.match(/defaultSets:\s*(\d+)/)
    const familyMatch = text.match(/family:\s*FAM\.(\w+)/)
    seedExercises[name] = {
      defaultRepRange: rrMatch ? [parseInt(rrMatch[1]), parseInt(rrMatch[2])] : null,
      defaultSets: setsMatch ? parseInt(setsMatch[1]) : null,
      family: familyMatch ? familyMatch[1].toLowerCase().replace(/_/g, '-') : null,
    }
  }

  const fieldDiffs = []
  for (const item of dbItems) {
    const seed = seedExercises[item.name]
    if (!seed) continue
    const dbRR = item.defaultRepRange?.map(Number)
    const dbSets = item.defaultSets ? Number(item.defaultSets) : null
    const rrMatch = dbRR && seed.defaultRepRange
      ? dbRR[0] === seed.defaultRepRange[0] && dbRR[1] === seed.defaultRepRange[1]
      : (!dbRR && !seed.defaultRepRange)
    const setsMatch = dbSets === seed.defaultSets
    if (!rrMatch || !setsMatch) {
      fieldDiffs.push({
        name: item.name,
        db: { range: dbRR, sets: dbSets },
        seed: { range: seed.defaultRepRange, sets: seed.defaultSets },
      })
    }
  }

  if (fieldDiffs.length) {
    console.log('\n🟠 Field differences (DB vs seed):')
    for (const d of fieldDiffs) {
      const parts = []
      if (JSON.stringify(d.db.range) !== JSON.stringify(d.seed.range))
        parts.push(`range: DB=${rrStr(d.db.range)} vs seed=${rrStr(d.seed.range)}`)
      if (d.db.sets !== d.seed.sets)
        parts.push(`sets: DB=${d.db.sets} vs seed=${d.seed.sets}`)
      console.log(`  ~ ${d.name}: ${parts.join(', ')}`)
    }
  }

  if (!onlyInDB.length && !onlyInSeed.length && !fieldDiffs.length) {
    console.log('\n✅ Exercise library is in sync')
  }
}

async function checkProgramConfig() {
  console.log('\n═══════════════════════════════════════')
  console.log('PROGRAM CONFIG DIFF (DynamoDB vs Seed)')
  console.log('═══════════════════════════════════════')

  const dbItems = await queryAll(PROGRAM_PK, 'SESSION_TYPE#')
  const dbByType = {}
  for (const item of dbItems) {
    const stId = item.SK.replace('SESSION_TYPE#', '')
    dbByType[stId] = item
  }

  const seedTypes = PROGRAM.sessionTypes
  let anyDiff = false

  // Check for session types only in DB or only in seed
  const dbTypeIds = new Set(Object.keys(dbByType))
  const seedTypeIds = new Set(Object.keys(seedTypes))

  const onlyInDB = [...dbTypeIds].filter(id => !seedTypeIds.has(id))
  const onlyInSeed = [...seedTypeIds].filter(id => !dbTypeIds.has(id))

  if (onlyInDB.length) {
    anyDiff = true
    console.log('\n🔴 In DynamoDB but NOT in seed:')
    onlyInDB.forEach(id => console.log(`  - ${id}`))
  }
  if (onlyInSeed.length) {
    anyDiff = true
    console.log('\n🟡 In seed but NOT in DynamoDB (will auto-seed on next app load):')
    onlyInSeed.forEach(id => console.log(`  - ${id}`))
  }

  // Compare each session type present in both
  for (const stId of [...seedTypeIds].filter(id => dbTypeIds.has(id))) {
    const dbExercises = dbByType[stId].exercises || []
    const seedExercises = seedTypes[stId].exercises || []

    // Index seed exercises by name for O(1) lookup
    const seedByName = {}
    for (const ex of seedExercises) seedByName[ex.name] = ex

    for (const dbEx of dbExercises) {
      if (dbEx.supplemental) continue
      const seedEx = seedByName[dbEx.name]
      if (!seedEx) {
        anyDiff = true
        console.log(`\n  ${stId} / ${dbEx.name}:`)
        console.log(`    🔴 In DB but not in seed`)
        continue
      }

      // Compare subs (extract names from both, handling object subs)
      const dbSubNames = (dbEx.subs || []).map(s => typeof s === 'object' ? s.name : s)
      const seedSubNames = (seedEx.subs || []).map(s => typeof s === 'object' ? s.name : s)
      const extraInDB = dbSubNames.filter(s => !seedSubNames.includes(s))
      const extraInSeed = seedSubNames.filter(s => !dbSubNames.includes(s))

      const diffs = []
      if (dbEx.sets != null && seedEx.sets != null && Number(dbEx.sets) !== Number(seedEx.sets))
        diffs.push(`sets: DB=${dbEx.sets} seed=${seedEx.sets}`)
      if (dbEx.repRange && seedEx.repRange &&
          JSON.stringify(dbEx.repRange.map(Number)) !== JSON.stringify(seedEx.repRange))
        diffs.push(`repRange: DB=${rrStr(dbEx.repRange.map(Number))} seed=${rrStr(seedEx.repRange)}`)
      if (dbEx.rir != null && seedEx.rir != null && Number(dbEx.rir) !== Number(seedEx.rir))
        diffs.push(`rir: DB=${dbEx.rir} seed=${seedEx.rir}`)

      if (extraInDB.length || extraInSeed.length || diffs.length) {
        anyDiff = true
        console.log(`\n  ${stId} / ${dbEx.name}:`)
        if (extraInDB.length)
          console.log(`    🔴 In DB not in seed (add to seed): ${extraInDB.join(', ')}`)
        if (extraInSeed.length)
          console.log(`    🟡 In seed not in DB (remove from seed or re-add to DB): ${extraInSeed.join(', ')}`)
        diffs.forEach(d => console.log(`    🟠 ${d}`))
      }
    }

    // Check for exercises in seed but not in DB
    const dbExNames = new Set(dbExercises.map(e => e.name))
    for (const seedEx of seedExercises) {
      if (!dbExNames.has(seedEx.name)) {
        anyDiff = true
        console.log(`\n  ${stId} / ${seedEx.name}:`)
        console.log(`    🟡 In seed but not in DB`)
      }
    }
  }

  if (!anyDiff) console.log('\n✅ Program config is in sync')
}

async function main() {
  console.log('Checking DynamoDB vs seed files...')
  await checkExerciseLibrary()
  await checkProgramConfig()
  console.log('\nDone. Update seed files manually to resolve any differences above.')
  console.log('Seeds use enum refs (MG.QUADS, FAM.SQUAT) — auto-rewrite not supported.\n')
}

main().catch(e => { console.error(e); process.exit(1) })
