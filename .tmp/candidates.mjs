import fs from 'node:fs'

const file = '.tmp/batches/batch1-24h.jsonl'
const lines = fs.readFileSync(file, 'utf8').trim().split('\n')

const patterns = {
  'nostr-hotter-site': /nostr-hotter-site/,
  'nostr-cache': /nostr-cache/,
  'flappy-nostrich': /flappy-nostrich/,
  'wavefunc': /wavefunc/,
}

const hits = {}
for (const line of lines) {
  const ev = JSON.parse(line)
  const content = ev.content ?? ''
  for (const [name, re] of Object.entries(patterns)) {
    if (re.test(content)) {
      if (!hits[name]) hits[name] = []
      hits[name].push(ev)
    }
  }
}

for (const [name, events] of Object.entries(hits)) {
  console.log(`===== ${name}: ${events.length} events =====`)
  const pubkeys = new Map()
  for (const ev of events) {
    const pk = pubkeys.get(ev.pubkey) ?? { n: 0, ids: [] }
    pk.n++
    pk.ids.push(ev.id)
    pubkeys.set(ev.pubkey, pk)
  }
  for (const [pk, info] of pubkeys.entries()) {
    console.log(`pubkey ${pk.slice(0, 12)}... x${info.n}`)
  }
  const sample = events[0]
  console.log('sample id:', sample.id)
  console.log('sample created_at:', new Date(sample.created_at * 1000).toISOString())
  console.log('sample content:', sample.content.slice(0, 300).replace(/\n/g, '\\n'))
  console.log()
}
