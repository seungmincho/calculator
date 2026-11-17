import { convertJsonCsv, JsonCsvError } from '../../utils/jsonCsv.ts'
import { readJsonCsvFile } from '../../utils/jsonCsvActions.ts'
import { isJsonCsvRequest, jsonCsvObject, type JsonCsvResponse } from './protocol.ts'

self.onmessage = async (event: MessageEvent<unknown>) => {
  const request = event.data
  const id = jsonCsvObject(request) && Number.isSafeInteger(request.id) ? Number(request.id) : 0
  const kind = jsonCsvObject(request) && request.kind === 'decode' ? 'decode' : 'convert'
  let response: JsonCsvResponse
  const start = performance.now()
  try {
    if (!isJsonCsvRequest(request)) {
      response = { version: 1, id, kind, ok: false, error: { scope: 'worker', code: 'invalidResponse' } }
    } else if (request.kind === 'convert') {
      const result = convertJsonCsv(request.input, request.mode, request.options)
      response = { version: 1, id, kind: 'convert', ok: true, result, computeMs: performance.now() - start }
    } else {
      const outcome = await readJsonCsvFile({ size: request.bytes.byteLength }, request.encoding, async () => request.bytes)
      response = outcome.status === 'ready'
        ? { version: 1, id, kind: 'decode', ok: true, text: outcome.text, computeMs: performance.now() - start }
        : { version: 1, id, kind: 'decode', ok: false, error: { scope: 'file', code: outcome.status === 'failed' ? outcome.error : 'read' } }
    }
  } catch (cause) {
    response = { version: 1, id, kind, ok: false, error: cause instanceof JsonCsvError
      ? { scope: 'conversion', code: cause.code, position: cause.position }
      : { scope: 'worker', code: 'workerFailed' } }
  }
  self.postMessage(response)
}
