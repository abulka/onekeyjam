export function removeBassSlash(chordSymbol) {
    // TODO perhaps add bass to the resulting chord config in the future?

    let name = ''
    let bass = ''

    if (chordSymbol.includes('/')) {
        const bits = chordSymbol.split('/')
        name = bits.slice(0, -1).join('/')
        bass = bits.slice(-1)[0]

        // Handle a tricky case
        if (bass == '9' || bass == 'ma7') {
            // The two valid tonal chord symbols like m/ma7 and 6/9 are obviously not bass notes
            // so we exclude those and don't adjust the chordSymbol otherwise we would break the chord symbol.
            // Thus can never have a bass note with one of these exceptions 
            // e.g. C6/9/B is not allowed
            bass = '';
            name = chordSymbol
        }
    }
    else {
        name = chordSymbol
    }
    return [name, bass];
}
