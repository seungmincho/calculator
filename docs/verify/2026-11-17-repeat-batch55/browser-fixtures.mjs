import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { PNG } from 'pngjs'
import jsQR from 'jsqr'

export function qrPrintRows(count) {
  const special = [
    { label: '한글 안내', payload: 'https://example.invalid/안내?합성=1' },
    { label: '같은 이름', payload: '  leading and trailing  ' },
    { label: '같은 이름', payload: 'tab\tinside\tpayload' },
    { label: '<img onerror="window.qrInjected=true"> & "이름"', payload: 'PRIVATE-PRINT-PAYLOAD-HTML' },
    { label: '가😀'.repeat(30), payload: '긴 이름의 실제 원문' },
    { label: '최대 1000 bytes', payload: '한'.repeat(300) + 'a'.repeat(100) },
    { label: '', payload: 'unlabelled payload 7' },
  ]
  return Array.from({ length: count }, (_, index) => special[index] ?? { label: `합성 QR ${index + 1}`, payload: `https://example.invalid/synthetic/${index + 1}?v=QR-only` })
}
export function inputForRows(rows) { return rows.map(row => row.label ? `${row.label}\t${row.payload}` : row.payload).join('\n') }

export async function installQrPrintPorts(context) {
  await context.addInitScript(() => {
    if (!/^https?:$/.test(location.protocol)) return
    window.__qrPrintFrames = []; window.__qrPrints = []; window.__singlePrints = []; window.__qrDecodeMode = 'native'; window.__qrHeldDecodes = []; window.__qrFastTimeout = false; window.__qrToDataUrls = 0; window.__qrFailDataUrlAt = null
    const append = Node.prototype.appendChild, dataUrl = HTMLCanvasElement.prototype.toDataURL, timeout = window.setTimeout.bind(window)
    HTMLCanvasElement.prototype.toDataURL = function (...args) { window.__qrToDataUrls++; if(window.__qrFailDataUrlAt===window.__qrToDataUrls)throw new Error('Synthetic QR encode error');return dataUrl.apply(this,args) }
    window.setTimeout = (callback, delay, ...args) => timeout(callback, window.__qrFastTimeout && delay === 15000 ? 50 : delay, ...args)
    Node.prototype.appendChild = function (node) {
      const result = append.call(this, node)
      if (node instanceof HTMLIFrameElement && node.hasAttribute('data-qr-batch-print-frame')) {
        const win = node.contentWindow, record = { node, decodeCalls: 0, printed: 0, mode: window.__qrDecodeMode }; window.__qrPrintFrames.push(record)
        const decode = win.HTMLImageElement.prototype.decode
        win.HTMLImageElement.prototype.decode = async function () {
          record.decodeCalls++; await decode.call(this)
          if (record.mode === 'reject') throw new Error('Synthetic decoded-image rejection')
          if (record.mode === 'hold' || record.mode === 'hang') await new Promise(resolve => window.__qrHeldDecodes.push(resolve))
        }
        win.print = () => {
          record.printed++
          const document = win.document
          window.__qrPrints.push({ html: document.documentElement.outerHTML, text: document.body.textContent, lang: document.documentElement.lang,
            cells: [...document.querySelectorAll('[data-qr-line]')].map(cell => { const image=cell.querySelector('img'),page=cell.closest('[data-qr-page]'),a=image.getBoundingClientRect(),b=page.getBoundingClientRect();return {line:Number(cell.dataset.qrLine),page:Number(page.dataset.qrPage),name:cell.querySelector('.name')?.textContent??'',src:image.src,natural:[image.naturalWidth,image.naturalHeight],rect:{x:a.x-b.x,y:a.y-b.y,width:a.width,height:a.height}} }),
            pages: document.querySelectorAll('[data-qr-page]').length, images: document.images.length, footers: [...document.querySelectorAll('footer')].map(node=>node.textContent), injected:!!win.qrInjected })
        }
      } else if (node instanceof HTMLIFrameElement && node.getAttribute('aria-hidden') === 'true') {
        const win=node.contentWindow
        win.print=()=>{window.__singlePrints.push({html:win.document.documentElement.outerHTML,images:[...win.document.images].map(image=>image.src)});win.dispatchEvent(new Event('afterprint'))}
      }
      return result
    }
    window.__qrReleaseDecodes = () => { const pending=window.__qrHeldDecodes.splice(0);pending.forEach(resolve=>resolve()) }
    window.__qrAfterPrint = () => { for(const record of window.__qrPrintFrames)if(record.node.isConnected)record.node.contentWindow.dispatchEvent(new Event('afterprint')) }
  })
}

const poppler = 'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-611-0_26.1112.611.0_x64__3k8sg7r9htsxt/dependencies/native/poppler/Library/bin/pdftoppm.exe'
export async function inspectNativePdf(page, record, rows, out, label, rasterPages) {
  const printPage=await page.context().newPage();const file=resolve(out,`${label}.pdf`)
  try {
    await printPage.setContent(record.html,{waitUntil:'load'});await printPage.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())))
    await printPage.pdf({path:file,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false})
  } finally { await printPage.close() }
  const bytes=readFileSync(file),pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),Math.ceil(rows.length/6))
  for(const p of pdf.getPages()){const size=p.getSize();assert.ok(Math.abs(size.width-595.28)<1);assert.ok(Math.abs(size.height-841.89)<1)}
  const decoded=[]
  for(const number of rasterPages){const prefix=resolve(out,`${label}-page-${number}`);const result=spawnSync(poppler,['-f',String(number),'-l',String(number),'-singlefile','-r','300','-png',file,prefix],{encoding:'utf8',windowsHide:true,timeout:60000});assert.equal(result.status,0,result.stderr);const raster=PNG.sync.read(readFileSync(prefix+'.png'))
    for(const cell of record.cells.filter(cell=>cell.page===number)){const scale=300/96,margin=12*300/25.4,pad=8,x=Math.max(0,Math.floor(margin+cell.rect.x*scale)-pad),y=Math.max(0,Math.floor(margin+cell.rect.y*scale)-pad),width=Math.ceil(cell.rect.width*scale)+pad*2,height=Math.ceil(cell.rect.height*scale)+pad*2;const crop=new PNG({width,height});PNG.bitblt(raster,crop,x,y,width,height,0,0);const value=jsQR(new Uint8ClampedArray(crop.data),width,height,{inversionAttempts:'dontInvert'});assert.ok(value,`QR native PDF decode line ${cell.line}`);assert.equal(value.data,rows[cell.line-1].payload);decoded.push({line:cell.line,page:number,payloadBytes:Buffer.byteLength(value.data),width,height});if(cell.line===6)writeFileSync(resolve(out,`${label}-1000byte-qr.png`),PNG.sync.write(crop))}
  }
  return {file,bytes:bytes.length,pages:pdf.getPageCount(),decoded,actualPdfRasterDpi:300}
}
