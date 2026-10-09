// @ts-check
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv'
import { unsafeCharsIn } from '../src/lib/filename.js'

const root = fileURLToPath(new URL('..', import.meta.url))

/** @param {string} path */
function loadJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'))
}

const ajv = new Ajv({ allErrors: true, strict: false })

const targets = [
    {
        label: 'project',
        schema: loadJson(join(root, 'schemas/project.schema.json')),
        dirs: [
            join(root, 'public/projects/featured'),
            join(root, 'public/projects/classic'),
            join(root, 'public/projects/progressions'),
            join(root, 'public/projects/rock'),
            join(root, 'public/projects/multi-key'),
        ],
    },
    {
        label: 'keyboard',
        schema: loadJson(join(root, 'schemas/keyboard.schema.json')),
        dirs: [join(root, 'public/keyboards')],
    },
]

let failures = 0
let checked = 0

for (const target of targets) {
    const validate = ajv.compile(target.schema)
    for (const dir of target.dirs) {
        let files = []
        try {
            files = readdirSync(dir)
        } catch (e) {
            continue
        }
        files = files.filter((file) => file.endsWith('.json') && !file.endsWith('-manifest.json')).sort()

        for (const file of files) {
            checked++
            const unsafe = unsafeCharsIn(file)
            if (unsafe.length > 0) {
                failures++
                console.error(`✗ ${target.label}: ${file} - unsafe filename character(s): ${unsafe.join(' ')}`)
                continue
            }
            const data = loadJson(join(dir, file))
            if (!validate(data)) {
                failures++
                console.error(`✗ ${target.label}: ${file}`)
                for (const err of validate.errors ?? []) {
                    console.error(`    ${err.instancePath || '/'} ${err.message}`)
                }
            }
        }
    }
}

if (failures > 0) {
    console.error(`\n${failures} of ${checked} files failed validation.`)
    process.exit(1)
}

console.log(`Validated ${checked} files against their schemas - all OK.`)
