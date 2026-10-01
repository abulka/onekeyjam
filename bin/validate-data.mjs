// @ts-check
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv'

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
        dir: join(root, 'public/projects'),
    },
    {
        label: 'keyboard',
        schema: loadJson(join(root, 'schemas/keyboard.schema.json')),
        dir: join(root, 'public/keyboards'),
    },
]

let failures = 0
let checked = 0

for (const target of targets) {
    const validate = ajv.compile(target.schema)
    const files = readdirSync(target.dir)
        .filter((file) => file.endsWith('.json') && !file.endsWith('-manifest.json'))
        .sort()

    for (const file of files) {
        checked++
        const data = loadJson(join(target.dir, file))
        if (!validate(data)) {
            failures++
            console.error(`✗ ${target.label}: ${file}`)
            for (const err of validate.errors ?? []) {
                console.error(`    ${err.instancePath || '/'} ${err.message}`)
            }
        }
    }
}

if (failures > 0) {
    console.error(`\n${failures} of ${checked} files failed validation.`)
    process.exit(1)
}

console.log(`Validated ${checked} files against their schemas - all OK.`)
