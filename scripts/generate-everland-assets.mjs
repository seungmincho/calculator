import { build } from 'esbuild'
import { mkdir } from 'node:fs/promises'
await mkdir('public/everland-assets',{recursive:true})
await build({entryPoints:['src/entries/everland-client.tsx'],outfile:'public/everland-assets/planner.js',bundle:true,minify:true,format:'esm',platform:'browser',target:['es2020'],define:{'process.env.NODE_ENV':'"production"'},tsconfig:'tsconfig.json',logLevel:'warning'})
console.log('Everland browser assets generated')
