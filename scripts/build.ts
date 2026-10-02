import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { build as bundle } from 'esbuild';

export async function build(): Promise<void> {
  const [template, css, result] = await Promise.all([
    readFile('src/index.html', 'utf8'),
    readFile('src/style.css', 'utf8'),
    bundle({
      entryPoints: ['src/main.ts'],
      bundle: true,
      write: false,
      minify: true,
      format: 'iife',
      target: 'es2022',
      metafile: true,
    }),
  ]);
  const output = result.outputFiles[0];
  if (!output) throw new Error('Bundler produced no JavaScript');
  if (
    Object.keys(result.metafile.inputs).some((path) =>
      path.includes('node_modules'),
    )
  )
    throw new Error('Runtime dependencies are forbidden');
  const html = template
    .replace('/* INLINE_CSS */', () => css)
    .replace('/* INLINE_JS */', () =>
      output.text.replace(/<\/script/gi, '<\\/script'),
    );
  if (
    /<script[^>]+src=|<link[^>]+(?:stylesheet|preload)|@import|url\(\s*['"]?https?:/i.test(
      html,
    )
  )
    throw new Error('Build must be self-contained');
  await mkdir('dist', { recursive: true });
  await writeFile('dist/index.html', html);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await build();
