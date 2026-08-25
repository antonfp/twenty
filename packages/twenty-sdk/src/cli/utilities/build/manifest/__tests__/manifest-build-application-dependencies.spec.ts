import { MINIMAL_APP_PATH } from '@/cli/__tests__/apps/fixture-paths';
import { buildManifest } from '@/cli/utilities/build/manifest/manifest-build';

describe('buildManifest application dependencies', () => {
  it('serializes defineApplication() dependencies onto manifest.application', async () => {
    const { manifest, errors } = await buildManifest(MINIMAL_APP_PATH);

    expect(errors).toEqual([]);
    expect(manifest?.application.dependencies).toEqual([
      'f1f2f3f4-f5f6-4000-8000-000000000099',
    ]);
  }, 60000);
});
