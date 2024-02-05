import 'websocket-polyfill'
import { readFile, writeFile } from 'fs/promises'
import { SimplePool, finalizeEvent, getPublicKey } from 'nostr-tools'

let relays = ['wss://yabu.me', "wss://r.kojira.io/", "wss://nos.lol", "wss://relay-jp.nostr.moctane.com/", "wss://relay.nostr.band", "wss://relay.nostr.wirednet.jp/"]

const jsonData = JSON.parse(await readFile(`${process.argv[3]}/iroiro.json`));

let logData;
try {
  logData = JSON.parse(await readFile(`${process.argv[3]}/postlog.json`));
} catch (error) {
  logData = [];
}
console.log(logData);
if (logData.length >= jsonData.length) {
  logData = [];
}
logData.sort((a, b) => b - a);
const filteredData = jsonData.filter((item, index) => !logData.includes(index));
console.log(filteredData);

const index = Math.floor(Math.random() * (filteredData.length - 1));

const data = jsonData[index];

const content = `${data.title}\n${data.url}\n${data.description}\ncategory: ${(data.category && data.category !== "") ? data.category : 'Uncategorized'}`;

const nsec = process.argv[2];
const pool = new SimplePool();


let newEvent = {
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: content,
}

const signedEvent = finalizeEvent(newEvent, nsec)

//log保存
logData.push(index);
// ファイルに出力する
await writeFile(`${process.argv[3]}/postlog.json`, JSON.stringify(logData));

//allsettledがちゃんとおわるかわかんないから先にファイルに出力しちゃう
await Promise.allSettled(pool.publish(relays, signedEvent))


process.exit()