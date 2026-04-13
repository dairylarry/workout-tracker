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
 *   2. Program config: per-exercise sets, repRange, rir, subs
 *
 * It does NOT auto-update the seeds — update them manually based on the report.
 * (Seeds use ES module enum refs like MG.QUADS which can't be auto-generated cleanly.)
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

// --- Seed data (inline, no ES module import needed) ---
// Keep this in sync manually when seeds change structure.
// Run the script to find content diffs — not structural ones.

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

function subsStr(subs) {
  if (!subs) return '[]'
  return '[' + subs.map(s => typeof s === 'object' ? `${s.name}(obj)` : s).join(', ') + ']'
}

async function checkExerciseLibrary() {
  console.log('\n═══════════════════════════════════════')
  console.log('EXERCISE LIBRARY DIFF (DynamoDB vs Seed)')
  console.log('═══════════════════════════════════════')

  // Read seed file as text and extract exercise names + basic fields
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

  // Check field diffs for matching exercises
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

  const seedText = readFileSync(resolve(__dirname, '../frontend/src/seeds/programConfigSeed.js'), 'utf8')
  const dbItems = await queryAll(PROGRAM_PK, 'SESSION_TYPE#')

  let anyDiff = false

  for (const item of dbItems) {
    const stId = item.SK.replace('SESSION_TYPE#', '')
    const dbExercises = item.exercises || []

    // Extract seed exercises for this session type from text
    // (crude but avoids ES module import complexity)
    const sessionMatch = seedText.match(new RegExp(`'${stId}':\\s*\\{[\\s\\S]*?(?='[a-z]+-[a-b]':|\\}\\s*\\}\\s*$)`))

    for (const dbEx of dbExercises) {
      const dbSubs = (dbEx.subs || []).map(s => typeof s === 'object' ? s.name : s)
      const seedSubsMatch = seedText.match(new RegExp(`name:\\s*'${dbEx.name}'[^}]*subs:\\s*\\[([^\\]]+)\\]`))
      if (!seedSubsMatch) continue

      const seedSubNames = [...seedSubsMatch[1].matchAll(/'([^']+)'/g)]
        .map(m => m[1])
        .filter(n => !['name','repRange','sets','rir','perSide','rest'].includes(n))

      const extraInDB = dbSubs.filter(s => !seedSubNames.includes(s))
      const extraInSeed = seedSubNames.filter(s => !dbSubs.includes(s))

      if (extraInDB.length || extraInSeed.length) {
        anyDiff = true
        console.log(`\n  ${stId} / ${dbEx.name}:`)
        if (extraInDB.length)
          console.log(`    🔴 In DB not in seed (add to seed): ${extraInDB.join(', ')}`)
        if (extraInSeed.length)
          console.log(`    🟡 In seed not in DB (remove from seed or re-add to DB): ${extraInSeed.join(', ')}`)
      }

      // Check sets/range/rir
      const setsMatch = seedText.match(new RegExp(`name:\\s*'${dbEx.name}'[^}]*sets:\\s*(\\d+)`))
      const rrMatch = seedText.match(new RegExp(`name:\\s*'${dbEx.name}'[^}]*repRange:\\s*\\[(\\d+),\\s*(\\d+)\\]`))
      const rirMatch = seedText.match(new RegExp(`name:\\s*'${dbEx.name}'[^}]*rir:\\s*(\\d+)`))

      const seedSets = setsMatch ? parseInt(setsMatch[1]) : null
      const seedRR = rrMatch ? [parseInt(rrMatch[1]), parseInt(rrMatch[2])] : null
      const seedRir = rirMatch ? parseInt(rirMatch[1]) : null

      const diffs = []
      if (dbEx.sets != null && seedSets != null && Number(dbEx.sets) !== seedSets)
        diffs.push(`sets: DB=${dbEx.sets} seed=${seedSets}`)
      if (dbEx.repRange && seedRR && JSON.stringify(dbEx.repRange.map(Number)) !== JSON.stringify(seedRR))
        diffs.push(`repRange: DB=${rrStr(dbEx.repRange.map(Number))} seed=${rrStr(seedRR)}`)
      if (dbEx.rir != null && seedRir != null && Number(dbEx.rir) !== seedRir)
        diffs.push(`rir: DB=${dbEx.rir} seed=${seedRir}`)

      if (diffs.length) {
        anyDiff = true
        console.log(`\n  ${stId} / ${dbEx.name}:`)
        diffs.forEach(d => console.log(`    🟠 ${d}`))
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
