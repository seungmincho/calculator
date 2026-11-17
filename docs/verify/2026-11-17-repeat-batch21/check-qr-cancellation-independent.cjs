// Actual QR utility with controlled I/O promises; no browser/Worker success claim.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const esbuild = require('esbuild')

;(async () => {
  const built = await esbuild.build({ entryPoints: ['src/lib/qr/image.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', external: ['./client'] })
  const module = { exports: {} }
  vm.runInNewContext(built.outputFiles[0].text, {
    module, exports: module.exports, Error, Promise, Date, AbortController, setTimeout, clearTimeout,
    require(name) { if (name === './client') return { decodeQrInWorker() { throw new Error('unexpected worker') } }; throw new Error(name) },
  })
  const api = module.exports, unhandled = []
  const onUnhandled = error => { unhandled.push(error.message) }
  process.on('unhandledRejection', onUnhandled)
  const turn = () => new Promise(resolve => setImmediate(resolve))
  const late = () => { let reject; const promise = new Promise((_resolve, no) => { reject = no }); return { promise, reject } }
  const controller = new AbortController(); controller.abort()
  const alreadyStarted = late()
  await assert.rejects(api.qrImageWait(alreadyStarted.promise, controller.signal, 100), error => error.code === 'canceled')
  alreadyStarted.reject(new Error('late-started-rejection'))
  await turn()
  const waitUnhandled = [...unhandled]
  alreadyStarted.promise.catch(() => {})

  let arrayBufferCalls = 0
  const reading = late()
  const file = { size: 64, arrayBuffer() { arrayBufferCalls++; return reading.promise } }
  await assert.rejects(api.readQrImage(file, controller.signal), error => error.code === 'canceled')
  if (arrayBufferCalls) reading.reject(new Error('late-file-rejection'))
  await turn()
  const fileUnhandled = unhandled.filter(message => message === 'late-file-rejection')
  reading.promise.catch(() => {})
  await turn()

  const live = new AbortController(), inFlight = late()
  const canceled = api.qrImageWait(inFlight.promise, live.signal, 100)
  live.abort()
  await assert.rejects(canceled, error => error.code === 'canceled')
  inFlight.reject(new Error('late-running-rejection'))
  await turn()
  const runningUnhandled = unhandled.filter(message => message === 'late-running-rejection')
  inFlight.promise.catch(() => {})

  const timer = new AbortController(), timed = late()
  await assert.rejects(api.qrImageWait(timed.promise, timer.signal, 1), error => error.code === 'timeout')
  timed.reject(new Error('late-timeout-rejection'))
  await turn()
  const timeoutUnhandled = unhandled.filter(message => message === 'late-timeout-rejection')
  timed.promise.catch(() => {})
  await turn()
  process.removeListener('unhandledRejection', onUnhandled)

  const evidence = { waitUnhandled, arrayBufferCalls, fileUnhandled }
  if (process.argv.includes('--reproduce')) {
    fs.writeFileSync('docs/verify/2026-11-17-repeat-batch21/qr-cancel-before-fix.json', JSON.stringify(evidence, null, 2) + '\n')
    console.log(JSON.stringify(evidence))
  }
  assert.deepEqual(waitUnhandled, [], 'already-started promise rejection must be observed after cancellation')
  assert.equal(arrayBufferCalls, 0, 'already canceled read must not start file I/O')
  assert.deepEqual(fileUnhandled, [])
  assert.deepEqual(runningUnhandled, [])
  assert.deepEqual(timeoutUnhandled, [])
  console.log('PASS pre-aborted wait/read, running cancel, and timeout consume late rejection (4 boundaries)')
})().catch(error => { console.error(error); process.exitCode = 1 })
