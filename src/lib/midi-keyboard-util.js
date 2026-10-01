import { notesToKeyboardNumbers, indexToNote } from "./note-tools.js"

export function clearKeyboard(keyboard) {
    for (let i = 0; i <= keyboard.max; i++)
        keyboard.setNote(false, i)
}
export function displayScaleOnKeyboard(keyboard, notes) {
    // notes = notes.slice(0, 2) // only display first few notes
    let keyboardNumbers = notesToKeyboardNumbers(notes)
    for (let n of keyboardNumbers)
        keyboard.setNote(true, n)
}
