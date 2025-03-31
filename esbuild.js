const path = require('path')
const isProduction = process.env.NODE_ENV == 'production'

let entryPlugin = {
  name: 'entry',
  setup(build) {
    build.onResolve({filter: /^(index|server)\.ts$/}, args => {
      return {
        path: args.path,
        namespace: 'entry-ns'
      }
    })
    build.onLoad({filter: /.*/, namespace: 'entry-ns'}, args => {
      let contents = ''
      if (args.path == 'index.ts') {
        contents = `
        import {activate} from './src/extension'
        export {activate}
        `
      } else if (args.path == 'server.ts') {
        contents = `require('./server/eslintServer')`
      } else {
        throw new Error('Bad path')
      }
      return {
        contents,
        resolveDir: __dirname
      }
    })
  }
}

async function start() {
  await require('esbuild').build({
    entryPoints: ['index.ts', 'server.ts'],
    define: {'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')},
    bundle: true,
    platform: 'node',
    target: 'node16.18',
    mainFields: ['module', 'main'],
    minify: isProduction,
    sourcemap: !isProduction,
    external: ['coc.nvim'],
    outdir: path.resolve(__dirname, 'lib'),
    plugins: [entryPlugin]
  })
}

start().catch(e => {
  console.error(e)
})
