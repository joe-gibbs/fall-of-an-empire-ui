interface PortraitImage {
  image: WeakRef<HTMLImageElement>;
  pending: Promise<void> | null;
  failed: boolean;
}

const portraitImages = new Map<string, PortraitImage>();
const releasedImages = new FinalizationRegistry<{ src: string; record: PortraitImage }>(({ src, record }) => {
  if (portraitImages.get(src) === record) portraitImages.delete(src);
});

/** Decode a complete portrait together. Mounted layers own the decoded images;
 * the shared lookup does not retain campaign-sized collections of bitmaps. */
export function readPortraitImages(sources: readonly string[]): (HTMLImageElement | null)[] {
  const pending: Promise<void>[] = [];
  const images = sources.map(src => {
    let record = portraitImages.get(src);
    let image = record?.image.deref();
    if (!record || !image) {
      image = document.createElement('img');
      record = { image: new WeakRef(image), pending: null, failed: false };
      const loadingRecord = record;
      image.src = src;
      record.pending = image.decode().then(() => {
        loadingRecord.pending = null;
      }, () => {
        loadingRecord.pending = null;
        loadingRecord.failed = true;
      });
      portraitImages.set(src, record);
      releasedImages.register(image, { src, record });
    }
    if (record.pending) pending.push(record.pending);
    return record.failed ? null : image;
  });
  // The suspended render owns all its images until the last decode completes.
  if (pending.length) throw Promise.all(pending).then(() => images);
  return images;
}
