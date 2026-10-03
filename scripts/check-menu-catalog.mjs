import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {menuConfig,categoryKeys} from '../src/config/menuConfig.ts'

const root=fileURLToPath(new URL('..',import.meta.url))
const messages=Object.fromEntries(['ko','en'].map(locale=>[locale,JSON.parse(readFileSync(resolve(root,`messages/${locale}.json`),'utf8'))]))
const readKey=(source,key)=>key.split('.').reduce((value,part)=>value?.[part],source)
const seen=new Set()
for(const category of categoryKeys)for(const item of menuConfig[category].items){
  assert.ok(!seen.has(item.href),`Duplicate menu path: ${item.href}`)
  seen.add(item.href)
  assert.ok(existsSync(resolve(root,`src/app${item.href}/page.tsx`)),`Missing route: ${item.href}`)
  for(const locale of ['ko','en'])for(const key of [item.labelKey,item.descriptionKey]){
    assert.equal(typeof readKey(messages[locale],key),'string',`${locale}: ${item.href} missing ${key}`)
  }
}
console.log(`check-menu-catalog OK: ${seen.size} unique routed tools, both menu strings in ko/en`)
