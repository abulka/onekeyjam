export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],

  corePlugins: {
    // stop tailwind resetting some default browser styles
    preflight: false,
  },
}
