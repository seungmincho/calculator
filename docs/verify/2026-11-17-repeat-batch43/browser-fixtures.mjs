import assert from 'node:assert/strict'

// Independent RFC-style quoted delimited reader: no product serializer imports.
export function parseDelimited(text,separator=',') {
  assert.ok(separator===','||separator==='\t');const rows=[];let row=[],value='',quoted=false,closed=false
  if(text.charCodeAt(0)===0xFEFF)text=text.slice(1)
  for(let i=0;i<text.length;i++){
    const char=text[i]
    if(quoted){if(char==='"'){if(text[i+1]==='"'){value+='"';i++}else{quoted=false;closed=true}}else value+=char;continue}
    if(char==='"'){assert.equal(value,'','Quote starts at field boundary');assert.equal(closed,false);quoted=true;continue}
    if(char===separator){row.push(value);value='';closed=false;continue}
    if(char==='\r'||char==='\n'){if(char==='\r'&&text[i+1]==='\n')i++;row.push(value);rows.push(row);row=[];value='';closed=false;continue}
    assert.equal(closed,false,'Unexpected data after closing quote');value+=char
  }
  assert.equal(quoted,false,'Unclosed quote');if(value!==''||row.length||closed){row.push(value);rows.push(row)}return rows
}
export const physicalRows=1000
export function thousandRows(){const lines=Array.from({length:physicalRows},(_,index)=>String(index+1));lines[1]='';lines[2]='not-a-number';lines[3]='1\t2';lines[4]='=SUM(A1:A2)';lines[5]='"quoted"';lines[6]='1,000';return lines.join('\n')+'\n'}
export const independentPairs=[
  {pair:{c:'length',f:'m',t:'cm',p:6,rb:16},source:'1\n-2\n0\n1e-3',expected:[100,-200,0,0.1]},
  {pair:{c:'temperature',f:'degC',t:'degF',p:6,rb:16},source:'0\n100\n-40',expected:[32,212,-40]},
  {pair:{c:'fuel',f:'kmL',t:'L100km',p:6,rb:16},source:'10\n20\n-5',expected:[10,5,-20]},
  {pair:{c:'css',f:'rem',t:'px',p:6,rb:20},source:'1\n1.5\n-2',expected:[20,30,-40]},
]
