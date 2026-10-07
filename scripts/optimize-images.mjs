// Converte as imagens-fonte (PNG) em WebP dentro de src/assets/images.
// Uso: npm run optimize:images
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const OUTPUT_DIR = 'src/assets/images';
const WEBP_QUALITY = 82;

const sources = [
  { input: 'imagem2.png', output: 'banners_site_fachada2.webp' },
];

await mkdir(OUTPUT_DIR, { recursive: true });

for (const { input, output } of sources) {
  const info = await sharp(input)
    .webp({ quality: WEBP_QUALITY })
    .toFile(`${OUTPUT_DIR}/${output}`);
  process.stdout.write(
    `${input} -> ${output} (${info.width}x${info.height}, ${info.size} bytes)\n`,
  );
}
