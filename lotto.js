import fetch from 'node-fetch';
import fs from 'fs';

async function fetchDraw(n){
  const res = await fetch(`https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${n}`);
  const j = await res.json();
  return j.returnValue==='success'
    ? {
        drwNo: n,
        drwNoDate: j.drwNoDate,
        drwtNo1: j.drwtNo1, drwtNo2: j.drwtNo2,
        drwtNo3: j.drwtNo3, drwtNo4: j.drwtNo4,
        drwtNo5: j.drwtNo5, drwtNo6: j.drwtNo6,
        bnusNo: j.bnusNo
      }
    : null;
}

(async()=>{
  const data = {};
  const last = 1176
  for(let i=1; i<=last; i++){
    const d = await fetchDraw(i);
    if(d) data[i] = d;
  }
  fs.writeFileSync('lottoData.ts',
    `export const lottoData = ${JSON.stringify(data,null,2)};`);
})();
