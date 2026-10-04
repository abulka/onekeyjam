import { globals } from "../globals.js"
import { changeScaleFilter, applyKeyScale } from "../change-scale.js"
import { playGmNote, stopGmNote } from "../audio/general-midi"
import { recordChordNoteOn, recordChordNoteOff } from "./recorder.js"

export function playChord(singleNote, options) {
    /*
    singleNote: string, the l.h trigger note which triggers the chord
    options:
        - originNote: the trigger note as a Note object.  We are interested in originNote.attack
        - duration: the duration of the chord usually undefined in which case duration is
           infinite, and only a noteOff stops it.  *NEW* 
        - when: the time at which the chord should start playing  *NEW* 
        - silent: if true, the chord is not sounded.  *NEW*
    */
    if (!(singleNote in globals.chordTriggerMap))
        throw new Error(`${singleNote} not in globals.chordTriggerMap`);

    // Record current current chord trigger note e.g. e.g. "D2"
    changeChordTriggerNoteAndThusScale(singleNote);

    // Update UI of chord piano keyboard
    document.broadcastEvent('chord-changed', { notes: globals.currentLhNotes(), bass: globals.currentBass() });

    if (options.silent)
        return
        
    // Play bass note (channel 3)
    // and record the bass note played in globals.pendingChordBassNoteOffs[singleNote]
    if (!globals.playChordOnly && globals.chordTriggerMap[singleNote].bassNote) {
        let noteName = globals.chordTriggerMap[singleNote].bassNote
        // console.log('playChord() playing bass note', noteName, 'triggered by', singleNote, options);
        playChordNote(noteName, 'bass', options, globals.channel3, singleNote, globals.pendingChordBassNoteOffs)
    }

    // Play each note of chord, (channel 2)
    // and record the notes played in globals.pendingChordNoteOffs[singleNote]
    if (!(singleNote in globals.pendingChordNoteOffs))
        globals.pendingChordNoteOffs[singleNote] = []
    for (let noteName of globals.chordTriggerMap[singleNote].chordNotes) {
        if (globals.playBassOnly)
            continue
        // console.log('playChord() playing CHORD note', noteName, 'triggered by', singleNote, options);

        // Skip bass note of chord itself - cleaner sounding
        if (!globals.playChordBass && noteName === globals.chordTriggerMap[singleNote].bassNote) {
            continue
        }
        playChordNote(noteName, 'chord', options, globals.channel2, singleNote, globals.pendingChordNoteOffs);
    }

}

function changeChordTriggerNoteAndThusScale(singleNote) {
    if (singleNote == undefined)
        singleNote = globals.currentChordTriggerNote;
    else
        globals.currentChordTriggerNote = singleNote;

    // Solo mode 'key': the right hand stays on the project key scale while the
    // chords change. A user's explicit scale1/2/3 pick is temporary and the
    // next chord trigger returns to the key scale. If no key can be resolved,
    // fall through to the per-chord behaviour.
    if (globals.soloMode === 'key' && !globals.scaleFiltering.frozen && applyKeyScale())
        return;

    // Change scale if necessary - 
    if (globals.scaleFilteringModificationSticky)
        changeScaleFilter(globals.currentScaleFilter); // preserve current scale modification
    else
        changeScaleFilter('rhnotes'); // reset to default scale after switching to new chord
}

export function playChordNote(noteName, toneType, options, channel, triggerNote, pendingNoteOffs) {
    /*
    Play a single chord note 'noteName' of type toneType, e.g. 'chord' or 'bass' triggered by 'singleNote'
    options: same as options to playChord()
    channel: OPTIONAL channel to play note on when in MIDI mode. Defaults to globals.channel2 if not specifed.
    triggerNote: OPTIONAL the trigger note that caused the chord, as a string e.g. 'C2'
    pendingNoteOffs: OPTIONAL array of pending note offs for this chord, 
                    either globals.pendingChordNoteOffs or globals.pendingChordBassNoteOffs

    For more general use in playing chords (e.g. when auditioning or picking chords) pass triggerNote
    as undefined, and then both triggerNote and pendingNoteOffs are ignored and need not be passed in.
    However you must pass in options.duration.
    */
    if (channel === undefined)
        channel = globals.channel2
    const noteOffInfo = {
        allowedNote: noteName,
        pitch: undefined,
        velocity: undefined,
        envelope: undefined
    };
    if (!options.duration) {
        // if we have a duration then we don't need a noteOff, cos the note will stop itself
        // at least in GM mode
        if (triggerNote == undefined)
            throw ('if you do not specify a trigger note then you must specify a duration')
        if (toneType == 'bass')
            pendingNoteOffs[triggerNote] = noteOffInfo
        else
            pendingNoteOffs[triggerNote].push(noteOffInfo);
    }

    // Capture the note that actually sounds, but only for live chord triggers
    // (triggerNote is undefined for auditions, which we do not record). The
    // trigger key is remembered separately so playback can show the keys played.
    if (globals.recording.isRecording && triggerNote !== undefined)
        recordChordNoteOn(noteName, options.originNote && options.originNote.attack, { playedNote: triggerNote })

    if (globals.GM)
        playGmNote(noteName, noteOffInfo, {
            velocity: options.originNote.attack,
            toneType: toneType,
            duration: options.duration,
            when: options.when
        });

    else if (channel)
        channel.playNote(noteName, { attack: options.originNote.attack });
}

export function playChordOff(singleNote) {
    if (!(singleNote in globals.chordTriggerMap))
        throw new Error(`${singleNote} not in globals.chordTriggerMap`);

    // For note off we don't care about current chord notes, we care about
    // what was remembered for the trigger note in the pendingChordNoteOffs
    // object, so that we can turn those specific old notes (currently ringing) off

    // Turn off all notes of chord (on channel 2)
    if (singleNote in globals.pendingChordNoteOffs) {
        for (let noteOffInfo of globals.pendingChordNoteOffs[singleNote]) {
            if (globals.recording.isRecording)
                recordChordNoteOff(noteOffInfo.allowedNote)
            if (globals.GM)
                stopGmNote(noteOffInfo)
            else
                if (globals.channel2)
                    globals.channel2.stopNote(noteOffInfo.allowedNote);
        }
        // for (let noteName of globals.pendingChordNoteOffs[singleNote]) {
        //     globals.channel2.stopNote(noteName)
        // }
    }
    delete globals.pendingChordNoteOffs[singleNote]

    // Turn off bass note here too (on channel 3)
    if (singleNote in globals.pendingChordBassNoteOffs) {
        let noteOffInfo = globals.pendingChordBassNoteOffs[singleNote]
        if (noteOffInfo) {
            let oldNote = noteOffInfo.allowedNote
            delete globals.pendingChordBassNoteOffs[singleNote]
            if (globals.recording.isRecording)
                recordChordNoteOff(oldNote)
            if (globals.GM)
                stopGmNote(noteOffInfo)
            else
                if (globals.channel3)
                    globals.channel3.stopNote(oldNote)
        }
    }
}
