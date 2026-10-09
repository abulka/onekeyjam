import { globals } from "../globals.js"
import { changeScaleFilter, applyKeyScale, applyScalePolicy } from "../change-scale.js"
import { recordChordHistory } from "../autoScale.js"
import { audioContext, playGmNote, stopGmNote } from "../audio/general-midi"
import { recordChordNoteOn, recordChordNoteOff } from "./recorder.js"

// Chord/scale state changes that are waiting to be applied on the audio clock.
// Sequenced playback schedules them a little ahead (see `deferStateToWhen`), so
// stopping the sequence must be able to cancel them.
let pendingStateTimers = []

/** Cancel any chord/scale state changes scheduled for the future. */
export function clearPendingChordState() {
    for (const id of pendingStateTimers)
        clearTimeout(id)
    pendingStateTimers = []
}

export function playChord(singleNote, options) {
    /*
    singleNote: string, the l.h trigger note which triggers the chord
    options:
        - originNote: the trigger note as a Note object.  We are interested in originNote.attack
        - duration: the duration of the chord usually undefined in which case duration is
           infinite, and only a noteOff stops it.  *NEW* 
        - when: the time at which the chord should start playing  *NEW* 
        - silent: if true, the chord is not sounded.  *NEW*
        - deferStateToWhen: when true, the scale/chord state is applied at `when`
           rather than now. The sequencer pre-schedules notes and would otherwise
           change the scale (and the live-solo filtering) up to a second early.
    */
    if (!(singleNote in globals.chordTriggerMap))
        throw new Error(`${singleNote} not in globals.chordTriggerMap`);

    const applyState = () => {
        // Record current current chord trigger note e.g. e.g. "D2"
        changeChordTriggerNoteAndThusScale(singleNote, options);

        // Update UI of chord piano keyboard
        document.broadcastEvent('chord-changed', { notes: globals.currentLhNotes(), bass: globals.currentBass() });
    }

    const delayMs = (options.deferStateToWhen && typeof options.when === 'number' && audioContext)
        ? Math.max(0, (options.when - audioContext.currentTime) * 1000)
        : 0

    if (delayMs > 8) {
        const id = setTimeout(() => {
            pendingStateTimers = pendingStateTimers.filter(timerId => timerId !== id)
            applyState()
        }, delayMs)
        pendingStateTimers.push(id)
    }
    else {
        applyState()
    }

    if (options.silent)
        return
        
    // Play bass note (channel 3)
    // and record the bass note played in globals.pendingChordBassNoteOffs[singleNote]
    const config = globals.chordTriggerMap[singleNote]
    if (!globals.playChordOnly && config.bassNote) {
        let noteName = config.bassNote
        // console.log('playChord() playing bass note', noteName, 'triggered by', singleNote, options);
        playChordNote(noteName, 'bass', options, globals.channel3, singleNote, globals.pendingChordBassNoteOffs)
    }

    // Play each note of chord, (channel 2)
    // and record the notes played in globals.pendingChordNoteOffs[singleNote]
    if (!(singleNote in globals.pendingChordNoteOffs))
        globals.pendingChordNoteOffs[singleNote] = []
    if (!globals.playBassOnly) {
        // A chord note that is exactly the bass note is left out of the chord
        // channel, so the bass is not doubled by the voicing...
        const chordChannelNotes = config.chordNotes.filter(name => name !== config.bassNote)
        // ...unless the "double the bass" option is on, in which case the bass
        // note is also sounded on the chord channel.
        if (globals.playChordBass && config.bassNote)
            chordChannelNotes.push(config.bassNote)
        for (let noteName of chordChannelNotes) {
            // console.log('playChord() playing CHORD note', noteName, 'triggered by', singleNote, options);
            playChordNote(noteName, 'chord', options, globals.channel2, singleNote, globals.pendingChordNoteOffs);
        }
    }

}

function changeChordTriggerNoteAndThusScale(singleNote, options = {}) {
    if (singleNote == undefined)
        singleNote = globals.currentChordTriggerNote;

    // Clicking a grid cell fires an audible trigger and then a silent
    // re-trigger of the same chord. Nothing changes the second time, so leave
    // the scale and the history alone.
    if (options.silent && singleNote === globals.currentChordTriggerNote)
        return;

    const chordChanged = singleNote !== globals.currentChordTriggerNote;
    globals.currentChordTriggerNote = singleNote;

    // Solo mode 'key': the right hand stays on the project key scale while the
    // chords change. A user's explicit scale1/2/3 pick is temporary and the
    // next chord trigger returns to the key scale. If no key can be resolved,
    // fall through to the per-chord behaviour.
    if (globals.soloMode === 'key' && !globals.scaleFiltering.frozen && applyKeyScale()) {
        recordChordHistory();
        return;
    }

    // A manual pick (a grid cell click, a right-hand black key or a 1-4
    // shortcut) overrides the follow/shuffle policy. The chosen slot is kept
    // while its own chord keeps sounding, and is carried to the next different
    // chord once, so the pick wins on the next chord hit whether or not the
    // chord changes. After that the policy resumes.
    if (globals.scaleFiltering.manualScaleFilter) {
        globals.currentScaleFilter = globals.scaleFiltering.manualScaleFilter;
        changeScaleFilter(globals.scaleFiltering.manualScaleFilter);
        recordChordHistory();
        if (chordChanged) {
            globals.scaleFiltering.manualScaleFilter = '';
            globals.scaleFiltering.manualScaleNote = '';
        }
        return;
    }

    // The follow and shuffle policies choose the scale for this chord. In
    // manual mode they decline and the slot behaviour below applies.
    if (applyScalePolicy()) {
        recordChordHistory();
        return;
    }

    // Change scale if necessary - 
    if (globals.scaleFilteringModificationSticky)
        changeScaleFilter(globals.currentScaleFilter); // preserve current scale modification
    else
        changeScaleFilter('rhnotes'); // reset to default scale after switching to new chord

    recordChordHistory();
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
    // recorder decides whether it goes into the live take or only the hidden
    // background buffer. The trigger key is remembered separately so playback
    // can show the keys played.
    if (triggerNote !== undefined)
        recordChordNoteOn(noteName, options.originNote && options.originNote.attack, { playedNote: triggerNote, role: toneType })

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
            recordChordNoteOff(oldNote)
            if (globals.GM)
                stopGmNote(noteOffInfo)
            else
                if (globals.channel3)
                    globals.channel3.stopNote(oldNote)
        }
    }
}
