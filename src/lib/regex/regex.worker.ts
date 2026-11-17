import { executeRegexJob, RegexEngineError, isRegexObject } from '../../utils/regexEngine.ts'
import { isRegexWorkerRequest, type RegexWorkerResponse } from './protocol.ts'

self.onmessage = (event: MessageEvent<unknown>) => {
  const request = event.data
  const id = isRegexObject(request) && Number.isSafeInteger(request.id) ? Number(request.id) : 0
  const revision = isRegexObject(request) && Number.isSafeInteger(request.revision) ? Number(request.revision) : 0
  let response: RegexWorkerResponse
  try {
    if (!isRegexWorkerRequest(request)) throw new RegexEngineError('invalidInput')
    response = { id, revision, ok: true, result: executeRegexJob(request.job) }
  } catch (cause) {
    response = { id, revision, ok: false, error: cause instanceof RegexEngineError ? cause.code : 'workerFailed' }
  }
  self.postMessage(response)
}
