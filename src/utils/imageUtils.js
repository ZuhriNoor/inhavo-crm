/**
 * In local dev, Vite proxies /storage-proxy → https://firebasestorage.googleapis.com
 * so we can bypass the browser CORS restriction on localhost.
 * In production the real URL is fetched directly (CORS is not blocked there).
 */
const toProxiedUrl = (url) => {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return url;
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return url.replace('https://firebasestorage.googleapis.com', '/storage-proxy');
  }
  return url;
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export const compressImageFile = (file, maxWidth = 1000, maxHeight = 1000, quality = 0.6) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          let newName = file.name;
          if (!newName.toLowerCase().endsWith('.jpg') && !newName.toLowerCase().endsWith('.jpeg')) {
            newName = newName.substring(0, newName.lastIndexOf('.')) + '.jpg';
            if (newName === '.jpg') newName = 'image.jpg';
          }
          const compressedFile = new File([blob], newName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      img.src = event.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

export const loadRemoteImageAsDataUrl = async (url) => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // On localhost: route through Vite dev proxy → no CORS issue
  const fetchUrl = toProxiedUrl(url);

  try {
    const response = await fetch(fetchUrl);
    if (response.ok) {
      const blob = await response.blob();
      return await blobToDataUrl(blob);
    }
  } catch (e) {
    // proxy fetch failed, fall through
  }

  // Fallback: try the original URL directly (works in production)
  if (fetchUrl !== url) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        return await blobToDataUrl(blob);
      }
    } catch (e) {
      // direct fetch failed too
    }
  }

  // Last resort: return the URL as-is so the app never crashes
  return url;
};
