// Copied from https://npm.devtool.tech/cdn/@aitodotai/json-stringify-pretty-compact which is based on
// https://www.npmjs.com/package/json-stringify-pretty-compact 
// ANDY edited: to convert from npm to modern browser module, I 
//  - added an export statement 
//  - removed the module.exports statement

function isObject(obj) {
    return typeof obj === 'object' && obj !== null
}

function forEach(obj, cb) {
    if (Array.isArray(obj)) {
        obj.forEach(cb)
    } else if (isObject(obj)) {
        Object.keys(obj).forEach(function (key) {
            var val = obj[key]
            cb(val, key)
        })
    }
}

function getTreeDepth(obj) {
    var depth = 0

    if (Array.isArray(obj) || isObject(obj)) {
        forEach(obj, function (val) {
            if (Array.isArray(val) || isObject(val)) {
                var tmpDepth = getTreeDepth(val)
                if (tmpDepth > depth) {
                    depth = tmpDepth
                }
            }
        })

        return depth + 1
    }

    return depth
}

export function stringify(obj, options) {
    options = options || {}
    var indent = JSON.stringify([1], null, get(options, 'indent', 2)).slice(2, -3)
    var addMargin = get(options, 'margins', false)
    var addArrayMargin = get(options, 'arrayMargins', false)
    var addObjectMargin = get(options, 'objectMargins', false)
    var maxLength = (indent === '' ? Infinity : get(options, 'maxLength', 80))
    var maxNesting = get(options, 'maxNesting', Infinity)

    return (function _stringify(obj, currentIndent, reserved) {
        if (obj && typeof obj.toJSON === 'function') {
            obj = obj.toJSON()
        }

        var string = JSON.stringify(obj)

        if (string === undefined) {
            return string
        }

        var length = maxLength - currentIndent.length - reserved

        var treeDepth = getTreeDepth(obj)
        if (treeDepth <= maxNesting && string.length <= length) {
            var prettified = prettify(string, {
                addMargin: addMargin,
                addArrayMargin: addArrayMargin,
                addObjectMargin: addObjectMargin
            })
            if (prettified.length <= length) {
                return prettified
            }
        }

        if (isObject(obj)) {
            var nextIndent = currentIndent + indent
            var items = []
            var delimiters
            var comma = function (array, index) {
                return (index === array.length - 1 ? 0 : 1)
            }

            if (Array.isArray(obj)) {
                for (var index = 0; index < obj.length; index++) {
                    items.push(
                        _stringify(obj[index], nextIndent, comma(obj, index)) || 'null'
                    )
                }
                delimiters = '[]'
            } else {
                Object.keys(obj).forEach(function (key, index, array) {
                    var keyPart = JSON.stringify(key) + ': '
                    var value = _stringify(obj[key], nextIndent,
                        keyPart.length + comma(array, index))
                    if (value !== undefined) {
                        items.push(keyPart + value)
                    }
                })
                delimiters = '{}'
            }

            if (items.length > 0) {
                return [
                    delimiters[0],
                    indent + items.join(',\n' + nextIndent),
                    delimiters[1]
                ].join('\n' + currentIndent)
            }
        }

        return string
    }(obj, '', 0))
}

// Note: This regex matches even invalid JSON strings, but since we’re
// working on the output of `JSON.stringify` we know that only valid strings
// are present (unless the user supplied a weird `options.indent` but in
// that case we don’t care since the output would be invalid anyway).
var stringOrChar = /("(?:[^\\"]|\\.)*")|[:,\][}{]/g

function prettify(string, options) {
    options = options || {}

    var tokens = {
        '{': '{',
        '}': '}',
        '[': '[',
        ']': ']',
        ',': ', ',
        ':': ': '
    }

    if (options.addMargin || options.addObjectMargin) {
        tokens['{'] = '{ '
        tokens['}'] = ' }'
    }

    if (options.addMargin || options.addArrayMargin) {
        tokens['['] = '[ '
        tokens[']'] = ' ]'
    }

    return string.replace(stringOrChar, function (match, string) {
        return string ? match : tokens[match]
    })
}

function get(options, name, defaultValue) {
    return (name in options ? options[name] : defaultValue)
}

