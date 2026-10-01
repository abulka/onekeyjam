import * as Tonal from "@tonaljs/tonal";
import { chordObjToName } from "./chordObjToName";

// ╔═╗┌─┐┬  ┌─┐  ┌─┐┬  ┬  
// ║  ├─┤│  │    ├─┤│  │  
// ╚═╝┴ ┴┴─┘└─┘  ┴ ┴┴─┘┴─┘

export function calcAllChordSymbols(showAllChords, useShortChordNames) {
    let result = []
    Tonal.ChordType.symbols().sort().forEach(chordSymbol => {
        const chordObj = Tonal.Chord.get(chordSymbol)
        if (!showAllChords &&
            (
                chordObj.type == 'Augmented' ||
                chordObj.type == '' ||
                chordSymbol.includes('#11') ||
                chordSymbol.includes('#5') ||
                chordSymbol.includes('#4') ||
                chordSymbol.includes('b6') ||
                chordSymbol.includes('b9') 
            )
        )
            return
        result.push({ 'text': chordObjToName(chordObj, useShortChordNames), 'value': chordSymbol })
    })
    return result
}
