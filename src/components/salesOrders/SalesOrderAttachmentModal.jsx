import { useState, useRef } from 'react';
import { X, Upload, FileText, Image as ImageIcon, Check } from 'lucide-react';
import { uploadSalesOrderAttachment } from '../../services/salesOrdersService';

const PRESET_NAMES = [
  'Customer Confirmation Proof',
  'Payment Proof / Receipt',
  'Custom Design / Drawing',
];

const inputCls =
  'w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all';

const SalesOrderAttachmentModal = ({ orderId, isOpen, onClose, onUploaded }) => {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('Customer Confirmation Proof');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');

    if (selectedFile.type.startsWith('image/')) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');

    try {
      await uploadSalesOrderAttachment(orderId, file, name);
      onUploaded?.();
      onClose();
    } catch (err) {
      console.error('Failed to upload attachment:', err);
      setError(err.message || 'Failed to upload attachment.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/40 dark:bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100">Add Attachment / Proof</h2>
              <p className="text-xs text-gray-400 dark:text-slate-400">Attach confirmation screenshots or PO documents</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 text-xs bg-red-50 dark:bg-rose-950/40 text-red-600 dark:text-rose-300 rounded-xl border border-red-200 dark:border-rose-900/50">
                {error}
              </div>
            )}

            {/* Title / Description */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">
                Attachment Label / Description
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Customer Confirmation Proof"
                className={inputCls}
                required
              />

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESET_NAMES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setName(preset)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                      name === preset
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 font-medium'
                        : 'bg-gray-50 dark:bg-slate-700/40 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    {name === preset && <Check size={10} className="inline mr-1" />}
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* File Dropzone */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">
                Select File (Image / Document)
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 rounded-xl p-5 text-center cursor-pointer transition-all bg-gray-50/50 dark:bg-slate-700/30 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-36 mx-auto rounded-lg border border-gray-200 dark:border-slate-600 object-contain bg-white dark:bg-slate-800 p-1"
                    />
                    <p className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate">
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </p>
                    <p className="text-[11px] text-purple-600 dark:text-purple-400">Click to replace file</p>
                  </div>
                ) : file ? (
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto">
                      <FileText size={20} />
                    </div>
                    <p className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate">{file.name}</p>
                    <p className="text-[11px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <ImageIcon size={20} />
                    </div>
                    <p className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      Click or drag & drop file here
                    </p>
                    <p className="text-[11px] text-gray-400">PNG, JPG, WEBP, or PDF up to 10MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0 bg-gray-50/50 dark:bg-slate-800/80 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full sm:w-auto px-5 py-2 text-sm text-white font-medium rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: '#875a7b' }}
            >
              {uploading ? (
                <>
                  <span className="spinner w-3.5 h-3.5 border-white" /> Uploading…
                </>
              ) : (
                'Upload Attachment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesOrderAttachmentModal;
