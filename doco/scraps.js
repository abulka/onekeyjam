// SCRAPS


    // globals.mySynth.channels[1].addListener("controlchange", e => {
    //     console.log('got "controlchange" message', e)
    //     // echo to output
    //     // globals.channel.playNote(e.note);                
    // });

    // for (let a = 0; a < WebMidi.inputs.length; a++) {
    //     WebMidi.inputs[a].addListener('controlchange', 'all', function (e) {
    //         console.log(`Control Change (${e.target.name}): ${e.value}`);
    //     });
    //     // WebMidi.inputs[a].addListener('noteon', 'all', function (e) {
    //     //     console.log(`Note On (${e.target.name}): ${e.note.name}`);
    //     // });
    // }

    for(let input of WebMidi.inputs){
        console.log(input, 'input.name', input.name)
        // if (input.name != 'Arturia MiniLab mkII')
        if (input.name != 'SL MkII Port 1')
            continue
        console.log(`wiring up ${input.name}`)

        input.addListener(
        /* type     */ "noteon",
        /* channel  */ "all",
        /* callback */  function(event){console.log(`NoteOn:  ${event.note.name}${event.note.octave}`)}
        )
        input.addListener(
        /* type     */ "noteoff",
        /* channel  */ "all",
        /* callback */  function(event){console.log(`NoteOff: ${event.note.name}${event.note.octave}`)}
        )

        input.addListener(
        /* type     */ "controlchange",
        /* channel  */ "all",
        /* callback */  function(event){
            // console.log(`CC:      ${event.controller.number}.${event.value} - from InputChannel ${event.target.number} - message ${event.message} .isChannelMessage ${event.message.isChannelMessage}`, event.target)
            console.log(`CC: ${event.controller.number} (${event.controller.name})`, event.value, event.rawValue, event)

            // event.target.number = 2 // change the channel to 2 ?  FAILS r/o
            // let newMessage = new Message(event.message) //  FAILS 
            // console.log('newMessage', newMessage)
            // globals.channel2.send(event.message)  // sustain pedal from SL MkII passed onto Ableton channel 2 - so why is channel 1 jamming getting it?
            /*
                                                                |
            all going to channel 1       -----------------------|
                                                                v

            14:33:38.989	From SL MkII Port 1	    Control	    1	Damper Pedal (Sustain)	127
            14:33:38.991	From IAC Driver Bus 1	Control	    1	Damper Pedal (Sustain)	127  <--- ableton channel 1 getting this
            14:33:39.334	From SL MkII Port 1	    Control	    1	Damper Pedal (Sustain)	0
            14:33:39.338	From IAC Driver Bus 1	Control	    1	Damper Pedal (Sustain)	0
            */

            // sendControlChange(controller, [value], [options])
            // controller: The MIDI controller name or number (0-127).  THIS IS NOT THE DEVICE ITS THE CC NUMBER !!!!!!!! 🧜‍♂️
            // 2 seems to be the IAC Driver controller
            // globals.myOutput.sendControlChange(event.controller.number, event.rawValue, {channels: [2]})  // sustain pedal from SL MkII
            globals.myOutput.channels[2].sendControlChange(event.controller.number, event.rawValue, {channels: [2]})  // sustain pedal from SL MkII



        }
        )

        input.addListener(
        /* type     */ "pitchbend",
        /* channel  */ "all",
        /* callback */  function(event){
            console.log(`pitchbend:      ${event.type} ${event.target} ${event.message} ${event.value}`)
            globals.channel2.send(event.message)
        }
        )
    }

