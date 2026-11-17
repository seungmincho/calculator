import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { JSONPath } from 'jsonpath-plus'

// Independent test oracle. No product utils are imported.
export const treeSource = '{"a.b":{"direct":1},"a":{"b":{"nested":2}},"":{"emptyKey":false},"0":"numeric own key","arr":[0,false,null,"",{},[]],"slash/key":{"~tilde":"slash-tilde"},"quote\\\"key":"quote","back\\\\slash":"backslash","line\\nkey":"control","한국어":"문자열","__proto__":{"keep":3},"constructor":"ctor","toString":4,"*":"literal-star","?(@.x)":"literal-filter"}'
export const treeFixture = JSON.parse(treeSource)
export function ownPointer(root, pointer) {
  assert.equal(typeof pointer,'string')
  if (pointer==='') return root
  assert.ok(pointer.startsWith('/'),'RFC6901 string pointer starts with /')
  let value=root
  for(const token of pointer.slice(1).split('/')) {
    assert.ok(!/~(?:[^01]|$)/.test(token),'valid tilde escape')
    const key=token.replace(/~1/g,'/').replace(/~0/g,'~')
    assert.ok(value!==null&&typeof value==='object','pointer traverses container')
    if(Array.isArray(value)) assert.match(key,/^(?:0|[1-9]\d*)$/)
    const descriptor=Object.getOwnPropertyDescriptor(value,key)
    assert.ok(descriptor&&Object.hasOwn(descriptor,'value'),'own data key only')
    value=descriptor.value
  }
  return value
}
export const pointerVectors = [
  ['',treeFixture],['/a.b/direct',1],['/a/b/nested',2],['//emptyKey',false],['/0','numeric own key'],
  ['/arr/0',0],['/arr/1',false],['/arr/2',null],['/arr/3',''],['/arr/4',{}],['/arr/5',[]],
  ['/slash~1key/~0tilde','slash-tilde'],['/quote"key','quote'],['/back\\slash','backslash'],['/line\nkey','control'],
  ['/한국어','문자열'],['/__proto__/keep',3],['/constructor','ctor'],['/toString',4],['/*','literal-star'],['/?(@.x)','literal-filter'],
]
export function assertTreeReadback(pointer, serialized) { assert.deepEqual(JSON.parse(serialized),ownPointer(treeFixture,pointer)) }
export function assertGeneratedPath(expression,pointer) { const target=ownPointer(treeFixture,pointer); assert.deepEqual(JSONPath({path:expression,json:treeFixture,eval:false}),[target]) }
export function assertOwnStructure(actual,expected) {
  if(expected===null||typeof expected!=='object') { assert.ok(Object.is(actual,expected)); return }
  assert.equal(Array.isArray(actual),Array.isArray(expected)); assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort())
  for(const key of Object.keys(expected)){assert.ok(Object.hasOwn(actual,key));assertOwnStructure(actual[key],expected[key])}
}
export function longSelectionText() { return 'A'.repeat(49998)+'🙂'+'B'.repeat(50000)+'\r\n끝' }

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  for(const [pointer,expected]of pointerVectors)assert.deepEqual(ownPointer(treeFixture,pointer),expected)
  assert.throws(()=>ownPointer({},'/__proto__'));assert.throws(()=>ownPointer(treeFixture,'/arr/01'));assert.throws(()=>ownPointer(treeFixture,'/bad~2'))
  const products=[{name:'low',price:5},{name:'high',price:20}]
  assert.deepEqual(JSONPath({path:'$[?(@.price < 10)]',json:products}),[products[0]])
  assertOwnStructure(JSON.parse(JSON.stringify(treeFixture)),treeFixture)
  const long=JSON.stringify(longSelectionText(),null,2); assert.ok(long.length>100000);assert.equal(JSON.parse(long),longSelectionText())
  console.log('PREPARATION PASS: 21 independent Pointer vectors, 3 rejection guards, installed existing-filter oracle, own-key roundtrip and long-string source. Product/browser not executed.')
}
