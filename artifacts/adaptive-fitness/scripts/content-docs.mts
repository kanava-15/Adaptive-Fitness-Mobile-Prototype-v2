import { mkdirSync, writeFileSync } from 'node:fs';
import { CONTENT_EXAMPLES, CONTENT_FORMAT_GUIDE, CONTENT_AI_PROMPT } from '../lib/content-examples';
const dir = new URL('../docs/content-examples/', import.meta.url);
mkdirSync(dir, { recursive: true });
for (const [name, value] of Object.entries(CONTENT_EXAMPLES)) {
  writeFileSync(new URL(`${name.toLowerCase().replaceAll(' ', '-')}.json`, dir), JSON.stringify(value, null, 2) + '\n');
}
writeFileSync(new URL('../docs/content-exchange.md', import.meta.url), `# Fitness content exchange\n\n${CONTENT_FORMAT_GUIDE}\n\n## Copyable AI prompt\n\n${CONTENT_AI_PROMPT}\n`);
