import assert from 'node:assert/strict'
import {createTranslations,withTranslationFallback} from '../../../src/lib/i18n/translationLookup.ts'
let groups=0
function check(name:string,run:()=>void){run();groups++;console.log(`PASS ${name}`)}
check('Strings interpolate false, zero and empty without replacing absent/null variables',()=>{
  const t=createTranslations({demo:{label:'{zero}/{falseValue}/{empty}/{absent}/{nullValue}'}})('demo')
  assert.equal(t('label',{zero:0,falseValue:false,empty:'',nullValue:null}),'0/false//{absent}/{nullValue}')
  assert.equal(t('unknown'),'unknown');assert.equal(t.raw('unknown'),undefined);assert.equal(t('label.child'),'label.child')
})
check('English missing or wrong scalar types fall back without dropping valid siblings or extra English fields',()=>{
  const ko={demo:{label:'한국어',nested:{one:'하나',two:'둘'},count:0,flag:false,nil:null}}
  const en={demo:{label:42,nested:{one:'One',two:[]},count:'bad',flag:'bad',nil:'bad',extra:'Extra'}}
  const t=createTranslations(en,ko)('demo')
  assert.equal(t('label'),'한국어');assert.equal(t('nested.one'),'One');assert.equal(t('nested.two'),'둘');assert.equal(t('extra'),'Extra')
  assert.equal(t.raw('count'),0);assert.equal(t.raw('flag'),false);assert.equal(t.raw('nil'),null)
  assert.equal(t('nested'),'nested');assert.equal(t('unknown'),'unknown')
})
check('Incompatible arrays fall back atomically rather than mixing languages by index',()=>{
  const ko=[{title:'가',lines:['하나','둘']},{title:'나',lines:['셋']}]
  const valid=[{title:'A',lines:['One','Two']},{title:'B',lines:['Three']}]
  assert.equal(withTranslationFallback(valid,ko),valid)
  for(const bad of [valid.slice(0,1),[valid[0],{title:'B',lines:[]}],[{title:'A'},valid[1]],[valid[0],{title:2,lines:['Three']}],null])assert.equal(withTranslationFallback(bad,ko),ko)
})
check('Raw objects recursively retain KO shape without mutating either catalogue',()=>{
  const ko={demo:{object:{one:{label:'하나'},two:['둘']}}},en={demo:{object:{one:{label:'One'},two:false}}}
  const beforeKo=JSON.stringify(ko),beforeEn=JSON.stringify(en),t=createTranslations(en,ko)('demo')
  assert.deepEqual(t.raw('object'),{one:{label:'One'},two:['둘']});assert.equal(t('object.one.label'),'One')
  assert.equal(JSON.stringify(ko),beforeKo);assert.equal(JSON.stringify(en),beforeEn)
  assert.equal(createTranslations(en,ko)('missing')('title'),'title')
})
console.log(`Independent i18n lookup: ${groups} groups passed`)
