// Regenerates css/tailwind.static.css — the compiled replacement for the
// old cdn.tailwindcss.com runtime (~300KB JS on every phone load → 22KB /
// 5KB gz static CSS). Run after adding new utility classes to any template:
//   npx tailwindcss@3.4.17 -c tailwind.config.cjs -o css/tailwind.static.css --minify
// The file is committed; there is no build step. Bump ?v= in index.html.
module.exports = {
  content: ["./index.html", "./js/**/*.js"],
  corePlugins: { preflight: true },
  theme: { extend: {} },
  plugins: [],
};
