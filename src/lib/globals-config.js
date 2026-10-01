// Could be defined as 'localhost' or '127.0.0.1'.  If running server on 127.0.0.1 then you
// want to use '127.0.0.1' for urls below, or you risk getting a cross-origin error.  So the
// two forms of local url are actually not interchangeable!
// const localHost = '127.0.0.1'
export const localHost = 'localhost';

// firefox needs webmidi to be served over https e.g. navigator.requestMIDIAccess()
// firefox needs 'about:config' then set midi allowed, cos its a preview feature in 2022
const secure = false;
export const http = secure ? 'https://' : 'http://';

// let maxChordConfigs = 49  // white notes between C3 - B9, don't want to generate C_8 which becomes C10 which is 3 digits and too high anyway
export let maxChordConfigs = 7
