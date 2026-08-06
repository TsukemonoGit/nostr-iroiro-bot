import fs from 'node:fs'

const [src, out] = process.argv.slice(2)
const lines = fs.readFileSync(src, 'utf8').trim().split('\n')
const events = lines.map((l) => JSON.parse(l))
events.sort((a, b) => b.created_at - a.created_at)

const fmt = (ts) => {
  const d = new Date(ts * 1000)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}

const outLines = events.map((e, i) => {
  const header = `[${i}] ${fmt(e.created_at)} ${e.pubkey.slice(0, 12)} ${e.id.slice(0, 12)}`
  const content = e.content.replace(/\n/g, '\\n')
  return `${header}\n${content}\n---`
})

fs.writeFileSync(out, outLines.join('\n') + '\n')
console.error(`${events.length} entries written to ${out}`)
