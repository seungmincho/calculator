// node scripts/check-passport-preset-browser.mjs --dir out --result report.json
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createReadStream,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs'
import {createServer} from 'node:http'
import {extname,resolve,sep} from 'node:path'
import {chromium} from 'playwright'
import JSZip from 'jszip'

const args=process.argv.slice(2),option=key=>args[args.indexOf(key)+1]
const directory=args.includes('--dir')?resolve(option('--dir')):null,report=resolve(option('--result'))
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json'}
let server
if(directory)server=createServer((request,response)=>{
  try{
    let file=resolve(directory,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname))
    if(file!==directory&&!file.startsWith(directory+sep)){response.writeHead(403);response.end();return}
    if(statSync(file).isDirectory())file=resolve(file,'index.html')
    response.setHeader('Content-Type',types[extname(file)]||'application/octet-stream')
    createReadStream(file).pipe(response)
  }catch{response.writeHead(404);response.end()}
})
if(server)await new Promise(done=>server.listen(0,'127.0.0.1',done))
const origin=server?`http://127.0.0.1:${server.address().port}`:new URL(option('--url')).origin
const browser=await chromium.launch({headless:true}),results=[]
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')

async function makeImage(page,width,height,mime,style){
  const data=await page.evaluate(({width,height,mime,style})=>{
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
    const ctx=canvas.getContext('2d')
    if(style==='wide'){
      ctx.fillStyle='#f00';ctx.fillRect(0,0,width/2,height)
      ctx.fillStyle='#00f';ctx.fillRect(width/2,0,width/2,height)
    }else if(style==='tall'){
      ctx.fillStyle='#0f0';ctx.fillRect(0,0,width,height/2)
      ctx.fillStyle='#f0f';ctx.fillRect(0,height/2,width,height/2)
    }else if(style==='noise'){
      const pixels=ctx.createImageData(width,height)
      let seed=42
      for(let i=0;i<pixels.data.length;i+=4){
        seed=(Math.imul(seed,1664525)+1013904223)>>>0
        pixels.data[i]=seed&255;pixels.data[i+1]=(seed>>>8)&255;pixels.data[i+2]=(seed>>>16)&255;pixels.data[i+3]=255
      }
      ctx.putImageData(pixels,0,0)
    }else{ctx.fillStyle='#f00';ctx.fillRect(0,0,width,height)}
    return canvas.toDataURL(mime,0.9).split(',')[1]
  },{width,height,mime,style})
  return Buffer.from(data,'base64')
}

