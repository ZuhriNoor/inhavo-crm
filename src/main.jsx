if (typeof window !== 'undefined' && !window.Buffer) {
  const browserBuffer = {
    isBuffer: (obj) => obj && (obj instanceof Uint8Array || obj.constructor?.name === 'Uint8Array'),
    from: (data) => {
      if (typeof data === 'string') return new TextEncoder().encode(data);
      if (data instanceof ArrayBuffer) return new Uint8Array(data);
      return new Uint8Array(data);
    },
    concat: (list) => {
      const totalLen = list.reduce((acc, curr) => acc + (curr?.length || 0), 0);
      const res = new Uint8Array(totalLen);
      let offset = 0;
      for (const item of list) {
        if (item) {
          res.set(item, offset);
          offset += item.length;
        }
      }
      return res;
    }
  };
  window.Buffer = browserBuffer;
  globalThis.Buffer = browserBuffer;
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
