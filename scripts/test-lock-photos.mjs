import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildLockPhotoIndex, photosForLock } from "../app/lock-photo-sources.mjs";

const entry = {
  id: "abcdef12",
  media: [
    {
      thumbnailUrl: "https://images.lpubelts.com/i/lock.png",
      fullUrl: "https://youtube.com/watch?v=1",
    },
    {
      thumbnailUrl: "https://live.staticflickr.com/1/example.jpg",
      fullUrl: "https://www.flickr.com/photos/example/1",
      title: "By: A picker",
      subtitle: "CC BY-NC-SA 4.0",
    },
    {
      thumbnailUrl: "https://img.lpubelts.com/hosted.jpg",
      fullUrl: "https://www.lockwiki.com/index.php/File:Example_lock.jpg",
      title: "By: Another picker",
      subtitle: "CC BY-SA 3.0",
    },
  ],
};
const photos = photosForLock(entry);
assert.equal(photos.length, 2);
assert.equal(photos[0].image, "https://live.staticflickr.com/1/example.jpg");
assert.equal(photos[0].licenseUrl, "https://creativecommons.org/licenses/by-nc-sa/4.0/");
assert.equal(
  photos[1].image,
  "https://www.lockwiki.com/index.php/Special:Redirect/file/Example_lock.jpg",
);
assert.deepEqual(
  photosForLock({ id: "12345678", media: [{ thumbnailUrl: "https://lpubelts.com/a.jpg" }] }),
  [],
);
assert.deepEqual(buildLockPhotoIndex([entry, { id: "12345678" }])["12345678"], []);
assert.throws(() => buildLockPhotoIndex([entry, entry]), /duplicate/);

const index = JSON.parse(
  await readFile(new URL("../public/lock-photos.json", import.meta.url), "utf8"),
);
assert(index["0418a174"]?.[0]?.image.startsWith("https://live.staticflickr.com/"));
assert(index["e0191c45"]?.[0]?.image.startsWith("https://www.lockwiki.com/"));
assert.equal(index["e0191c45"][0].license, "CC BY 3.0");
for (const candidates of Object.values(index)) {
  for (const photo of candidates) {
    const host = new URL(photo.image).hostname;
    assert.notEqual(host, "lpubelts.com");
    assert(!host.endsWith(".lpubelts.com"), `Unexpected LPU-hosted photo: ${photo.image}`);
  }
}
console.log(
  "PASS: lock photo selection, credits, third-party hosting, missing photos, and catalog ID validation.",
);
