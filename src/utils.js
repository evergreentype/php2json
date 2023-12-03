/**
 * Reference: https://stackoverflow.com/a/32426278/5856760
 * @param {string} base64 
 * @returns {string}
 */
export const decode64 = base64 => Buffer.from(base64, 'base64').toString('utf8')


/**
 * Reference: https://codedamn.com/news/javascript/how-to-fix-typeerror-converting-circular-structure-to-json-in-js
 * @param {any} value 
 * @returns {string}
 */
export function stringify(value) {
    let cache = []
    let str = JSON.stringify(value, (_, value) => {
        if (typeof value === "object" && value !== null) {
            if (cache.indexOf(value) !== -1) {
                return
            }
            cache.push(value)
        }
        return value
    })
    cache = null
    return str
}
