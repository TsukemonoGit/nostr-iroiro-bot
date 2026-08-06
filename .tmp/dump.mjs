import fs from 'node:fs'

const file = '.tmp/batches/batch1-24h.jsonl'
const lines = fs.readFileSync(file, 'utf8').trim().split('\n')

const wanted = new Set([
  '16583ee0e07d8917ae14858a3969ccbb298ca56c82853edcb54e1c7621188594',
  '1e08488354dd92f1ee9587b62d7af03fb9148f2f9135839d6b83c510c22fd362',
  '7c5ca8ba5b2e56827e41c36340af1af420df20fac5677432ecf33eb501d555ec',
  '67e0251c6a6f115560ba99d0095acb6a1ed209c58852bc4cc2db8febc055ba26',
])

for (const line of lines) {
  const ev = JSON.parse(line)
  if (wanted.has(ev.id)) {
    console.log('ID   ', ev.id)
    console.log('KIND ', ev.kind)
    console.log('PKEY ', ev.pubkey)
    console.log('TIME ', ev.created_at, new Date(ev.created_at * 1000).toISOString())
    console.log('TAGS ', JSON.stringify(ev.tags))
    console.log('CONTENT')
    console.log(ev.content)
    console.log('========================================')
  }
}
