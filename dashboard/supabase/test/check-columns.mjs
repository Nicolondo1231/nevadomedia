#!/usr/bin/env node
/**
 * Cross-checks the columns the frontend reads and writes against the real
 * schema. Without a live Supabase to run against, a mistyped column name would
 * otherwise only surface as a runtime error after deployment.
 *
 * Reads the TypeScript row interfaces (which mirror what each useRows call
 * selects and patches) and compares their fields to information_schema.
 *
 *   node supabase/test/check-columns.mjs            # needs the test cluster up
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const PORT = process.env.PORT ?? '55432'
const files = []
for (const dir of ['src/pages', 'src/lib', 'src/components', 'src/app']) {
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.tsx') || f.endsWith('.ts')) files.push(join(dir, f))
  }
}

// interface Foo extends Row { a: string; b: number | null }
const ifaceRe = /interface\s+(\w+)\s+extends\s+Row\s*\{([^}]*)\}/g
// useRows<Foo>('table', ...)
const useRe = /useRows<(\w+)>\(\s*['"]([\w_]+)['"]/g
// isAdmin ? 'clients' : 'clients_ops' — both branches are real tables
const ternaryRe = /useRows<(\w+)>\(\s*\w+\s*\?\s*['"]([\w_]+)['"]\s*:\s*['"]([\w_]+)['"]/g

const interfaces = new Map()
const usages = []

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(ifaceRe)) {
    const fields = [...m[2].matchAll(/^\s*(\w+)\s*[?]?\s*:/gm)].map((f) => f[1])
    interfaces.set(m[1], fields)
  }
  for (const m of src.matchAll(ternaryRe)) {
    usages.push({ file, iface: m[1], table: m[2] })
    usages.push({ file, iface: m[1], table: m[3] })
  }
  for (const m of src.matchAll(useRe)) {
    if (!usages.some((u) => u.iface === m[1] && u.table === m[2])) {
      usages.push({ file, iface: m[1], table: m[2] })
    }
  }
}

function columnsOf(table) {
  const out = execFileSync('psql', [
    '-h', '/tmp', '-p', PORT, '-U', 'postgres', '-tAc',
    `select column_name from information_schema.columns
       where table_schema='public' and table_name='${table}'`,
  ], { encoding: 'utf8' })
  return new Set(out.trim().split('\n').filter(Boolean))
}

let failed = 0
const seen = new Set()
for (const { file, iface, table } of usages) {
  const key = `${iface}@${table}`
  if (seen.has(key)) continue
  seen.add(key)

  const cols = columnsOf(table)
  if (cols.size === 0) {
    console.log(`  FAIL ${table.padEnd(26)} table does not exist (${file})`)
    failed = 1
    continue
  }
  const fields = interfaces.get(iface) ?? []
  // `id` comes from the Row base type.
  const missing = fields.filter((f) => f !== 'id' && !cols.has(f))
  if (missing.length) {
    console.log(`  FAIL ${table.padEnd(26)} ${iface} references missing column(s): ${missing.join(', ')}  (${file})`)
    failed = 1
  } else {
    console.log(`  ok   ${table.padEnd(26)} ${iface} (${fields.length} fields)`)
  }
}

console.log(failed ? '\nCOLUMN CHECK FAILED' : '\nALL COLUMNS EXIST')
process.exit(failed)
