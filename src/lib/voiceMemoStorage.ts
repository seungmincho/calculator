export interface VoiceMemoRecord {
  id: string
  name: string
  duration: number
  timestamp: number
  fileSize: number
  blob: Blob
  transcript: string
}
export const MAX_VOICE_MEMOS = 20

export function isVoiceMemo(value: unknown): value is VoiceMemoRecord {
  if (!value || typeof value !== 'object') return false
  const memo = value as VoiceMemoRecord
  return typeof memo.id === 'string' && !!memo.id && typeof memo.name === 'string' && !!memo.name.trim() && memo.name.length <= 120 &&
    Number.isFinite(memo.duration) && memo.duration >= 0 && Number.isFinite(memo.timestamp) && memo.timestamp > 0 && memo.timestamp <= 8640000000000000 &&
    memo.blob instanceof Blob && memo.blob.size > 0 && memo.blob.size <= 60 * 1024 * 1024 && memo.fileSize === memo.blob.size &&
    typeof memo.transcript === 'string' && memo.transcript.length <= 12000
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('toolhub-voice-memos', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('memos', { keyPath: 'id' })
    request.onerror = request.onblocked = () => reject(new Error('storageFailed'))
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result) }
  })
}

export async function listVoiceMemos(): Promise<VoiceMemoRecord[]> {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('memos').objectStore('memos').getAll()
      request.onerror = () => reject(new Error('storageFailed'))
      request.onsuccess = () => resolve(request.result.filter(isVoiceMemo).sort((a, b) => b.timestamp - a.timestamp))
    })
  } finally { db.close() }
}

export async function saveVoiceMemo(memo: VoiceMemoRecord): Promise<void> {
  if (!isVoiceMemo(memo)) throw new Error('storageFailed')
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('memos', 'readwrite'), store = tx.objectStore('memos')
      let full = false
      const keys = store.getAllKeys()
      keys.onsuccess = () => {
        if (!keys.result.includes(memo.id) && keys.result.length >= MAX_VOICE_MEMOS) { full = true; tx.abort(); return }
        try { store.put(memo) } catch { tx.abort() }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = tx.onabort = () => reject(new Error(full ? 'storageFull' : 'storageFailed'))
    })
  } finally { db.close() }
}

export async function deleteVoiceMemo(id: string): Promise<void> {
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('memos', 'readwrite')
      tx.objectStore('memos').delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = tx.onabort = () => reject(new Error('storageFailed'))
    })
  } finally { db.close() }
}
