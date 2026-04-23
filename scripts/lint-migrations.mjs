#!/usr/bin/env node
// Lint supabase/migrations/*.sql for common idempotency gaps.
// Fails CI if a new migration would break re-application.
//
// Rules:
//   R1: every CREATE POLICY must have a preceding DROP POLICY IF EXISTS (same file).
//   R2: every CREATE TRIGGER must have DROP TRIGGER IF EXISTS OR use CREATE OR REPLACE TRIGGER.
//   R3: every CREATE TYPE must be wrapped in a DO-EXCEPTION guard or preceded by DROP TYPE IF EXISTS.
//   R4: every ALTER TABLE ... ADD COLUMN must use ADD COLUMN IF NOT EXISTS.
//   R5: every CREATE INDEX must use IF NOT EXISTS.

import fs from 'fs'
import path from 'path'

const ROOT = path.join(process.cwd(), 'supabase', 'migrations')
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.sql')).sort()

const sinceArg = (process.argv.find(a => a.startsWith('--since=')) || '').split('=')[1]
const targets = sinceArg
  ? files.filter(f => f.localeCompare(sinceArg + '_') > 0)
  : files

let errors = 0
let warnings = 0

const REGEX_SPECIALS = new Set(['\\', '.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']'])
function reEscape(s) {
  // Escape regex special characters inside a string to be used in new RegExp.
  // Split/join instead of regex to keep this file shippable via template literals.
  return s.split('').map(c => REGEX_SPECIALS.has(c) ? '\\' + c : c).join('')
}

function report(file, severity, rule, line, msg) {
  const prefix = severity === 'error' ? 'ERROR' : 'WARN'
  console.log(prefix + '  ' + file + ':' + line + '  [' + rule + ']  ' + msg)
  if (severity === 'error') errors++; else warnings++
}

for (const f of targets) {
  const full = path.join(ROOT, f)
  const text = fs.readFileSync(full, 'utf8')
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1
    const raw = lines[i]
    const l = raw.trim().toLowerCase()
    if (l.startsWith('--')) continue

    const policyMatch = raw.match(/CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(\S+)/i)
    if (policyMatch) {
      const name = policyMatch[1]
      const table = policyMatch[2]
      const head = lines.slice(0, i).join('\n')
      const dropRe = new RegExp('DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"' + reEscape(name) + '"\\s+ON\\s+' + reEscape(table), 'i')
      if (!dropRe.test(head)) {
        report(f, 'error', 'R1', ln, 'CREATE POLICY "' + name + '" ON ' + table + ' without preceding DROP POLICY IF EXISTS')
      }
    }

    const triggerMatch = raw.match(/CREATE\s+(?!OR\s+REPLACE\s+)TRIGGER\s+(\S+)\s+(?:BEFORE|AFTER|INSTEAD\s+OF)\s+.*?\s+ON\s+(\S+)/i)
    if (triggerMatch) {
      const name = triggerMatch[1]
      const table = triggerMatch[2]
      const head = lines.slice(0, i).join('\n')
      const dropRe = new RegExp('DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+' + reEscape(name) + '\\s+ON\\s+' + reEscape(table), 'i')
      if (!dropRe.test(head)) {
        report(f, 'error', 'R2', ln, 'CREATE TRIGGER ' + name + ' ON ' + table + ' without preceding DROP TRIGGER IF EXISTS and without OR REPLACE')
      }
    }

    const typeMatch = raw.match(/CREATE\s+TYPE\s+(\S+)\s+AS\s+/i)
    if (typeMatch) {
      const head = lines.slice(0, i).join('\n').toLowerCase()
      const typeName = typeMatch[1].toLowerCase()
      const hasDoGuard = /do\s*\$\$[\s\S]*duplicate_object[\s\S]*end\s*\$\$/i.test(text) && text.toLowerCase().includes('create type ' + typeName)
      const hasDropIfExists = head.includes('drop type if exists ' + typeName)
      if (!hasDoGuard && !hasDropIfExists) {
        report(f, 'error', 'R3', ln, 'CREATE TYPE ' + typeMatch[1] + ' without DROP TYPE IF EXISTS or DO/EXCEPTION guard')
      }
    }

    if (/ALTER\s+TABLE\s+\S+\s+ADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS)/i.test(raw)) {
      report(f, 'error', 'R4', ln, 'ALTER TABLE ... ADD COLUMN without IF NOT EXISTS')
    }

    if (/CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS)\s*\S+\s+ON/i.test(raw) && !/CREATE\s+INDEX\s+CONCURRENTLY/i.test(raw)) {
      report(f, 'warn', 'R5', ln, 'CREATE INDEX without IF NOT EXISTS')
    }
  }
}

console.log('')
console.log('Linted ' + targets.length + ' file(s).  errors=' + errors + '  warnings=' + warnings)
if (errors > 0) process.exit(1)
