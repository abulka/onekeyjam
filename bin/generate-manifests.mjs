import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { unsafeCharsIn } from '../src/lib/filename.js'

/*
Generates manifest files for the static project and keyboard JSON libraries.

Static hosting cannot list a directory, so the app reads these manifests to
discover which files are available. Run automatically before dev and build.
*/

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function makeManifest(dir, urlPrefix, options = {}) {
    const fullDir = path.join(root, 'public', dir)
    if (!fs.existsSync(fullDir))
        return []
    const manifestFile = options.manifestFile ?? `${path.basename(dir)}-manifest.json`
    return fs.readdirSync(fullDir)
        .filter(file => file.endsWith('.json') && file !== manifestFile)
        .sort((a, b) => a.localeCompare(b))
        .map(file => {
            let text = file.replace(/\.json$/, '')
            if (options.useJsonName) {
                // Keyboard configs must be matched against physical MIDI device
                // names, so use the config's own "name" field when present.
                try {
                    const data = JSON.parse(fs.readFileSync(path.join(fullDir, file), 'utf8'))
                    if (typeof data.name === 'string' && data.name)
                        text = data.name
                } catch (e) {
                    console.warn(`Could not read name from ${file}, using filename`)
                }
            }
            return {
                text,
                value: `${urlPrefix}/${encodeURIComponent(file)}`,
                file,
            }
        })
}

/*
Fail the build early (this runs in prebuild, including on Netlify) if any
library file has a name Netlify cannot deploy, such as a `#` or `?`. Netlify
only rejects these at the deploy step, which produces a confusing error, so we
catch it here with a clear message instead.
*/
function assertSafeFilenames() {
    const bad = []
    for (const dir of ['projects/test-songs', 'projects/classic', 'projects/progressions', 'projects/rock', 'projects/multi-key', 'keyboards']) {
        const fullDir = path.join(root, 'public', dir)
        if (!fs.existsSync(fullDir))
            continue
        for (const file of fs.readdirSync(fullDir)) {
            if (!file.endsWith('.json') || file.endsWith('-manifest.json'))
                continue
            const unsafe = unsafeCharsIn(file)
            if (unsafe.length > 0)
                bad.push(`  public/${dir}/${file}  (contains ${unsafe.join(' ')})`)
        }
    }
    if (bad.length > 0) {
        throw new Error(
            `Unsafe library filenames found (Netlify cannot deploy '#', '?' and similar):\n` +
            bad.join('\n') +
            `\nRename them to safe names (for example use 'Gsharp minor' instead of 'G# minor') and regenerate.`
        )
    }
}

assertSafeFilenames()

const testSongs = makeManifest('projects/test-songs', '/projects/test-songs', { manifestFile: 'test-songs-manifest.json' })
const classic = makeManifest('projects/classic', '/projects/classic', { manifestFile: 'classic-manifest.json', useJsonName: true })
const progressions = makeManifest('projects/progressions', '/projects/progressions', { manifestFile: 'progressions-manifest.json', useJsonName: true })
const rock = makeManifest('projects/rock', '/projects/rock', { manifestFile: 'rock-manifest.json', useJsonName: true })
const multiKey = makeManifest('projects/multi-key', '/projects/multi-key', { manifestFile: 'multi-key-manifest.json', useJsonName: true })
const keyboards = makeManifest('keyboards', '/keyboards', { useJsonName: true })

fs.writeFileSync(
    path.join(root, 'public', 'projects', 'test-songs', 'test-songs-manifest.json'),
    JSON.stringify(testSongs, null, 2)
)
fs.writeFileSync(
    path.join(root, 'public', 'projects', 'classic', 'classic-manifest.json'),
    JSON.stringify(classic, null, 2)
)
fs.writeFileSync(
    path.join(root, 'public', 'projects', 'progressions', 'progressions-manifest.json'),
    JSON.stringify(progressions, null, 2)
)
fs.writeFileSync(
    path.join(root, 'public', 'projects', 'rock', 'rock-manifest.json'),
    JSON.stringify(rock, null, 2)
)
fs.writeFileSync(
    path.join(root, 'public', 'projects', 'multi-key', 'multi-key-manifest.json'),
    JSON.stringify(multiKey, null, 2)
)
fs.writeFileSync(
    path.join(root, 'public', 'keyboards', 'keyboards-manifest.json'),
    JSON.stringify(keyboards, null, 2)
)

console.log(`Generated manifests: ${testSongs.length} test-songs projects, ${classic.length} classic projects, ${progressions.length} progressions, ${rock.length} rock projects, ${multiKey.length} multi-key projects, ${keyboards.length} keyboards`)
