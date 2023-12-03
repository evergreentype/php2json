import { decode64 } from "./utils.js"


// MARK: Types
/** @typedef {string|number|boolean|null|["RECURSION_TOKEN", number]|["OBJECT_TOKEN", string]} Token */


// MARK: Helpers
/**
 * @param {string} str 
 * @returns {[string?, string]}
 */
function tokenizeString(str) {
    if (str[0] !== '"') {
        return [undefined, str]
    }
    str = str.slice(1)

    let tempStr = ''
    for (const c of str) {
        if (c === '"') {
            break
        } else {
            tempStr += c
        }
    }

    const rest = str.slice(tempStr.length + 1)
    return [tempStr, rest]
}


// MARK: Lexer
const ARRAY_TOKEN = 'ARRAY_TOKEN'
const OBJECT_TOKEN = 'OBJECT_TOKEN'
const RECURSION_TOKEN = 'RECURSION_TOKEN'

/**
 * @param {string} str 
 * @returns {Array<Token>}
 */
function lexer(str) {
    let tokens = []
    let token = null

    const WHITESPACE = [' ', '\n']
    const SYNTAX = ['{', '}', '[', ']', ':', ',', ';']

    const lexers = [lexString, lexNumber, lexBool, lexNull, lexRecursion, lexArray, lexObject, lexEnum]
    while (str.length > 0) {
        let i = 0
        while (i < lexers.length) {
            [token, str] = lexers[i](str)

            if (token !== undefined) {
                tokens.push(token)
                i = 0
                continue
            }
            i++
        }

        if (WHITESPACE.includes(str[0])) {
            str = str.slice(1)
        } else if (SYNTAX.includes(str[0])) {
            tokens.push(str[0])
            str = str.slice(1)
        } else if (str.length > 0) {
            throw Error(`Unexpected token: ${str[0]}`)
        }
    }

    return tokens
}

/**
 * @param {string} str 
 * @returns {[['OBJECT_TOKEN', string]?, string]}
 */
function lexObject(str) {
    if (str[0] !== 'O' || str[1] !== ':') {
        return [undefined, str]
    }

    str = str.slice(2);

    [, str] = lexSize(str);

    if (str[0] !== ':') {
        throw Error(`Expected: ":", found: "${str[0]}"`)
    }

    const [name, rest] = tokenizeString(str.slice(1))
    str = rest

    if (str[0] !== ':') {
        throw Error(`Expected: ":", found: "${str[0]}"`)
    }

    [, str] = lexSize(str.slice(1))

    if (str[0] !== ':') {
        throw Error(`Expected: ":", found: "${str[0]}"`)
    }

    return [[OBJECT_TOKEN, name], str.slice(1)]
}

/**
 * @param {string} str 
 * @returns {['ARRAY_TOKEN'?, string]}
 */
function lexArray(str) {
    if (str[0] !== 'a' || str[1] !== ':') {
        return [undefined, str]
    }

    str = str.slice(2);

    [, str] = lexSize(str)

    if (str[0] !== ':') {
        throw Error(`Expected: ":", found: "${str[0]}"`)
    }

    return [ARRAY_TOKEN, str.slice(1)]
}

/**
 * @param {string} str 
 * @returns {[number?, string]}
 */
function lexSize(str) {
    const numberChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    let size = ''
    for (const c of str) {
        if (numberChars.includes(c)) {
            size += c
        } else {
            break
        }
    }
    str = str.slice(size.length)

    return [Number(size), str]
}

/**
 * @param {string} str 
 * @returns {[boolean?, string]}
 */
function lexBool(str) {
    if (str[0] !== 'b' || str[1] !== ':' || str[3] !== ';') {
        return [undefined, str]
    }

    switch (str[2]) {
        case '0': return [false, str.slice(4)]
        case '1': return [true, str.slice(4)]
    }

    throw Error(`Incorrect boolean value, got: ${str[2]}`)
}

/**
 * @param {string} str 
 * @returns {[string?, string]}
 */
function lexString(str) {
    if (str[0] !== 's' || str[1] !== ':') {
        return [undefined, str]
    }

    str = str.slice(2)

    let size = null;
    [size, str] = lexSize(str)

    if (str[0] !== ':') {
        throw Error('Semicolon must follow the size')
    }

    str = str.slice(1)
    const sizedStr = str.slice(1, size + 1)
    const nextChar = str[size + 1]
    if (nextChar !== '"') {
        throw Error(`String not properly encoded or wrong string size ${size}, got: ${sizedStr} followed by ${nextChar}`)
    }

    if (str[size + 2] !== ';') {
        throw Error('String not closed')
    }

    return [sizedStr, str.slice(size + 3)]
}

/**
 * @param {string} str 
 * @returns {[string?, string]}
 */