async function preview(page){
  const img=page.locator('img[style*="aspect-ratio"]')
  await img.waitFor()
  return page.evaluate(async()=>{
    const url=document.querySelector('img[style*="aspect-ratio"]').src
    const blob=await fetch(url).then(r=>r.blob())
    const bitmap=await createImageBitmap(blob)
    const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height
    const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0)
    const rgba=Array.from(ctx.getImageData(Math.floor(bitmap.width/2),Math.floor(bitmap.height/2),1,1).data)
    bitmap.close()
    return {url,type:blob.type,size:blob.size,width:canvas.width,height:canvas.height,rgba,bytes:Array.from(new Uint8Array(await blob.arrayBuffer()))}
  })
}
async function waitNewPreview(page,oldUrl){
  await page.waitForFunction(previous=>{
    const img=document.querySelector('img[style*="aspect-ratio"]')
    return !!img&&img.src!==previous
  },oldUrl)
  return preview(page)
}
const record=(name,details={})=>results.push({name,status:'PASS',...details})
try{
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true,serviceWorkers:'block'})
  const page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(origin+'/image-resizer',{waitUntil:'networkidle'})
  await page.getByRole('group',{name:'저장 형식'}).getByRole('button',{name:'WebP'}).click()
  await page.getByRole('button',{name:'제한 없음'}).click()
  await page.getByRole('button',{name:/여권 사진/}).click()
  assert.equal(await page.locator('#ir-kb').inputValue(),'500')
  assert.equal(await page.getByRole('group',{name:'저장 형식'}).getByRole('button',{name:'JPG'}).getAttribute('aria-pressed'),'true')
  assert.equal(await page.getByRole('button',{name:/여권 사진/}).getAttribute('aria-pressed'),'true')
  record('preset-overrides-webp-and-unlimited-target')

  const wide=await makeImage(page,800,600,'image/png','wide')
  const tall=await makeImage(page,500,1200,'image/webp','tall')
  await page.locator('input[type="file"]').setInputFiles([
    {name:'wide.png',mimeType:'image/png',buffer:wide},
    {name:'tall.webp',mimeType:'image/webp',buffer:tall},
  ])
  let first=await preview(page)
  assert.equal(first.type,'image/jpeg');assert.equal(first.width,413);assert.equal(first.height,531);assert.ok(first.size<=500000)
  const cropX=page.locator('#ir-crop-x');await cropX.focus();await cropX.press('Home')
  const left=await waitNewPreview(page,first.url)
  assert.ok(left.rgba[0]>left.rgba[2]*2,`left crop pixel ${left.rgba}`)
  await cropX.press('End')
  const right=await waitNewPreview(page,left.url)
  assert.ok(right.rgba[2]>right.rgba[0]*2,`right crop pixel ${right.rgba}`)
  record('wide-png-crop-extremes', {outputBytes:right.size})

  await page.getByRole('button',{name:'tall.webp 결과 크게 보기'}).click()
  let second=await waitNewPreview(page,right.url)
  assert.equal(await cropX.inputValue(),'50')
  const cropY=page.locator('#ir-crop-y');await cropY.focus();await cropY.press('Home')
  const top=await waitNewPreview(page,second.url)
  assert.ok(top.rgba[1]>top.rgba[0]*2,`top crop pixel ${top.rgba}`)
  await cropY.press('End')
  const bottom=await waitNewPreview(page,top.url)
  assert.ok(bottom.rgba[0]>100&&bottom.rgba[2]>100&&bottom.rgba[1]<80,`bottom crop pixel ${bottom.rgba}`)
  await page.getByRole('button',{name:'wide.png 결과 크게 보기'}).click()
  const firstAgain=await waitNewPreview(page,bottom.url)
  assert.equal(await cropX.inputValue(),'100')
  assert.equal(digest(Buffer.from(firstAgain.bytes)),digest(Buffer.from(right.bytes)))
  record('per-photo-independent-crop-and-preview')

  const downloadWait=page.waitForEvent('download')
  await page.getByRole('button',{name:'wide.png 다운로드'}).click()
  const one=await downloadWait,oneBytes=readFileSync(await one.path())
  assert.equal(digest(oneBytes),digest(Buffer.from(firstAgain.bytes)))
  const zipWait=page.waitForEvent('download')
  await page.getByRole('button',{name:/ZIP으로 받기/}).click()
  const zipDownload=await zipWait,zip=await JSZip.loadAsync(readFileSync(await zipDownload.path()))
  const names=Object.keys(zip.files).filter(n=>!zip.files[n].dir)
  assert.equal(names.length,2)
  const zippedWide=await zip.file(names.find(n=>n.startsWith('wide_'))).async('nodebuffer')
  const zippedTall=await zip.file(names.find(n=>n.startsWith('tall_'))).async('nodebuffer')
  assert.equal(digest(zippedWide),digest(Buffer.from(firstAgain.bytes)))
  assert.equal(digest(zippedTall),digest(Buffer.from(bottom.bytes)))
  record('individual-download-and-zip-match-preview')

  await page.getByRole('button',{name:'전체 삭제'}).click()
  const small=await makeImage(page,80,100,'image/png','red')
  await page.locator('input[type="file"]').setInputFiles({name:'small.png',mimeType:'image/png',buffer:small})
  const enlarged=await preview(page)
  assert.equal(enlarged.width,413);assert.equal(enlarged.height,531)
  await page.getByText('원본이 출력 크기보다 작아 확대됩니다. 화질을 확인하세요.').waitFor()
  record('small-source-warning')
  await page.getByRole('button',{name:'전체 삭제'}).click()
  const plainJpeg=await makeImage(page,100,60,'image/jpeg','wide')
  const exif=Buffer.from([
    0xff,0xe1,0x00,0x22,0x45,0x78,0x69,0x66,0x00,0x00,
    0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,0x01,0x00,
    0x12,0x01,0x03,0x00,0x01,0x00,0x00,0x00,0x06,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,
  ])
  const oriented=Buffer.concat([plainJpeg.subarray(0,2),exif,plainJpeg.subarray(2)])
  await page.locator('input[type="file"]').setInputFiles({name:'orient.jpg',mimeType:'image/jpeg',buffer:oriented})
  const orientedPreview=await preview(page)
  await page.getByText(/원본 60×100/).waitFor()
  const orientDownloadWait=page.waitForEvent('download')
  await page.getByRole('button',{name:'orient.jpg 다운로드'}).click()
  const orientDownload=await orientDownloadWait
  assert.equal(digest(readFileSync(await orientDownload.path())),digest(Buffer.from(orientedPreview.bytes)))
  record('exif-orientation-preview-matches-download')
  await page.getByRole('button',{name:'전체 삭제'}).click()
  const noise=await makeImage(page,1000,1000,'image/png','noise')
  await page.locator('#ir-kb').fill('10')
  await page.locator('input[type="file"]').setInputFiles({name:'noise.png',mimeType:'image/png',buffer:noise})
  const tooLarge=await preview(page)
  assert.equal(tooLarge.width,413);assert.equal(tooLarge.height,531)
  assert.ok(tooLarge.size>10000)
  await page.getByText(/최대 용량까지 줄이지 못했어요/).waitFor()
  record('impossible-limit-warning-keeps-pixel-size',{outputBytes:tooLarge.size})

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'})
  const phone=await mobile.newPage(),mobileErrors=[]
  phone.on('pageerror',e=>mobileErrors.push(e.message))
  await phone.goto(origin+'/image-resizer',{waitUntil:'networkidle'})
  await phone.getByRole('button',{name:/여권 사진/}).click()
  await phone.locator('input[type="file"]').setInputFiles({name:'wide.png',mimeType:'image/png',buffer:wide})
  await preview(phone)
  await phone.locator('#ir-crop-x').focus();await phone.locator('#ir-crop-x').press('End')
  await phone.waitForFunction(()=>document.querySelector('#ir-crop-x')?.value==='100')
  assert.deepEqual(mobileErrors,[])
  record('mobile-keyboard-crop')
  await mobile.close()
  assert.deepEqual(errors,[])
  await context.close()
}catch(error){results.push({name:'passport-browser',status:'FAIL',message:error.stack?.slice(0,1100)||String(error)})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
