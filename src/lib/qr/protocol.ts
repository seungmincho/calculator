export interface QrDecodeRequest { requestId: number; width: number; height: number; pixels: ArrayBuffer }
export type QrDecodeResponse = { requestId: number; type: 'found'; text: string } | { requestId: number; type: 'notFound' | 'error' }
export function isQrDecodeRequest(value: unknown): value is QrDecodeRequest {
  if (!value || typeof value !== 'object') return false
  const data = value as QrDecodeRequest
  return Number.isSafeInteger(data.requestId) && Number.isSafeInteger(data.width) && Number.isSafeInteger(data.height) && data.width > 0 && data.height > 0 && data.width <= 2048 && data.height <= 2048 && data.pixels instanceof ArrayBuffer && data.pixels.byteLength === data.width * data.height * 4
}
