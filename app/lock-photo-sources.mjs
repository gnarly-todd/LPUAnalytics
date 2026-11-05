// LPU's catalog identifies the original photos and their credits. Display the
// original third-party images rather than LPU-hosted copies or video thumbnails.
function externalUrl(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      host === "lpubelts.com" ||
      host.endsWith(".lpubelts.com")
    )
      return "";
    return url.href;
  } catch {
    return "";
  }
}

function imageUrl(value) {
  const url = externalUrl(value);
  if (!url) return "";
  const parsed = new URL(url);
  if (
    /(^|\.)(youtube\.com|youtu\.be|ytimg\.com)$/.test(parsed.hostname) ||
    !/\.(avif|gif|jpe?g|png|webp)$/i.test(parsed.pathname)
  )
    return "";
  return url;
}

function lockwikiImage(source) {
  const url = externalUrl(source);
  if (!url) return "";
  const parsed = new URL(url);
  if (!["lockwiki.com", "www.lockwiki.com"].includes(parsed.hostname)) return "";
  let pathname;
  try {
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    return "";
  }
  const match = pathname.match(/^\/index\.php\/File:(.+)$/i);
  if (!match || !/\.(avif|gif|jpe?g|png|webp)$/i.test(match[1])) return "";
  return `https://www.lockwiki.com/index.php/Special:Redirect/file/${encodeURIComponent(match[1])}`;
}

function licenseUrl(label) {
  const match = String(label ?? "")
    .trim()
    .match(/^CC (BY(?:-NC)?(?:-SA|-ND)?) (2\.0|3\.0|4\.0)$/i);
  return match ? `https://creativecommons.org/licenses/${match[1].toLowerCase()}/${match[2]}/` : "";
}

export function photosForLock(entry) {
  const photos = [];
  for (const item of Array.isArray(entry?.media) ? entry.media : []) {
    if (!item || typeof item !== "object" || /youtube\.com|youtu\.be/i.test(item.fullUrl ?? ""))
      continue;
    const source = externalUrl(item.fullUrl) || externalUrl(item.subtitleUrl);
    const image =
      imageUrl(item.thumbnailUrl) ||
      imageUrl(item.fullSizeUrl) ||
      lockwikiImage(item.fullUrl) ||
      imageUrl(item.fullUrl);
    if (!image || photos.some((photo) => photo.image === image)) continue;
    // The original Lockwiki file identifies its actual license as CC BY 3.0.
    const license =
      entry.id === "e0191c45" && image.includes("KABA_Gemini_cylinder")
        ? "CC BY 3.0"
        : typeof item.subtitle === "string"
          ? item.subtitle.trim()
          : "";
    photos.push({
      image,
      source: source || image,
      credit: typeof item.title === "string" ? item.title.trim() : "",
      license,
      licenseUrl: licenseUrl(license),
    });
    if (photos.length === 2) break;
  }
  return photos;
}

export function buildLockPhotoIndex(catalog) {
  if (!Array.isArray(catalog) || !catalog.length) throw new Error("Invalid lock photo catalog.");
  const index = {};
  for (const entry of catalog) {
    if (!entry || !/^[a-z0-9]{8}$/i.test(entry.id) || Object.hasOwn(index, entry.id))
      throw new Error("The lock photo catalog contains an invalid or duplicate ID.");
    index[entry.id] = photosForLock(entry);
  }
  return index;
}
