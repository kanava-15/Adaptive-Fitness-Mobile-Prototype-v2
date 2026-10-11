import { mkdirSync, writeFileSync } from 'node:fs';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { contentPackageSchema } from '../src/content-package';

const schema = zodToJsonSchema(contentPackageSchema, { name: 'SvasthicContentV1', $refStrategy: 'none' });
mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/content-package-v1.schema.json', import.meta.url), JSON.stringify({
  ...schema, $id: 'urn:svasthic:content:v1',
  description: 'Portable content, not a device backup. Runtime additionally enforces exact dependencies, sources, supported measurements, sequence cycles/depth/expansion and 2 MiB size. Incoming authorship/review/adaptation are attribution, never local trust.',
}, null, 2) + '\n');
