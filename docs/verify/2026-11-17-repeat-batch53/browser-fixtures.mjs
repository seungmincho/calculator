// Representative opaque sRGB values with hand-derived integer conversion expectations.
export const colorExamples = [
  { raw: '#000', canonical: '#000000', rgb: [0, 0, 0], hsl: [0, 0, 0], hsv: [0, 0, 0], cmyk: [0, 0, 0, 100] },
  { raw: 'fff', canonical: '#FFFFFF', rgb: [255, 255, 255], hsl: [0, 0, 100], hsv: [0, 0, 100], cmyk: [0, 0, 0, 0] },
  { raw: ' #aBc ', canonical: '#AABBCC', rgb: [170, 187, 204], hsl: [210, 25, 73], hsv: [210, 17, 80], cmyk: [17, 8, 0, 20] },
  { raw: '#ff0000', canonical: '#FF0000', rgb: [255, 0, 0], hsl: [0, 100, 50], hsv: [0, 100, 100], cmyk: [0, 100, 100, 0] },
  { raw: '00ff00', canonical: '#00FF00', rgb: [0, 255, 0], hsl: [120, 100, 50], hsv: [120, 100, 100], cmyk: [100, 0, 100, 0] },
  { raw: '#0000FF', canonical: '#0000FF', rgb: [0, 0, 255], hsl: [240, 100, 50], hsv: [240, 100, 100], cmyk: [100, 100, 0, 0] },
]
export const invalidColorExamples = ['', '#12', '#abcd', '#12345678', '#12345z', 'rgb(255,0,0)', 'var(--secret-color)', '#abcdef'.repeat(100)]

export async function installColorPorts(context, holdRestore = false) {
  await context.addInitScript(holdRestore => {
    if (!/^https?:$/.test(location.protocol)) return
    const random = Math.random, replace = history.replaceState.bind(history), fill = CanvasRenderingContext2D.prototype.fillText
    window.__colorRandom = null; window.__colorHistoryMode = 'native'; window.__colorDrawText = []; window.__colorHistory = []
    Math.random = () => window.__colorRandom === null ? random() : window.__colorRandom
    history.replaceState = (state, unused, url) => {
      window.__colorHistory.push({ url: String(url), state })
      if (window.__colorHistoryMode === 'throw') throw new DOMException('Synthetic history denial', 'SecurityError')
      return replace(state, unused, url)
    }
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) { window.__colorDrawText.push(String(text)); return fill.call(this, text, ...args) }
    const timeout = window.setTimeout.bind(window), clear = window.clearTimeout.bind(window)
    window.__colorRestore = []
    window.setTimeout = (callback, delay, ...args) => {
      if (!holdRestore || typeof callback !== 'function' || callback.name !== 'restoreInitialColor') return timeout(callback, delay, ...args)
      const entry = { callback, canceled: false }; entry.id = timeout(() => {}, 0); window.__colorRestore.push(entry); return entry.id
    }
    window.clearTimeout = id => { const entry = window.__colorRestore.find(item => item.id === id); if (entry) entry.canceled = true; return clear(id) }
    window.__releaseColorRestore = () => { const entries = window.__colorRestore.splice(0); for (const entry of entries) if (!entry.canceled) entry.callback() }
  }, holdRestore)
}
