import 'websocket-polyfill'
import { readFile, writeFile } from 'fs/promises'
import { SimplePool, finalizeEvent, getPublicKey } from 'nostr-tools'

let relays = ['wss://yabu.me', "wss://r.kojira.io/", "wss://nos.lol", "wss://relay-jp.nostr.moctane.com/", "wss://relay.nostr.band", "wss://relay.nostr.wirednet.jp/"]

const i_list = process.argv.length > 4 ? process.argv[4] : undefined;
const jsonData = JSON.parse(await readFile(`${process.argv[3]}/iroiro.json`));

const jsonDataIds = Object.keys(jsonData);

let logData;

try {
  logData = JSON.parse(await readFile(`${process.argv[3]}/postlog.json`));
} catch (error) {
  logData = [];
}
//console.log(logData);
if (logData.length >= Object.keys(jsonData).length) {
  logData = [];
}
//logData.sort((a, b) => b - a);
const filteredIds = jsonDataIds.filter((id) => !logData.includes(id));
//console.log(filteredData);


const randomIndex = Math.floor(Math.random() * filteredIds.length);
//console.log(randomIndex)
const randomId = filteredIds[randomIndex];
//console.log(randomId);
const data = jsonData[i_list ? i_list : randomId];
//console.log(data);

const content = `${i_list ? "(手動テスト)\n" : ""}${data.title}\n${data.url}\n${data.description}${data.kind ? `\n\n主なkind: ${data.kind}` : ''} ${(data.category && data.category !== "") ? `\ncategory: ${data.category}` : ""}`;

const nsec = process.argv[2];
const pool = new SimplePool();


let newEvent = {
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: content,
}

const signedEvent = finalizeEvent(newEvent, nsec)
if (i_list === undefined) {//引数指定して実行したときのはノーカン
  //log保存
  logData.push(randomId);
  // ファイルに出力する
  await writeFile(`${process.argv[3]}/postlog.json`, JSON.stringify(logData));
}
//allsettledがちゃんとおわるかわかんないから先にファイルに出力しちゃう
await Promise.allSettled(pool.publish(relays, signedEvent))


process.exit()