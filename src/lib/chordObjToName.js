export function chordObjToName(chordObj, useShortChordNames) {
    // returns a string of the chord name aliases and qualities, depending on what can fit
    const MAX_NAME_LENGTH = useShortChordNames ? 28 : 80
    let result = []

    const finalResult = () => result.join(' | ')

    function pushIfCanFit(str) {
        // side effect, push str to result if it fits, return t/f
        let preliminaryResult = result.slice(0, 999)
        preliminaryResult.push(str)
        if (preliminaryResult.join(' | ').length < MAX_NAME_LENGTH) {
            result.push(str)
            return true
        }
        return false
    }

    // Add the alias names
    for (let alias of chordObj.aliases) {
        if (alias == '') // an alias for major is blank - looks bad in combo
            continue
        if (!pushIfCanFit(alias))
            return finalResult()
    }

    // Add the chord name
    if (chordObj.name && !pushIfCanFit(`'${chordObj.name}'`))
        return finalResult()

    // Add the chord type and quality, if there is room
    if (chordObj.quality && chordObj.quality != 'Unknown' && !pushIfCanFit(`[quality: '${chordObj.quality}']`))
        return finalResult()
    if (chordObj.type && !useShortChordNames && !pushIfCanFit(`(type: '${chordObj.type}')`))
        return finalResult()

    return finalResult()
}
