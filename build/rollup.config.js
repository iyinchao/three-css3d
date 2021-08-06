const progress = require('rollup-plugin-progress');
const typescript = require('rollup-plugin-typescript2');
const autoExternal = require('rollup-plugin-auto-external');

module.exports = {
  input: {
    index: 'src/index.ts',
  },
  output: [
    {
      dir: 'lib',
      entryFileNames: '[name].esm.js',
      format: 'es',
      sourcemap: true,
    },
    {dir: 'lib', entryFileNames: '[name].js', format: 'cjs', sourcemap: true},
  ],
  plugins: [autoExternal(), typescript(), progress()],
};
