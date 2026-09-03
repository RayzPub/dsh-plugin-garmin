import esbuild from 'esbuild'
import fs from 'node:fs'

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const id = pkg.name // "dsh-plugin-garmin"

await esbuild.build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'dist/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
    '@deepseek-ai/*',
    '@cordisjs/*',
    'cordis'
  ],
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;\n`
  },
  footer: {
    js: `\nreturn module.exports;\n} });`
  },
  sourcemap: true
})

console.log('[build-client] dist/client.js successfully bundled for dsh ModuleLoader.')
