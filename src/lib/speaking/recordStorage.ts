import { MAX_SESSIONS } from './core.ts'
import {
  captureSpeakingBasis, inspectSpeakingRecords, isSpeakingStoredBasis, matchesSpeakingBasis,
  prepareSpeakingRecord, speakingRecordStatus,
  type SpeakingRecord, type SpeakingRecordList, type SpeakingStoredBasis, type SpeakingStoredRecord,
} from './records.ts'

const DB_NAME = 'toolhub-speaking-practice'
const STORE = 'sessions'

function storageError(error: unknown, fallback = 'storageFailed'): Error {
  if (error instanceof Error && error.message.startsWith('storage')) return error
  const name = error && typeof error === 'object' && 'name' in error ? error.name : ''
  return new Error(name === 'QuotaExceededError' ? 'storageQuota' : name === 'AbortError' ? 'storageAborted' : fallback)
}

/** Request errors can bubble before IDB sets transaction.error. */
function transactionError(tx: IDBTransaction, event: Event): unknown {
  const target = event.target
  return target && 'error' in target ? target.error ?? tx.error : tx.error
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false
    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      reject(storageError(error))
    }
    let request: IDBOpenDBRequest
    try { request = indexedDB.open(DB_NAME, 1) }
    catch (error) { fail(error); return }
    request.onupgradeneeded = () => {
      if (settled) { request.transaction?.abort(); return }
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    request.onerror = () => fail(request.error)
    request.onblocked = () => fail(new Error('storageBlocked'))
    request.onsuccess = () => {
      const db = request.result
      if (settled) { db.close(); return }
      settled = true
      db.onversionchange = () => db.close()
      resolve(db)
    }
  })
}

export async function listSpeakingSessions(): Promise<SpeakingRecordList> {
  const db = await database()
  try {
    return await new Promise<SpeakingRecordList>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).getAll()
      let values: unknown[] | undefined
      let failure: Error | null = null
      request.onsuccess = () => { values = request.result }
      tx.oncomplete = () => failure ? reject(failure) : values ? resolve(inspectSpeakingRecords(values)) : reject(new Error('storageFailed'))
      tx.onerror = event => {
        const cause = transactionError(tx, event)
        if (cause) failure = storageError(cause)
      }
      tx.onabort = () => reject(failure ?? storageError(tx.error, 'storageAborted'))
    })
  } catch (error) { throw storageError(error) }
  finally { db.close() }
}

function targetError(current: unknown, expected: SpeakingStoredBasis): Error | null {
  if (expected.kind !== 'absent' && current !== undefined) {
    const status = speakingRecordStatus(current)
    if (status !== 'valid') return new Error(status === 'unsupported' ? 'storageUnsupported' : 'storageCorrupt')
  }
  return matchesSpeakingBasis(current, expected) ? null : new Error('storageConflict')
}

export async function saveSpeakingSession(session: SpeakingRecord, expected: SpeakingStoredBasis): Promise<SpeakingStoredRecord> {
  if (!isSpeakingStoredBasis(expected)) throw new Error('storageFailed')
  let snapshot: SpeakingRecord
  try { snapshot = prepareSpeakingRecord(session, crypto.randomUUID(), Date.now()) }
  catch (error) { throw storageError(error) }
  const basis = { ...expected }
  const db = await database()
  try {
    return await new Promise<SpeakingStoredRecord>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite'), store = tx.objectStore(STORE)
      let failure: Error | null = null
      let wrote = false
      const abort = (error: unknown) => {
        failure = storageError(error)
        try { tx.abort() } catch { reject(failure) }
      }
      const put = () => {
        try {
          const write = store.put(snapshot)
          write.onsuccess = () => { wrote = true }
          write.onerror = () => { failure = storageError(write.error) }
        } catch (error) { abort(error) }
      }
      const read = store.get(snapshot.id)
      read.onsuccess = () => {
        const error = targetError(read.result, basis)
        if (error) { abort(error); return }
        if (basis.kind !== 'absent') { put(); return }
        const count = store.count()
        count.onsuccess = () => {
          if (count.result >= MAX_SESSIONS) { abort(new Error('storageFull')); return }
          put()
        }
      }
      tx.oncomplete = () => failure ? reject(failure) : wrote
        ? resolve({ session: snapshot, basis: captureSpeakingBasis(snapshot) })
        : reject(new Error('storageFailed'))
      tx.onerror = event => {
        const cause = transactionError(tx, event)
        if (!failure && cause) failure = storageError(cause)
      }
      tx.onabort = () => reject(failure ?? storageError(tx.error, 'storageAborted'))
    })
  } catch (error) { throw storageError(error) }
  finally { db.close() }
}

export async function deleteSpeakingSession(id: string, expected: SpeakingStoredBasis): Promise<void> {
  if (!id || !isSpeakingStoredBasis(expected) || expected.kind === 'absent') throw new Error('storageFailed')
  const basis = { ...expected }
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite'), store = tx.objectStore(STORE)
      let failure: Error | null = null
      let deleted = false
      const read = store.get(id)
      read.onsuccess = () => {
        failure = targetError(read.result, basis)
        if (failure) { tx.abort(); return }
        try {
          const removal = store.delete(id)
          removal.onsuccess = () => { deleted = true }
          removal.onerror = () => { failure = storageError(removal.error) }
        } catch (error) { failure = storageError(error); tx.abort() }
      }
      tx.oncomplete = () => failure ? reject(failure) : deleted ? resolve() : reject(new Error('storageFailed'))
      tx.onerror = event => {
        const cause = transactionError(tx, event)
        if (!failure && cause) failure = storageError(cause)
      }
      tx.onabort = () => reject(failure ?? storageError(tx.error, 'storageAborted'))
    })
  } catch (error) { throw storageError(error) }
  finally { db.close() }
}
