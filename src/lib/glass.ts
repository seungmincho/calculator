/**
 * Liquid Glass design system tokens.
 *
 * Usage in components:
 *   import { glassCard, glassInset, glassInput } from '@/lib/glass'
 *   <div className={`${glassCard} ${glassInset} p-6`}>...</div>
 *
 * Guide: docs/glass-design-guide.md
 */

/** Main card surface — translucent frosted panel */
export const glassCard =
  'bg-white/60 dark:bg-white/[0.10] backdrop-blur-2xl border border-white/65 dark:border-white/[0.14] rounded-[28px] shadow-[0_24px_80px_rgba(59,130,246,0.12)] dark:shadow-[0_24px_80px_rgba(2,6,23,0.52),0_0_0_1px_rgba(255,255,255,0.04)]'

/** Inner highlight/depth shadow — stack on top of glassCard */
export const glassInset =
  'shadow-[inset_1px_1px_10px_rgba(255,255,255,0.30),inset_0_-1px_10px_rgba(255,255,255,0.10)] dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.14),inset_0_1px_18px_rgba(255,255,255,0.06),inset_0_-12px_24px_rgba(0,0,0,0.22)]'

/** Input field — glass variant */
export const glassInput =
  'w-full rounded-2xl border border-white/55 dark:border-white/[0.12] bg-white/70 dark:bg-white/[0.08] backdrop-blur-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/50 transition-all'

/** Page fixed background with 5 color blobs */
export const pageBackground = `
  <div class="fixed inset-0 -z-10">
    <div class="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/60 to-slate-50 dark:hidden" />
    <div class="absolute inset-0 hidden dark:block" style="background: linear-gradient(160deg, #080d1a 0%, #0c1120 50%, #0a0f1c 100%)" />
    <div class="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-50 dark:opacity-70" style="background: radial-gradient(circle, rgba(59,130,246,0.30) 0%, transparent 70%)" />
    <div class="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none opacity-40 dark:opacity-55" style="background: radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)" />
    <div class="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-30 dark:opacity-40" style="background: radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)" />
    <div class="absolute bottom-1/4 left-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none opacity-35 dark:opacity-50" style="background: radial-gradient(circle, rgba(245,158,11,0.20) 0%, transparent 70%)" />
    <div class="absolute bottom-0 right-0 w-[450px] h-[450px] rounded-full blur-3xl pointer-events-none opacity-40 dark:opacity-55" style="background: radial-gradient(circle, rgba(59,130,246,0.22) 0%, transparent 70%)" />
  </div>
`
