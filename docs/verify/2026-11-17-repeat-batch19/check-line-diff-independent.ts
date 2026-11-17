import assert from 'node:assert/strict'
import {compareTextLines,formatTextDiff,LINE_DIFF_LIMITS,LineDiffError,splitDiffLines} from '../../../src/utils/lineDiff.ts'
let groups=0,pairs=0
function check(name:string,run:()=>void){run();groups++;console.log(`PASS ${name}`)}
const normalize=(text:string)=>text===''?[]:text.replace(/\r\n?/g,'\n').split('\n')
function subsequences(lines:string[]){const values=new Map<string,number>();for(let mask=0;mask<2**lines.length;mask++){const part=lines.filter((_line,index)=>mask&(1<<index));values.set(JSON.stringify(part),part.length)}return values}
check('Independent subsequence oracle proves minimal edits and exact reconstruction on duplicate/empty short lines',()=>{
  const texts=new Set(['']);let rows:string[][]=[[]]
  for(let length=1;length<=4;length++){rows=rows.flatMap(row=>['A','B',''].map(value=>[...row,value]));rows.forEach(row=>texts.add(row.join('\n')))}
  for(const left of texts)for(const right of texts){
    const a=normalize(left),b=normalize(right),leftSub=subsequences(a),rightSub=subsequences(b)
    const common=Math.max(...[...leftSub].filter(([key])=>rightSub.has(key)).map(([,length])=>length))
    const result=compareTextLines(left,right)
    assert.equal(result.summary.added+result.summary.removed,a.length+b.length-2*common)
    assert.equal(result.summary.unchanged,common)
    const reconstructedA=result.lines.filter(row=>row.type!=='added'),reconstructedB=result.lines.filter(row=>row.type!=='removed')
    assert.deepEqual(reconstructedA.map(row=>row.content),a);assert.deepEqual(reconstructedB.map(row=>row.content),b)
    assert.deepEqual(reconstructedA.map(row=>row.left),a.map((_line,i)=>i+1));assert.deepEqual(reconstructedB.map(row=>row.right),b.map((_line,i)=>i+1))
    assert.ok(result.lines.every(row=>row.type==='unchanged'||row.type==='added'?row.type==='unchanged'||row.left===undefined:row.right===undefined));pairs++
  }
})
check('CRLF and lone CR normalize while final newline, blank document, whitespace and markup remain distinct',()=>{
  assert.deepEqual(compareTextLines('가\r\n\r\n끝\r','가\n\n끝\n').summary,{added:0,removed:0,unchanged:4})
  assert.deepEqual(compareTextLines('끝','끝\n').summary,{added:1,removed:0,unchanged:1})
  assert.deepEqual(compareTextLines('','\n').summary,{added:2,removed:0,unchanged:0})
  const result=compareTextLines('<script>alert(1)</script>\n a\n','<img onerror=x>\na\n')
  assert.ok(result.lines.some(row=>row.content==='<script>alert(1)</script>'));assert.ok(result.lines.some(row=>row.content===' a'))
  assert.equal(formatTextDiff(result),result.lines.map(row=>`${row.type==='added'?'+':row.type==='removed'?'-':' '} ${row.content}`).join('\n'))
})
check('UTF-8 and line bounds accept the exact limit and reject one over before comparison',()=>{
  assert.equal(splitDiffLines('😀'.repeat(LINE_DIFF_LIMITS.bytes/4)).length,1)
  assert.throws(()=>splitDiffLines('😀'.repeat(LINE_DIFF_LIMITS.bytes/4)+'a'),error=>error instanceof LineDiffError&&error.code==='tooLarge')
  assert.equal(splitDiffLines('\n'.repeat(9999)).length,10000)
  assert.throws(()=>splitDiffLines('\n'.repeat(10000)),error=>error instanceof LineDiffError&&error.code==='tooManyLines')
})
check('DP boundary includes sentinels and prefix/suffix trimming keeps a large tiny edit within budget',()=>{
  const a=Array.from({length:1999},(_,i)=>`a${i}`).join('\n'),b=Array.from({length:1999},(_,i)=>`b${i}`).join('\n')
  assert.equal(compareTextLines(a,b).summary.added,1999)
  assert.throws(()=>compareTextLines(a+'\na1999',b+'\nb1999'),error=>error instanceof LineDiffError&&error.code==='tooComplex')
  const lines=Array.from({length:10000},(_,i)=>`row${i}`),changed=[...lines];changed[5000]='changed'
  assert.deepEqual(compareTextLines(lines.join('\n'),changed.join('\n')).summary,{added:1,removed:1,unchanged:9999})
})
console.log(`Independent line diff: ${groups} groups passed; ${pairs} minimal-edit/reconstruction pairs`)
