import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMeasurementSaveSession } from '../apps/mobile/src/utils/measurementSave';
import type { CreateElementWithMeasurementInput } from '../apps/mobile/src/api/elements';
import type { PickedPhoto } from '../apps/mobile/src/api/photos';

const input: CreateElementWithMeasurementInput = {
  jobId: 'test-job',
  code: 'R01',
  type: 'fixed_window',
  width: 1230,
  height: 1480,
};
const photos: PickedPhoto[] = ['one', 'two', 'three'].map((name) => ({
  uri: `file:///${name}.jpg`,
  fileName: `${name}.jpg`,
  mimeType: 'image/jpeg',
}));

test('retries only failed photos without creating the measurement again', async () => {
  const session = createMeasurementSaveSession();
  let creations = 0;
  let failSecondPhoto = true;
  const uploaded: string[] = [];
  const operations = {
    create: async () => {
      creations += 1;
      return { element: { id: 'saved-element' } };
    },
    upload: async (photo: PickedPhoto, elementId: string) => {
      assert.equal(elementId, 'saved-element');
      uploaded.push(photo.fileName);
      if (photo.fileName === 'two.jpg' && failSecondPhoto) throw new Error('Upload failed');
    },
  };

  const first = await session.save(input, photos, operations);
  assert.deepEqual(first, { elementId: 'saved-element', failedPhotos: [photos[1]] });
  const second = await session.save(input, first.failedPhotos, operations);
  assert.deepEqual(second.failedPhotos, [photos[1]]);
  failSecondPhoto = false;
  const third = await session.save(input, second.failedPhotos, operations);
  assert.deepEqual(third.failedPhotos, []);
  assert.equal(creations, 1);
  assert.deepEqual(uploaded, ['one.jpg', 'two.jpg', 'three.jpg', 'two.jpg', 'two.jpg']);

  // An extra tap after completion must not repeat either creation or upload.
  await session.save(input, photos, operations);
  assert.equal(creations, 1);
  assert.equal(uploaded.length, 5);
});

test('all failed photos remain available for another attempt', async () => {
  const session = createMeasurementSaveSession();
  const result = await session.save(input, photos, {
    create: async () => ({ element: { id: 'saved-element' } }),
    upload: async () => {
      throw new Error('Offline');
    },
  });
  assert.deepEqual(result.failedPhotos, photos);
});

test('creation failure leaves the form retryable and sends no photos', async () => {
  const session = createMeasurementSaveSession();
  let uploads = 0;
  const upload = async () => {
    uploads += 1;
  };
  await assert.rejects(
    session.save(input, photos, {
      create: async () => {
        throw new Error('Could not save');
      },
      upload,
    }),
    /Could not save/
  );
  assert.equal(session.isSaving, false);
  assert.equal(uploads, 0);
  const result = await session.save(input, photos, {
    create: async () => ({ element: { id: 'saved-on-retry' } }),
    upload,
  });
  assert.equal(result.elementId, 'saved-on-retry');
  assert.equal(uploads, 3);
});

test('simultaneous save attempts share a single creation and upload sequence', async () => {
  const session = createMeasurementSaveSession();
  let finishCreation!: () => void;
  const waitForCreation = new Promise<void>((resolve) => {
    finishCreation = resolve;
  });
  let creations = 0;
  let uploads = 0;
  const operations = {
    create: async () => {
      creations += 1;
      await waitForCreation;
      return { element: { id: 'single-element' } };
    },
    upload: async () => {
      uploads += 1;
    },
  };
  const first = session.save(input, photos, operations);
  const second = session.save(input, photos, operations);
  assert.equal(first, second);
  assert.equal(session.isSaving, true);
  finishCreation();
  await Promise.all([first, second]);
  assert.equal(creations, 1);
  assert.equal(uploads, 3);
  assert.equal(session.isSaving, false);
});

test('a measurement without photos completes immediately after creation', async () => {
  const result = await createMeasurementSaveSession().save(input, [], {
    create: async () => ({ element: { id: 'no-photos' } }),
    upload: async () => assert.fail('There are no photos to upload'),
  });
  assert.deepEqual(result, { elementId: 'no-photos', failedPhotos: [] });
});
