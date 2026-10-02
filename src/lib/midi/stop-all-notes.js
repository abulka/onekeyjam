import { globals } from "../globals.js"
import { stopAllNotes as stopAllGmNotes } from "../audio/general-midi.js"

export function stopAllNotes(channel, channel2) {

    if (globals.channel) globals.channel.sendChannelMode("allnotesoff");
    if (globals.channel2) globals.channel2.sendChannelMode("allnotesoff");
    if (globals.channel3) globals.channel3.sendChannelMode("allnotesoff");

    globals.pendingNoteOffs = {}
    globals.pendingChordBassNoteOffs = {}
    globals.pendingChordNoteOffs = {}

    if (globals.GM)
        stopAllGmNotes()
}
