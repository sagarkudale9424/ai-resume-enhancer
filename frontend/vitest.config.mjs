import { defineConfig, transformWithEsbuild } from 'vite';

// Components use JSX in .js files, like the Next.js app
const jsInJsx = {
  name: 'js-in-jsx',
  enforce: 'pre',
  transform(code, id) {
    if (!/\/(src|tests)\/.*\.js$/.test(id)) return null;
    return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
  },
};

export default defineConfig({
  plugins: [jsInJsx],
  test: { include: ['tests/**/*.test.js'], environment: 'node' },
});
