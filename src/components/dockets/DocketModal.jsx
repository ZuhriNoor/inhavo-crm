import { useState, useEffect } from 'react';
import { X, Save, FileText, CheckCircle, Image as ImageIcon, File as FileIcon, Upload, Trash2, AlertCircle } from 'lucide-react';
import { createDocket, updateDocketWithFiles, getDocketTemplates } from '../../services/docketsService';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { DocketPDF } from '../../utils/docketPdfTemplate';
import LoadingScreen from '../shared/LoadingScreen';
import { compressImageFile, loadRemoteImageAsDataUrl } from '../../utils/imageUtils';
import { useStore } from '../../contexts/StoreContext';

export default function DocketModal({ isOpen, onClose, saleOrder, item, existingDocket, onDocketCreated }) {
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // General Info
  const [generalDescription, setGeneralDescription] = useState('');
  const [generalImageFile, setGeneralImageFile] = useState(null);
  const [existingGeneralImageUrl, setExistingGeneralImageUrl] = useState(null);
  
  // Dynamic Fields
  const [selectedFields, setSelectedFields] = useState({}); // { [key]: boolean }
  const [fieldData, setFieldData] = useState({}); // { [key]: { description: '', imageFile: null, imageUrl: null } }
  
  // Extra Attachments
  const [additionalFiles, setAdditionalFiles] = useState([]); // Array of File objects
  const [existingExtraImageUrls, setExistingExtraImageUrls] = useState([]);
  
  const [step, setStep] = useState(1); // 1 = Draft, 2 = Confirm
  const [loading, setLoading] = useState(false);
  const [savedDocket, setSavedDocket] = useState(null);
  const [previewPayload, setPreviewPayload] = useState(null);
  const { availableStores } = useStore();

  const currentStore = availableStores.find(s => s.id === saleOrder?.storeId);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const data = await getDocketTemplates();
      setTemplates(data);
      
      if (existingDocket) {
        const tpl = data.find(t => t.id === existingDocket.templateId) || data[0];
        setSelectedTemplate(tpl);
        setGeneralDescription(existingDocket.generalDescription || '');
        setExistingGeneralImageUrl(existingDocket.generalImageUrl || null);
        setExistingExtraImageUrls(existingDocket.extraImageUrls || []);
        
        const selFields = {};
        const fData = {};
        if (existingDocket.dynamicFields) {
          existingDocket.dynamicFields.forEach(f => {
            selFields[f.key] = true;
            fData[f.key] = {
              description: f.description || '',
              imageFile: null,
              imageUrl: f.imageUrl || null
            };
          });
        }
        setSelectedFields(selFields);
        setFieldData(fData);
      } else if (data.length > 0) {
        setSelectedTemplate(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  if (!isOpen) return null;

  const handleFieldToggle = (key) => {
    setSelectedFields(prev => ({ ...prev, [key]: !prev[key] }));
    if (!selectedFields[key] && !fieldData[key]) {
      setFieldData(prev => ({ ...prev, [key]: { description: '', imageFile: null, imageUrl: null } }));
    }
  };

  const handleFieldDataChange = (key, fieldName, value) => {
    setFieldData(prev => ({
      ...prev,
      [key]: { ...prev[key], [fieldName]: value }
    }));
  };

  const generatePreviewDocket = () => {
    return {
      salesOrderId: saleOrder.id,
      salesOrderNumber: saleOrder.salesOrderNumber,
      productDetails: {
        name: item.name,
        qty: item.qty,
        description: item.description || ''
      },
      customerDetails: saleOrder.customerDetails,
      templateId: selectedTemplate?.id || 'custom',
      templateName: selectedTemplate?.name || 'Custom',
      generalDescription,
      generalImageFile,
      generalImageUrl: generalImageFile
        ? URL.createObjectURL(generalImageFile)
        : existingGeneralImageUrl,
      dynamicFields: Object.keys(selectedFields)
        .filter(k => selectedFields[k])
        .map(k => {
          const tplField = selectedTemplate?.fields?.find(f => f.key === k) || { label: k };
          return {
            key: k,
            label: tplField.label || k,
            description: fieldData[k]?.description || '',
            imageFile: fieldData[k]?.imageFile || null,
            imageUrl: fieldData[k]?.imageFile
              ? URL.createObjectURL(fieldData[k].imageFile)
              : (fieldData[k]?.imageUrl || null)
          };
        }),
      extraImageUrls: [
        ...existingExtraImageUrls,
        ...additionalFiles
          .filter(f => !f.type?.toLowerCase().includes('pdf') && !f.name?.toLowerCase().endsWith('.pdf'))
          .map(f => URL.createObjectURL(f))
      ],
      extraPdfCount: additionalFiles.filter(f => f.type?.toLowerCase().includes('pdf') || f.name?.toLowerCase().endsWith('.pdf')).length,
      docketNumber: existingDocket ? existingDocket.docketNumber : 'PREVIEW',
      storeAddress: currentStore?.address || ''
    };
  };

  const handleReviewConfiguration = async () => {
    if (!selectedTemplate) return alert("Please select a template");
    setLoading(true);
    try {
      const preview = generatePreviewDocket();
      const [generalDataUrl, dynamicFieldsDataUrls, extraDataUrls] = await Promise.all([
        loadRemoteImageAsDataUrl(preview.generalImageUrl).catch(() => preview.generalImageUrl),
        Promise.all(
          (preview.dynamicFields || []).map(async (f) => ({
            ...f,
            imageUrl: await loadRemoteImageAsDataUrl(f.imageUrl).catch(() => f.imageUrl)
          }))
        ),
        Promise.all(
          (preview.extraImageUrls || []).map((url) => loadRemoteImageAsDataUrl(url).catch(() => url))
        )
      ]);

      const finalPreview = {
        ...preview,
        generalImageUrl: generalDataUrl,
        dynamicFields: dynamicFieldsDataUrls,
        extraImageUrls: extraDataUrls.filter(Boolean)
      };

      setPreviewPayload(finalPreview);
      setStep(2);
    } catch (err) {
      console.error('Error preparing PDF preview:', err);
      setPreviewPayload(generatePreviewDocket());
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        ...previewPayload,
        additionalFiles
      };
      
      let result;
      if (existingDocket) {
        result = await updateDocketWithFiles(existingDocket.id, payload);
      } else {
        result = await createDocket(payload);
      }
      
      setSavedDocket({ ...result });
      if (onDocketCreated) onDocketCreated();
    } catch (error) {
      console.error('Error saving docket:', error);
      alert('Failed to save docket: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingTemplates) {
    return (
      <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6"><LoadingScreen /></div>
      </div>
    );
  }

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col transition-colors">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="text-purple-600 dark:text-purple-400" size={20} />
              {existingDocket ? 'Edit Production Docket' : 'Create Production Docket'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">Order #{saleOrder.salesOrderNumber} - {item.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!savedDocket && step === 1 && (
            <>
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Furniture Category</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {templates.map(tpl => (
                    <button
                      type="button"
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`px-4 py-3 border rounded-xl text-sm font-medium transition-all ${
                        selectedTemplate?.id === tpl.id 
                        ? 'border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-900/40 dark:text-purple-300' 
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 text-gray-700 dark:text-slate-300'
                      }`}
                    >
                      {tpl.name}
                    </button>
                  ))}
                  {templates.length === 0 && <span className="text-sm text-gray-400">No templates found. Create one in Admin Settings.</span>}
                </div>
              </div>

              {/* General Specs */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">General Description & Reference</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Description & Specifications (Width, Height, etc.)</label>
                    <textarea
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-purple-500 text-sm text-gray-900 dark:text-slate-100 transition-colors"
                      value={generalDescription}
                      onChange={(e) => setGeneralDescription(e.target.value)}
                      placeholder="Enter general product dimensions and specs..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">General Reference Image</label>
                    <div className="flex items-center gap-4">
                      {generalImageFile ? (
                        <div className="relative">
                          <img src={URL.createObjectURL(generalImageFile)} alt="Reference" className="h-24 w-24 object-cover rounded-lg border border-gray-200" />
                          <button type="button" onClick={() => setGeneralImageFile(null)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full"><X size={14}/></button>
                        </div>
                      ) : existingGeneralImageUrl ? (
                        <div className="relative">
                          <img src={existingGeneralImageUrl} alt="Reference" className="h-24 w-24 object-cover rounded-lg border border-gray-200" />
                          <button type="button" onClick={() => setExistingGeneralImageUrl(null)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full" title="Remove image"><X size={14}/></button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-6 h-6 text-gray-400" />
                            <p className="text-xs text-gray-500">Upload Image</p>
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => { 
                            if(e.target.files[0]) {
                              const compressed = await compressImageFile(e.target.files[0]);
                              setGeneralImageFile(compressed);
                            }
                          }} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Fields */}
              {selectedTemplate && selectedTemplate.fields?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">Dynamic Properties ({selectedTemplate.name})</h3>
                  <div className="space-y-4">
                    {selectedTemplate.fields.map(field => (
                      <div key={field.key} className="border border-gray-100 dark:border-slate-700 rounded-xl p-4 bg-gray-50/30 dark:bg-slate-800/50">
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                          <input
                            type="checkbox"
                            checked={!!selectedFields[field.key]}
                            onChange={() => handleFieldToggle(field.key)}
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          />
                          <span className="font-medium text-gray-800 dark:text-slate-200">{field.label}</span>
                        </label>
                        
                        {selectedFields[field.key] && (
                          <div className="pl-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Description</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100"
                                value={fieldData[field.key]?.description || ''}
                                onChange={(e) => handleFieldDataChange(field.key, 'description', e.target.value)}
                                placeholder={`Enter ${field.label.toLowerCase()} description...`}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Attach Image</label>
                              <div className="flex items-center gap-4">
                                {fieldData[field.key]?.imageFile ? (
                                  <div className="relative">
                                    <img src={URL.createObjectURL(fieldData[field.key].imageFile)} alt={field.label} className="h-12 w-12 object-cover rounded-lg border border-gray-200" />
                                    <button type="button" onClick={() => handleFieldDataChange(field.key, 'imageFile', null)} className="absolute -top-1 -right-1 bg-red-100 text-red-600 p-0.5 rounded-full"><X size={12}/></button>
                                  </div>
                                ) : fieldData[field.key]?.imageUrl ? (
                                  <div className="relative">
                                    <img src={fieldData[field.key].imageUrl} alt={field.label} className="h-12 w-12 object-cover rounded-lg border border-gray-200" />
                                    <button type="button" onClick={() => handleFieldDataChange(field.key, 'imageUrl', null)} className="absolute -top-1 -right-1 bg-red-100 text-red-600 p-0.5 rounded-full" title="Remove image"><X size={12}/></button>
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-gray-600 dark:text-slate-300">
                                    <ImageIcon size={16} /> Choose Image
                                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => { 
                                      if(e.target.files[0]) {
                                        const compressed = await compressImageFile(e.target.files[0]);
                                        handleFieldDataChange(field.key, 'imageFile', compressed);
                                      }
                                    }} />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Attachments */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">Extra Attachments (PDFs & Images)</h3>
                <div className="space-y-3">
                  <label className="flex justify-center w-full h-16 px-4 transition bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
                      <span className="flex items-center space-x-2">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-600 dark:text-slate-300">Click to upload additional files</span>
                      </span>
                      <input type="file" name="file_upload" className="hidden" multiple accept="image/*,application/pdf" onChange={async (e) => {
                        if(e.target.files) {
                          const files = Array.from(e.target.files);
                          const compressedFiles = await Promise.all(files.map(f => compressImageFile(f)));
                          setAdditionalFiles(prev => [...prev, ...compressedFiles]);
                        }
                      }} />
                  </label>
                  
                  {(existingExtraImageUrls.length > 0 || additionalFiles.length > 0) && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {existingExtraImageUrls.map((url, i) => (
                        <div key={`existing-extra-${i}`} className="flex items-center justify-between p-2 bg-purple-50/50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <ImageIcon size={16} className="text-purple-600 shrink-0" />
                            <span className="text-xs text-purple-900 dark:text-purple-200 truncate">Saved Image #{i + 1}</span>
                          </div>
                          <button type="button" onClick={() => setExistingExtraImageUrls(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 shrink-0 ml-2" title="Remove">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {additionalFiles.map((file, i) => (
                        <div key={`new-extra-${i}`} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                          <div className="flex items-center gap-2 overflow-hidden">
                            {file.type.includes('pdf') ? <FileText size={16} className="text-red-500 shrink-0" /> : <ImageIcon size={16} className="text-blue-500 shrink-0" />}
                            <span className="text-xs text-gray-700 dark:text-slate-300 truncate">{file.name}</span>
                          </div>
                          <button type="button" onClick={() => setAdditionalFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 shrink-0 ml-2">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!savedDocket && step === 2 && (
            <div className="flex flex-col h-[60vh] space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-lg text-sm border border-blue-100 dark:border-blue-800/30">
                <h4 className="font-semibold mb-1">Live PDF Preview</h4>
                <p className="opacity-80">This is how your final docket will look. Any extra PDF attachments will be merged at the end after you click confirm.</p>
              </div>
              <div className="flex-1 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-900">
                <PDFViewer width="100%" height="100%" showToolbar={true}>
                  <DocketPDF docket={previewPayload || generatePreviewDocket()} template={selectedTemplate} />
                </PDFViewer>
              </div>
            </div>
          )}

          {savedDocket && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Docket Created Successfully!</h3>
              <p className="text-gray-500 dark:text-slate-400 mb-6">Docket #{savedDocket.docketNumber} has been finalized.</p>
              
              <div className="flex gap-4">
                {savedDocket.pdfUrl && (
                  <a href={savedDocket.pdfUrl} target="_blank" rel="noreferrer" className="px-6 py-2.5 text-white rounded-lg font-medium shadow transition-colors flex items-center gap-2 hover:opacity-90" style={{ background: '#875a7b' }}>
                    <FileText size={18} /> View PDF
                  </a>
                )}
                <button type="button" onClick={onClose} className="px-6 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg font-medium shadow transition-colors hover:bg-gray-200">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!savedDocket && (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0 bg-gray-50/50 dark:bg-slate-800/80 rounded-b-2xl">
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                Back to Edit
              </button>
            )}
            {step === 1 && (
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                Cancel
              </button>
            )}
            
            {step === 1 ? (
              <button
                type="button"
                onClick={handleReviewConfiguration}
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 hover:opacity-90"
                style={{ background: '#875a7b' }}
              >
                {loading ? <><span className="spinner w-4 h-4 border-white border-2"></span> Loading Preview...</> : 'Review Configuration'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 hover:opacity-90"
                style={{ background: '#10b981' }} // emerald
              >
                {loading ? <><span className="spinner w-4 h-4 border-white border-2"></span> Processing...</> : <><Save size={16} /> Confirm & Save Docket</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
