import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import type { Plugin } from 'vite'

// The optimiser owns public files in UIResources/foae.
// Keep those trees between builds so cached assets do not have to be copied
// back out after every Vite run.
function cleanBuildOutputButKeepPublicFiles(): Plugin {
  let outDir: string
  const preservedDirs = new Set(['assets', 'mods', 'sdk'])

  return {
    name: 'clean-build-output-but-keep-public-files',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    buildStart() {
      if (!fs.existsSync(outDir)) return

      for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
        const full = path.join(outDir, entry.name)
        if (entry.isDirectory() && preservedDirs.has(entry.name)) continue
        fs.rmSync(full, { recursive: true, force: true })
      }

      const assetsDir = path.join(outDir, 'assets')
      if (!fs.existsSync(assetsDir)) return

      for (const entry of fs.readdirSync(assetsDir, { withFileTypes: true })) {
        if (!entry.isFile()) continue
        if (/\.(css|js|map)$/i.test(entry.name)) {
          fs.rmSync(path.join(assetsDir, entry.name), { force: true })
        }
      }
    },
  }
}

function preservedModuleFileName(name: string, facadeModuleId: string | null | undefined): string {
  if (facadeModuleId && !facadeModuleId.startsWith('\0')) {
    const modulePath = facadeModuleId.split('?', 1)[0]
    if (/\.[cm]?[jt]sx?$/i.test(modulePath)) {
      const relativePath = path.relative(__dirname, modulePath)
      if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
        return relativePath
          .replaceAll(path.sep, '/')
          .replace(/\.[cm]?[jt]sx?$/i, '.js')
      }
    }
  }

  const safeName = name.replace(/[^A-Za-z0-9._-]/g, '_')
  return `_virtual/${safeName}-[hash].js`
}

function conciseBuildSummary(): Plugin {
  let outDir: string

  return {
    name: 'concise-build-summary',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      let jsFiles = 0
      let cssFiles = 0
      let codeBytes = 0
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) walk(full)
          else if (entry.name.endsWith('.js')) {
            jsFiles += 1
            codeBytes += fs.statSync(full).size
          } else if (entry.name.endsWith('.css')) {
            cssFiles += 1
            codeBytes += fs.statSync(full).size
          }
        }
      }
      walk(outDir)
      console.log(`WebUI code bundle: ${jsFiles} JS modules, ${cssFiles} CSS file, ${(codeBytes / 1024 / 1024).toFixed(1)} MB`)
    },
  }
}

/**
 * Serves generated prefiltered image variants during `vite dev`.
 *
 * The optimiser publishes these files to UIResources/foae/assets so
 * the source public tree stays clean. Runtime code still needs to exercise the
 * same sized asset paths while developing against Vite.
 */
