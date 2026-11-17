/** One attempt owns resources. Adoption after cancellation closes the late resource immediately. */
export function createScreenRecordingOwner() {
  let released = false
  const tracks = new Set<MediaStreamTrack>(), contexts = new Set<Pick<AudioContext, 'close'>>(), cleanups = new Set<() => void>()
  const stoppedTracks = new WeakSet<MediaStreamTrack>()
  let recorder: MediaRecorder | null = null
  const stopTrack = (track: MediaStreamTrack) => { if (stoppedTracks.has(track)) return; stoppedTracks.add(track); try { track.stop() } catch { /* Continue releasing the rest. */ } }
  const closeContext = (context: Pick<AudioContext, 'close'>) => { try { void context.close().catch(() => {}) } catch { /* Other resources still need release. */ } }
  const closeRecorder = (record: MediaRecorder) => {
    record.ondataavailable = null; record.onstop = null; record.onerror = null; record.onstart = null; record.onpause = null; record.onresume = null
    try { if (record.state !== 'inactive') record.stop() } catch { /* Streams are released independently. */ }
  }
  return {
    get released() { return released },
    stream(stream: MediaStream): boolean {
      if (released) { stream.getTracks().forEach(stopTrack); return false }
      stream.getTracks().forEach(track => tracks.add(track)); return true
    },
    context(context: Pick<AudioContext, 'close'>): boolean {
      if (released) { closeContext(context); return false }
      contexts.add(context); return true
    },
    recorder(record: MediaRecorder): boolean {
      if (released) { closeRecorder(record); return false }
      if (recorder && recorder !== record) closeRecorder(recorder)
      recorder = record; return true
    },
    cleanup(callback: () => void): boolean {
      if (released) { try { callback() } catch { /* Cleanup is best effort. */ } return false }
      cleanups.add(callback); return true
    },
    release() {
      if (released) return
      released = true
      cleanups.forEach(callback => { try { callback() } catch { /* Continue remaining cleanup. */ } }); cleanups.clear()
      if (recorder) closeRecorder(recorder); recorder = null
      tracks.forEach(stopTrack); tracks.clear(); contexts.forEach(closeContext); contexts.clear()
    },
  }
}
