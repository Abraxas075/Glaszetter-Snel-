import type { CreateElementWithMeasurementInput } from '../api/elements';
import type { PickedPhoto } from '../api/photos';

interface SaveOperations {
  create: (input: CreateElementWithMeasurementInput) => Promise<{ element: { id: string } }>;
  upload: (photo: PickedPhoto, elementId: string) => Promise<unknown>;
}

interface SaveResult {
  elementId: string;
  failedPhotos: PickedPhoto[];
}

// One session belongs to one new-measurement screen. Once creation succeeds,
// retries keep that element and only send photos that have not succeeded yet.
export const createMeasurementSaveSession = () => {
  let elementId: string | null = null;
  let pendingPhotos: PickedPhoto[] = [];
  let inFlight: Promise<SaveResult> | null = null;

  const run = async (
    input: CreateElementWithMeasurementInput,
    photos: PickedPhoto[],
    operations: SaveOperations
  ): Promise<SaveResult> => {
    if (elementId === null) {
      const result = await operations.create(input);
      elementId = result.element.id;
      pendingPhotos = [...photos];
    }

    const failedPhotos: PickedPhoto[] = [];
    for (const photo of pendingPhotos) {
      try {
        await operations.upload(photo, elementId);
      } catch {
        failedPhotos.push(photo);
      }
    }
    pendingPhotos = failedPhotos;
    return { elementId, failedPhotos: [...failedPhotos] };
  };

  return {
    get isSaving() {
      return inFlight !== null;
    },
    save: (
      input: CreateElementWithMeasurementInput,
      photos: PickedPhoto[],
      operations: SaveOperations
    ): Promise<SaveResult> => {
      if (inFlight !== null) return inFlight;
      inFlight = run(input, photos, operations).finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
  };
};
