import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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
    const manifestName = `${dir}-manifest.json`
    return fs.readdirSync(fullDir)
        .filter(file => file.endsWith('.json') && file !== manifestName)
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

const projects = makeManifest('projects', '/projects')
const keyboards = makeManifest('keyboards', '/keyboards', { useJsonName: true })

fs.writeFileSync(
    path.join(root, 'public', 'projects', 'projects-manifest.json'),
    JSON.stringify(projects, null, 2)
)
fs.writeFileSync(
    path.join(root, 'public', 'keyboards', 'keyboards-manifest.json'),
    JSON.stringify(keyboards, null, 2)
)

console.log(`Generated manifests: ${projects.length} projects, ${keyboards.length} keyboards`)
