#! /usr/bin/env node

import { unserializePHP } from './unserializePHP.js'
import { stringify } from './utils.js'


async function main() {
    const args = process.argv.slice(2)
    const shouldDecodeBase64 = args.some(arg => arg === '--decode=base64')
    const isHelp = args.some(arg => arg === '--help')
    
    if (isHelp) {
        process.stdout.write(printHelp())
        return 0
    }

    let data = ''
    for await (const chunk of process.stdin) {
        data += chunk
    }
    
    let output = ''
    if (shouldDecodeBase64) {
        output = unserializePHP(data, { decode: 'base64' })
    } else {
        output = unserializePHP(data)
    }

    process.stdout.write(stringify(output))
}

/**
 * @returns {string}
 */
function printHelp() {
    return `Supports unserializing PHP data into a JS object that can be parsed into JSON for further processing. 

Usage:
    > echo 'O:11:"MyClass":2:{s:3:"foo";s:3:"bar";s:3:"baz";i:123;}' | php2json
Flags:
    --decode=base64 - Decode Base64 string into UTF-8 before processing.`
}

// MARK: Main
main()