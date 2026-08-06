import fs from 'node:fs'

const file = '.tmp/batches/batch1-24h.jsonl'
const lines = fs.readFileSync(file, 'utf8').trim().split('\n')

const byId = new Map()
for (const line of lines) {
  const ev = JSON.parse(line)
  byId.set(ev.id, ev)
}

const wanted = {
  '80ef93187beb': null,
  'eaba9969b25c': null,
}

const found = {}
for (const [id, ev] of byId) {
  for (const prefix of Object.keys(wanted)) {
    if (id.startsWith(prefix)) {
      found[prefix] = ev
    }
  }
}

for (const [prefix, ev] of Object.entries(found)) {
  console.log('PREFIX', prefix)
  console.log('ID    ', ev.id)
  console.log('PKEY  ', ev.pubkey)
  console.log('TIME  ', ev.created_at, new Date(ev.created_at * 1000).toISOString())
  console.log('CONTENT')
  console.log(ev.content)
  console.log('========================================')
}
