/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Drop backdrop-filter from the default transition-property list.
      // On Windows Chromium, having backdrop-filter in transition-property on
      // children of position:sticky triggers a GPU compositing bug that paints
      // a gray overlay across the entire viewport — even when no backdrop-filter
      // value is ever applied.  We never animate backdrop-filter in this app so
      // removing it here is safe and has no visible effect.
      transitionProperty: {
        DEFAULT:
          'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter',
      },
    },
  },
  plugins: [],
}
