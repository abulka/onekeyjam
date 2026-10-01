import { globals } from "./globals.js"

// Listen for computer keyboard (not midi keyboard, not onscreen piano keyboard)
// events and update globals. This is so we can detect meta key and avoid
// playing a jam note when the focus is in the live onscreen piano keyboard and
// user hits CMD-R to refresh the browser page.

function recordKey(e) {
    globals.keyState.shift = e.shiftKey;
    globals.keyState.ctrl = e.ctrlKey;
    globals.keyState.alt = e.altKey;
    globals.keyState.meta = e.metaKey;  // <- this is the only one we are interested in
}

function clearKeyState() {
    globals.keyState.shift = false;
    globals.keyState.ctrl = false;
    globals.keyState.alt = false;
    globals.keyState.meta = false;
}

// function shortCutKey(e) {
//     if (e.key === 'x') {
//         console.log('global shortcut (non vuejs) keydown: r');
//     }
// }

function listenForAnyKeyEventsGlobally() {
    document.addEventListener('keydown', (e) => recordKey(e));
    document.addEventListener('keyup', (e) => recordKey(e));

    // shortcuts - I also have vuejs specific shortcuts in JammerView.vue - also disabled for now
    // document.addEventListener('keyup', (e) => shortCutKey(e));
}


// EXPORT


export function wireQwertyKeyState() {
    if (document.readyState === "complete" || document.readyState === "loaded")
        listenForAnyKeyEventsGlobally();
    else
        document.addEventListener('DOMContentLoaded', function () {
            listenForAnyKeyEventsGlobally();
        });

    // Ensure CMD-Tab doesn't leave meta (CMD) stuck in true state, thus
    // breaking the ability to jam
    window.addEventListener("focus", function (event) {
        clearKeyState()
    }, false);
    window.addEventListener("blur", function (event) {
        clearKeyState()
    }, false);
}
