/**
 * In local dev, Vite proxies /storage-proxy → https://firebasestorage.googleapis.com
 * so we can bypass the browser CORS restriction on localhost.
 * In production the real URL is fetched directly (CORS is not blocked there).
 */
export const toProxiedUrl = (url) => {
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

export const compressImageFile = async (file, maxWidth = 800, maxHeight = 800, quality = 0.6) => {
  if (!file || !file.type?.startsWith('image/')) {
    return file;
  }

  // 1. Ultra-fast, low-memory native hardware decoding with createImageBitmap (avoids JS heap memory spikes on mobile)
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, {
        resizeWidth: maxWidth,
        resizeMode: 'none'
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close(); // Immediately release GPU/RAM memory!

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      canvas.width = 0;
      canvas.height = 0; // Clear canvas memory

      if (blob) {
        let newName = file.name || 'image.jpg';
        if (!newName.toLowerCase().endsWith('.jpg') && !newName.toLowerCase().endsWith('.jpeg')) {
          newName = newName.substring(0, newName.lastIndexOf('.')) + '.jpg';
          if (newName === '.jpg') newName = 'image.jpg';
        }
        return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
      }
    } catch (err) {
      // If createImageBitmap fails on edge cases, fall back to ObjectURL
    }
  }

  // 2. Low-memory fallback using URL.createObjectURL (avoids FileReader.readAsDataURL heap allocation!)
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
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

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl); // Clean up memory pointer immediately

      canvas.toBlob((blob) => {
        img.src = '';
        canvas.width = 0;
        canvas.height = 0;
        if (!blob) {
          resolve(file);
          return;
        }
        let newName = file.name || 'image.jpg';
        if (!newName.toLowerCase().endsWith('.jpg') && !newName.toLowerCase().endsWith('.jpeg')) {
          newName = newName.substring(0, newName.lastIndexOf('.')) + '.jpg';
          if (newName === '.jpg') newName = 'image.jpg';
        }
        resolve(new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() }));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
};

export const fileToDataUrl = (fileOrBlob) => {
  return new Promise((resolve) => {
    if (!fileOrBlob) return resolve(null);
    if (typeof fileOrBlob === 'string') {
      if (fileOrBlob.startsWith('data:')) return resolve(fileOrBlob);
      if (fileOrBlob.startsWith('blob:')) {
        fetch(fileOrBlob)
          .then(res => res.blob())
          .then(blob => blobToDataUrl(blob))
          .then(resolve)
          .catch(() => resolve(fileOrBlob));
        return;
      }
      return resolve(fileOrBlob);
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(fileOrBlob);
  });
};

export const loadRemoteImageAsDataUrl = async (input) => {
  if (!input) return null;
  if (typeof input !== 'string' || input.startsWith('data:') || input.startsWith('blob:')) {
    return await fileToDataUrl(input);
  }

  // 1. On localhost, try storage-proxy first
  const fetchUrl = toProxiedUrl(input);
  if (fetchUrl !== input) {
    try {
      const response = await fetch(fetchUrl);
      if (response.ok) {
        const blob = await response.blob();
        return await blobToDataUrl(blob);
      }
    } catch (e) {
      // proxy failed
    }
  }

  // 2. Try HTML Image object loading (bypasses direct fetch CORS issues for canvas rendering)
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      } catch (err) {
        resolve(input);
      }
    };
    img.onerror = () => resolve(input);
    img.src = input;
  });
};