function lexEnum(str) {
    if (str[0] !== 'E' || str[1] !== ':') {
        return [undefined, str]
    }

    str = str.slice(2)

    let size = null;
    [size, str] = lexSize(str)

    if (str[0] !== ':') {
        throw Error('Semicolon must follow the size')
    }

    str = str.slice(1)
    const sizedStr = str.slice(1, size + 1)
    const nextChar = str[size + 1]
    if (nextChar !== '"') {
        throw Error(`Enum not properly encoded or wrong string size ${size}, got: ${sizedStr} followed by ${nextChar}`)
    }

    if (str[size + 2] !== ';') {
        throw Error('Enum not closed')
    }

    return [sizedStr, str.slice(size + 3)]
}

/**
 * @param {string} str 
 * @returns {[number?, string]}
 */
function lexNumber(str) {
    if (str[0] !== 'i' && str[0] !== 'd' || str[1] !== ':') {
        return [undefined, str]
    }

    const NUMBER_CHARS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '.']

    str = str.slice(2)
    let tempNumber = ''

    for (const c of str) {
        if (NUMBER_CHARS.includes(c)) {
            tempNumber += c
        } else {
            break
        }
    }

    if (tempNumber.length === 0) {
        return [undefined, str]
    }

    const rest = str.slice(tempNumber.length)

    if (rest[0] !== ';') {
        throw Error('Number not closed')
    }

    return [Number(tempNumber), rest.slice(1)]
}

/**
 * @param {string} str 
 * @returns {[string?, string]}
 */
function lexRecursion(str) {
    if (str[0] !== 'r' || str[1] !== ':') {
        return [undefined, str]
    }

    str = str.slice(2);

    const [refIndex, rest] = lexSize(str)
    str = rest

    if (str[0] !== ';') {
        throw Error('Recursion not closed')
    }

    return [[RECURSION_TOKEN, refIndex], str.slice(1)]
}

/**
 * @param {string} str 
 * @returns {[null|undefined, string]}
 */
function lexNull(str) {
    if (str[0] !== 'N' || str[1] !== ';') {
        return [undefined, str]
    }

    return [null, str.slice(2)]
}


// MARK: Parser
/**
 * @param {Array<Token>} tokens 
 * @param {Array<object>} refTable 
 * @returns {[any, Array<Token>]}
 */
function parser(tokens, refTable = []) {
    const token = tokens[0]

    if (token === ARRAY_TOKEN) {
        return parserArray(tokens, refTable)
    }

    if (Array.isArray(token) && token[0] === OBJECT_TOKEN) {
        return parserObject(tokens, refTable)
    }

    return [token, tokens.slice(1)]
}

/**
 * @param {Array<Token>} tokens 
 * @param {Array<object>} refTable 
 * @returns {[array|object, Array<Token>]}
 */
function parserArray(tokens, refTable) {
    let isAssociativeArray = false
    let elements = []

    tokens = tokens.slice(2)

    let key = null
    let el = null
    while (true) {
        if (tokens[0] === '}') {
            tokens = tokens[1] === ';'
                ? tokens = tokens.slice(2)
                : tokens = tokens.slice(1)

            if (isAssociativeArray) {
                return [elements.reduce((obj, [key, value]) => (obj[key] = value, obj), {}), tokens]
            } else {
                return [elements.map(([, value]) => value), tokens]
            }

        }

        key = tokens[0]
        switch (typeof key) {
            case 'number':
                tokens = tokens.slice(1)
                break
            case 'string':
                isAssociativeArray = true
                tokens = tokens.slice(1)
                break
            default:
                throw Error(`Incorrect array key, got: ${tokens[0]}`)
        }

        [el, tokens] = parser(tokens, refTable)

        elements.push([key, el])
    }
}

/**
 * @param {Array<Token>} tokens 
 * @param {Array<object>} refTable 
 * @returns {[object?, Array<Token>]}
 */
function parserObject(tokens, refTable) {
    const TYPE_PROPERTY = '_type'
    let obj = {}

    if (tokens[0][0] !== OBJECT_TOKEN) {
        return [undefined, tokens]
    }
    refTable.push(obj)

    obj[TYPE_PROPERTY] = tokens[0][1]
    tokens = tokens.slice(2)

    let value = null
    let key = null
    while (true) {
        if (tokens[0] === '}') {
            return tokens[1] === ';'
                ? [obj, tokens.slice(2)]
                : [obj, tokens.slice(1)]
        }

        key = tokens[0]
        if (typeof key !== 'string') {
            throw Error(`Wrong object key type, got: ${key}`)
        }

        [value, tokens] = parser(tokens.slice(1), refTable)

        if (Array.isArray(value) && value[0] === RECURSION_TOKEN) {
            obj[key] = refTable[value[1] - 1]
        } else {
            obj[key] = value
        }

    }
}


// MARK: API
export function unserializePHP(str, opts = { decode: 'plain' }) {
    str = opts.decode === 'base64' ? decode64(str) : str

    const [obj] = parser(lexer(str))

    return obj
}