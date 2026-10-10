import { mkdir, writeFile } from 'node:fs/promises';
import { authoredRelease } from '@workspace/activity-catalog/authoring';
import { coverage, releaseManifest, validateSnapshot } from '@workspace/activity-catalog';

const release = authoredRelease();
const manifest = releaseManifest(release);
validateSnapshot(manifest, release);
// Small text-only product data, not media/build output. Must be committed for offline launch.
await writeFile(new URL('../../lib/activity-catalog/src/starter.json', import.meta.url), JSON.stringify({ manifest, release }));
await mkdir(new URL('../../generated-artifacts/catalog/', import.meta.url), { recursive: true });
await writeFile(new URL('../../generated-artifacts/catalog/reviewed-release.json', import.meta.url), JSON.stringify(release));
await writeFile(new URL('../../docs/activity-catalog/inventory.tsv', import.meta.url),
  'id\tname\tdiscipline\tfamily\tcontext\tsources\n' +
  release.activities.map(a => [a.id, a.name, a.discipline, a.family,
    a.seriesContext.map(c => c.label).join('; '), a.sourceIds.join('; ')].join('\t')).join('\n') + '\n');
console.info({ version: release.contentVersion, checksum: manifest.checksum, coverage: coverage(release) });
