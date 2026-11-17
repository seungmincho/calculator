import jsQR from 'jsqr'
import { isQrDecodeRequest, type QrDecodeResponse } from './protocol'

const scope = self as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: QrDecodeResponse): void }
scope.onmessage = event => {
  const data: unknown = event.data
  if (!isQrDecodeRequest(data)) { scope.postMessage({ requestId: typeof event.data?.requestId === 'number' ? event.data.requestId : -1, type: 'error' }); return }
  try {
    const found = jsQR(new Uint8ClampedArray(data.pixels), data.width, data.height, { inversionAttempts: 'attemptBoth' })
    scope.postMessage(found ? { requestId: data.requestId, type: 'found', text: found.data } : { requestId: data.requestId, type: 'notFound' })
  } catch { scope.postMessage({ requestId: data.requestId, type: 'error' }) }
}