function serveOptimisedAssetVariants(): Plugin {
  const ASSET_URL_PREFIX = '/assets/'
  const GENERATED_SEGMENT = '/__sizes/'
  const MIME: Record<string, string> = {
    '.webp': 'image/webp',
  }

  return {
    name: 'serve-optimised-asset-variants',
    apply: 'serve',
    configureServer(server) {
      const publishedAssetsDir = path.resolve(server.config.root, '../UIResources/foae/assets')

      server.middlewares.use((req, res, next) => {
        if (!req.url) return next()

        const url = req.url.split('?')[0]
        if (!url.startsWith(ASSET_URL_PREFIX) || !url.includes(GENERATED_SEGMENT)) {
          return next()
        }

        let rel: string
        try {
          rel = decodeURIComponent(url.slice(ASSET_URL_PREFIX.length))
        } catch {
          res.statusCode = 400
          res.end('Bad request')
          return
        }

        const filePath = path.resolve(publishedAssetsDir, rel)
        const relative = path.relative(publishedAssetsDir, filePath)
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          res.statusCode = 400
          res.end('Bad request')
          return
        }

        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          return next()
        }

        const ext = path.extname(filePath).toLowerCase()
        res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-store')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

/**
 * Serves the game's external Mods directory during `vite dev`.
 *
 * Layout expected on disk (relative to the project root, sibling of WebUI/):
 *
 *   Mods/
 *     <ModId>/
 *       mod.json          # required - has the optional `webui` block below
 *       dist/index.js     # the built mod entry (for WebUI mods)
 *       dist/style.css    # optional
 *
 * mod.json extension for WebUI mods:
 *   {
 *     "id": "my_mod",
 *     "name": "My Mod",
 *     ...
 *     "webui": {
 *       "entry": "dist/index.js",
 *       "styles": ["dist/style.css"]
 *     }
 *   }
 *
 * The plugin intercepts /mods/manifest.json (returns a synthesized manifest
 * containing every mod.json that declares a `webui` block) and /mods/<id>/*
 * (serves the file from the mod directory). In production, the shipped web UI
 * subsystem has to replicate this contract on the C++ side, reading from
 * the installed game's Mods/ folder. The JS-side loader in src/mods/index.ts
 * doesn't change.
 */
function serveExternalMods(): Plugin {
  const MODS_URL_PREFIX = '/mods/'
  const MANIFEST_URL = '/mods/manifest.json'

  function modsDirCandidates(projectRoot: string): string[] {
    return [
      path.resolve(projectRoot, '../Mods'),
      path.resolve(projectRoot, '../../Mods'),
    ]
  }

  function resolveModsDir(projectRoot: string): string | null {
    for (const candidate of modsDirCandidates(projectRoot)) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        return candidate
      }
    }
    return null
  }

  interface ModWebUIBlock {
    entry: string
    styles?: string[]
  }
  interface ModJson {
    id?: string
    name?: string
    webui?: ModWebUIBlock
  }

  function readManifest(modsDir: string): Array<{ name: string; entry: string; styles?: string[] }> {
    const out: Array<{ name: string; entry: string; styles?: string[] }> = []
    for (const entry of fs.readdirSync(modsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const modJsonPath = path.join(modsDir, entry.name, 'mod.json')
      if (!fs.existsSync(modJsonPath)) continue
      let mod: ModJson
      try {
        mod = JSON.parse(fs.readFileSync(modJsonPath, 'utf-8'))
      } catch (e) {
        console.warn(`[mods] ${entry.name}/mod.json is invalid JSON:`, (e as Error).message)
        continue
      }
      if (!mod.webui?.entry) continue
      const id = mod.id ?? entry.name
      out.push({
        name: mod.name ?? id,
        entry: `${MODS_URL_PREFIX}${entry.name}/${mod.webui.entry}`,
        styles: mod.webui.styles?.map(s => `${MODS_URL_PREFIX}${entry.name}/${s}`),
      })
    }
    return out
  }

  const MIME: Record<string, string> = {
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }

  return {
    name: 'serve-external-mods',
    configureServer(server) {
      const projectRoot = server.config.root
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next()
        const url = req.url.split('?')[0]
        if (!url.startsWith(MODS_URL_PREFIX)) return next()

        const modsDir = resolveModsDir(projectRoot)
        if (!modsDir) {
          // No Mods/ directory on disk yet - return an empty manifest or 404.
          if (url === MANIFEST_URL) {
            res.setHeader('Content-Type', MIME['.json'])
            res.end('[]')
            return
          }
          res.statusCode = 404
          res.end('No Mods directory')
          return
        }

        if (url === MANIFEST_URL) {
          const manifest = readManifest(modsDir)
          res.setHeader('Content-Type', MIME['.json'])
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(manifest, null, 2))
          return
        }

        // /mods/<id>/<path> -> <modsDir>/<id>/<path>
        const rel = url.slice(MODS_URL_PREFIX.length)
        // Reject any traversal attempts before joining with the mods dir.
        if (rel.includes('..')) {
          res.statusCode = 400
          res.end('Bad request')
          return
        }
        const filePath = path.join(modsDir, rel)
        if (!filePath.startsWith(modsDir)) {
          res.statusCode = 400
          res.end('Bad request')
          return
        }
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          res.statusCode = 404
          res.end('Not found')
          return
        }
        const ext = path.extname(filePath).toLowerCase()
        res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-store')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

// Game UI runs locally in Webkiln/CEF and already ships unminified app modules
// (minify: false). Resolve React to its development builds so Unreal logs show
// full exception text and component stacks instead of "Minified React error #N".
// Prefix-safe exact matches only — a bare "react" alias would also rewrite
// "react/jsx-runtime" and break the package entrypoints.
const nodeModulesDir = path.resolve(__dirname, 'node_modules')
const reactDevelopmentAliases = [
  {
    find: /^react$/,
    replacement: path.join(nodeModulesDir, 'react/cjs/react.development.js'),
  },
  {
    find: /^react\/jsx-runtime$/,
    replacement: path.join(nodeModulesDir, 'react/cjs/react-jsx-runtime.development.js'),
  },
  {
    find: /^react\/jsx-dev-runtime$/,
    replacement: path.join(nodeModulesDir, 'react/cjs/react-jsx-dev-runtime.development.js'),
  },
  {
    find: /^react-dom$/,
    replacement: path.join(nodeModulesDir, 'react-dom/cjs/react-dom.development.js'),
  },
  {
    find: /^react-dom\/client$/,
    replacement: path.join(nodeModulesDir, 'react-dom/cjs/react-dom-client.development.js'),
  },
  {
    find: /^scheduler$/,
    replacement: path.join(nodeModulesDir, 'scheduler/cjs/scheduler.development.js'),
  },
] as const

const NESTED_UPDATE_DEPTH_MESSAGE =
  'Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.'

/**
 * Annotate React's nested-update throw with the fiber path that scheduled the
 * overflowing update. React clears that context before the Error reaches
 * createRoot onUncaughtError, so without this the Unreal log only shows the
 * generic message.
 */
function annotateReactNestedUpdateErrors(): Plugin {
  return {
    name: 'annotate-react-nested-update-errors',
    enforce: 'pre',
    transform(code, id) {
      const normalised = id.replaceAll('\\', '/')
      if (!normalised.includes('react-dom-client.development')) {
        return null
      }
      if (code.includes('Culprit fiber:')) {
        return null
      }
      if (!code.includes(NESTED_UPDATE_DEPTH_MESSAGE)) {
        return null
      }

      const fiberPathHelper = `(function (fiber) {
            var names = [];
            for (var node = fiber; node != null && names.length < 16; node = node.return) {
              var name = typeof getComponentNameFromFiber === "function"
                ? getComponentNameFromFiber(node)
                : null;
              if (name && names[names.length - 1] !== name) {
                names.push(name);
              }
            }
            return names.length ? names.join(" < ") : "Unknown";
          })(sourceFiber)`

      const next = code.replace(
        /Error\(\s*"Maximum update depth exceeded\. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate\. React limits the number of nested updates to prevent infinite loops\."\s*\)/,
        `Error(${JSON.stringify(`${NESTED_UPDATE_DEPTH_MESSAGE} Culprit fiber: `)} + ${fiberPathHelper})`,
      )

      if (next === code) {
        return null
      }

      return { code: next, map: null }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [
    annotateReactNestedUpdateErrors(),
    cleanBuildOutputButKeepPublicFiles(),
    serveOptimisedAssetVariants(),
    react(),
    conciseBuildSummary(),
    serveExternalMods(),
  ],
  resolve: {
    alias: [...reactDevelopmentAliases],
  },
  // Keep React's own development-branch checks enabled inside the development
  // builds (extra warnings, invariant text). App code should still prefer
  // import.meta.env.DEV / PROD for Vite mode checks.
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  build: {
    modulePreload: { polyfill: false },
    outDir: path.resolve(__dirname, '../UIResources/foae'),
    emptyOutDir: false,
    copyPublicDir: false,
    minify: false,
    sourcemap: 'hidden' as const,
    reportCompressedSize: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: chunkInfo => preservedModuleFileName(chunkInfo.name, chunkInfo.facadeModuleId),
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
}))
