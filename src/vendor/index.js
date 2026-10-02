// Bundles the jQuery + Fomantic UI runtime that used to come from CDN <script>
// tags in index.html.
//
// jQuery is exposed as a global because the rest of the app (and Fomantic
// itself) expects `$` / `jQuery` on window. Fomantic's JS is imported
// dynamically, after the globals are set, so its jQuery plugin registration
// finds them.
import jQuery from 'jquery'
import 'fomantic-ui/dist/semantic.min.css'

window.$ = jQuery
window.jQuery = jQuery

// Resolves once the Fomantic plugins (dropdown, modal, toast, accordion, tab)
// are registered. src/main.js waits for this before mounting the app.
export const fomanticReady = import('fomantic-ui/dist/semantic.min.js')
