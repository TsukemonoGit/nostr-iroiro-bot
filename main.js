#!/usr/bin/env node
import 'websocket-polyfill'
import { readFile, writeFile } from 'fs/promises'
import { SimplePool, finalizeEvent, getPublicKey } from 'nostr-tools'

let relays = ['wss://yabu.me', "wss://r.kojira.io/", "nos.lol", "wss://relay-jp.nostr.moctane.com/"]

const jsonData = JSON.parse(await readFile(`${process.argv[3]}/iroiro.json`));

const index = Math.floor(Math.random() * (jsonData.length - 1));
const data = jsonData[index];
console.log(data);
const content = `${data.title}\n${data.url}\n${data.description}\ncategory: ${(data.category && data.category !== "") ? data.category : 'Uncategorized'}`;
console.log(content);


const nsec = process.argv[2];
const pool = new SimplePool();

//const npub = getPublicKey(nsec);


let newEvent = {
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: content,
}// JSON.stringify(content)
const signedEvent = finalizeEvent(newEvent, nsec)
console.log(signedEvent);
await Promise.any(pool.publish(relays, signedEvent))

process.exit()