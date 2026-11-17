import { compareTextLines, LineDiffError } from '../../utils/lineDiff.ts'
import { isLineDiffRequest, isObject, type LineDiffResponse } from './protocol.ts'

self.onmessage = (event: MessageEvent<unknown>) => {
  const request = event.data
  const id = isObject(request) && Number.isSafeInteger(request.id) ? Number(request.id) : 0
  let response: LineDiffResponse
  try {
    if (!isLineDiffRequest(request)) throw new LineDiffError('invalidInput')
    response = { id, ok: true, result: compareTextLines(request.left, request.right) }
  } catch (cause) {
    response = { id, ok: false, error: cause instanceof LineDiffError ? cause.code : 'workerFailed' }
  }
  self.postMessage(response)
}
