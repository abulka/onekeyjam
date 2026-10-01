# Implementation Notes

![screenshot](doco/onekeyjam-ui.png)

## C3 and C4 issue

Attempt to turn WebMidi default of `C4` into Apple's more common `C3` failed, because the actual notes change by one octate.  I just wanted the notes to be printed in terms of C3 and no other changes.  Revisit sometime.

- Doco https://webmidijs.org/docs/going-further/middle-c 
- Discussion https://github.com/djipco/webmidi/issues/42 

```javascript
WebMidi.octaveOffset = 1  
```

## Channels and outputs

From https://webmidijs.org/forum/discussion/44/things-in-webmidi-js-2-52-that-make-me-go-huh. The logic behind v3 is that you can work with either `Output` or `OutputChannel` objects. 

- If you need to send commands to a <u>single channel</u>, you would use an `OutputChannel` object:
  
    ```js
    WebMidi.output[0].channels[1].playNote("C3");
    ```

- If you want to send commands to <u>all channels</u> of a specific device, you would use the broader `Output` object:
  
    ```js
    WebMidi.output[0].playNote("C3");
    ```

- If you want to send commands to <u>specific channels</u> (for example: 2, 4 and 6) of an output device, you would do:
  
    ```js
    WebMidi.output[0].playNote("C3", {channels: [2, 4, 6});
    ```

## CC messages

```js
sendControlChange(controller, [value], [options])
```
- `controller`: The CC number
- `value`: The actual value 0-127 
- `options`: { channel: [channel], time: [time], rawVelocity: [velocity] }

### Example:

```js
globals.channel2.sendControlChange(
    event.controller.number, 
    event.rawValue, 
    { channels: [2] }
)
```

### Tips:

The [Offial Doco](https://webmidijs.org/api/classes/Output/#sendControlChange) is a bit confusing. Here are the real parameter meanings:

> `controller` 🧜‍♂️ confusingly documented as the the 'MIDI controller name or number (0-127)' 
> but this does NOT refer to the MIDI output controller DEVICE. Its e.g. `64` or `'holdpedal'` etc.

> `value` when passing through the input event to some output, pass through `event.rawValue` not `event.value` which is just a 0 or 1

> `options` seems you don't need to pass options e.g. `{ channels: [2] }` simply send to `globals.channel2` is enough. I wonder why there are two places for channel info?  Perhaps its when broadcasting to all channels that it comes in handy?

## Events

Lots of things you can access.

```js
globals.mySynth.addListener(
    "controlchange",        // type
    "all",                  // channel
    function (event) {      // callback
        console.log(
            `CC: ${event.controller.number} (${event.controller.name})`,
            'Value', event.rawValue, event.value,
            'InputChannel', event.target.number,
            'Message', event.message,
            event
        )
    }
)
```

# Asyc boot sequence

> Note some of this is out of date. The vue app creation in in index.html and the onekeyjam global initialisation is in `src/main.js` and called from onMounted() in `src/App.vue`.  All wiring has been moved into component specific onMounted() hooks. The function `wireGuiEvents()` is thus no longer used. The only thing that changes is each time a new project is loaded, a call to `linkProjectToKeyboard()` is made.

Head has 

```html
<script type="module">
    import main from './src/main.js';
    main()
</script>
```

body script has

```html
    <script type="module">
        import { wireGuiEvents } from "./src/wire-events.js"
        wireGuiEvents()
    </script>
```

where main() is

```js
export default async function () {
    let bp = bootProject()  // this loads the project JSON
    let bw = bootWebMidi()
    try {
        let values = await Promise.all([bp, bw]);
    } catch (e) {
        alert(e);
    }
    console.log('BOTH bootProject and bootWebMidi done!!!!!!!!!!')
```

which causes

    bootProject() begins...
    boot-project.js:5   openProject http://localhost:8080/projects/Em%20Am%2B9%20CM9%20Bm%2B11%20project.json
    boot-webmidi.js:5 bootWebMidi() begins...
    wire-events.js:148 wireGuiEvents begins...
    wire-events.js:153 wireGuiEvents ends.
    boot-project.js:93 ...
    boot-project.js:87 bootProject() ends.
    boot-webmidi.js:30 bootWebMidi() ends.
    main.js:15 BOTH bootProject and bootWebMidi done!!!!!!!!!!
    change-scale.js:43 Scale change: default currentRhNotes Proxy {0: 'E', 1: 'F#', 2: 'G', 3: 'A', 4: 'B', 5: 'C#', 6: 'D'}
    wire-events.js:197 scale-c

## Explanation

Both `bootProject` and `bootWebMidi` can happen asynchronously.  Actually so can `wireGuiEvents()` which runs when the DOM is ready, as it appears in script underneath the HTML.

After awaiting `main()` then proceeds to 

```js
wireNoteOnEvents(document)
wireNoteOffEvents(document)
wireCCEvents(document)
```

This wiring relies on the project JSON being loaded and available in `globals.project`, and on `WebMidi` to be initialised, which is why we need to await on both.

# Scale notes to Scale conversion

```js
   let scaleObj = Tonal.Scale.get(globals.currentScaleName);
    if (scaleObj.empty) {
        // In future, try to detect notes from globals.currentScaleNotes - and
        // update scaleObj but not possible at the moment (see
        // notesToScales(notes) experimental code in
        // test/chordSymbolToScale/tonalScaleGet.test.js)
    }
```

# Auto sync

Auto sync via chord trigger event - probably not desirable since changing chord
means ripple effect of changing scale - but scale already being changed by the
chord trigger. Then again the scale should end up being the same?  No, cos the
rhscale could be anything from the project config and not necessarily the auto
recommended scales of the first detected chord that ends up in the chord picker.

```html
&nbsp;&nbsp;&nbsp;
<label class="checkboxLabel" title="Sync Current Triggered Chord to Chord Picker.">
    Auto Sync to Triggered Chord
    <input type="checkbox" v-model="globals.syncChordPickerToCurrentTriggeredChord" />
</label>
```

# Chord to Symbol back to chord again - experiment - fails

Taken from _buildCandidateChordConfigs()

In Tonal, currently chord with roots are NOT allowed (will be implemented in
next version): https://github.com/tonaljs/tonal/tree/main/packages/chord so
whilst it can describe notes as chord symbols with bass slashes, it can't create
chord objects from such symbols const detectedChordsAgain =
detectedChordSymbols.map(chordSymbol => Chord.get(chordSymbol))

```javascript
if (detectedChordsAgain.length === 0)
    console.warn('  back to chord failed - empty', detectedChordSymbols)
else if (detectedChordsAgain[0].empty)
    console.warn('  back to chord failed', detectedChordSymbols)
```
