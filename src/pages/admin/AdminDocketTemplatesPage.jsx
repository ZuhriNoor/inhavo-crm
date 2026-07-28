import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { getDocketTemplates, createDocketTemplate, updateDocketTemplate, deleteDocketTemplate } from '../../services/docketsService';
import LoadingScreen from '../../components/shared/LoadingScreen';

export default function AdminDocketTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await getDocketTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingTemplate({
      id: null,
      name: '',
      fields: []
    });
  };

  const handleAddField = () => {
    setEditingTemplate(prev => ({
      ...prev,
      fields: [...prev.fields, { key: Date.now().toString(), label: '' }]
    }));
  };

  const handleFieldChange = (index, val) => {
    setEditingTemplate(prev => {
      const newFields = [...prev.fields];
      newFields[index].label = val;
      // Key can just be derived from label if needed, but unique ID is safer for now.
      return { ...prev, fields: newFields };
    });
  };

  const handleRemoveField = (index) => {
    setEditingTemplate(prev => {
      const newFields = [...prev.fields];
      newFields.splice(index, 1);
      return { ...prev, fields: newFields };
    });
  };

  const handleSave = async () => {
    if (!editingTemplate.name.trim()) return alert("Template name is required");
    
    // Clean fields
    const cleanedFields = editingTemplate.fields
      .filter(f => f.label.trim())
      .map(f => ({
        key: f.label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        label: f.label.trim()
      }));

    const dataToSave = {
      name: editingTemplate.name.trim(),
      fields: cleanedFields
    };

    setLoading(true);
    try {
      if (editingTemplate.id) {
        await updateDocketTemplate(editingTemplate.id, dataToSave);
      } else {
        await createDocketTemplate(dataToSave);
      }
      setEditingTemplate(null);
      await fetchTemplates();
    } catch (error) {
      console.error("Failed to save template", error);
      alert("Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    setLoading(true);
    try {
      await deleteDocketTemplate(id);
      await fetchTemplates();
    } catch (error) {
      console.error("Failed to delete", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && templates.length === 0) return <LoadingScreen />;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/50 dark:bg-slate-900 transition-colors">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 px-4 sm:px-6 py-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shrink-0">
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">Docket Templates</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Manage furniture types and their dynamic fields</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm text-white font-medium rounded-lg transition-colors hover:opacity-90 self-stretch sm:self-auto justify-center"
          style={{ background: '#875a7b' }}
        >
          <Plus size={16} /> Add Template
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4 gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-base sm:text-lg">{tpl.name}</h3>
                <div className="flex gap-1 sm:gap-2 shrink-0">
                  <button onClick={() => setEditingTemplate(tpl)} className="p-1.5 text-gray-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(tpl.id)} className="p-1.5 text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Configured Fields</p>
                {tpl.fields?.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No fields configured.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tpl.fields?.map((f, i) => (
                      <span key={i} className="px-2.5 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs rounded-md border border-gray-200 dark:border-slate-600">
                        {f.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {editingTemplate.id ? 'Edit Template' : 'New Template'}
              </h2>
              <button onClick={() => setEditingTemplate(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Furniture Type (Category Name)</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Sofa, Bed, Wardrobe..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 dark:text-slate-100 text-sm"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Dynamic Fields</label>
                  <button onClick={handleAddField} className="text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline flex items-center gap-1">
                    <Plus size={14} /> Add Field
                  </button>
                </div>
                
                <div className="space-y-2.5">
                  {editingTemplate.fields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleFieldChange(idx, e.target.value)}
                        placeholder="e.g. Fabric Finish, Leg Color..."
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-slate-100"
                      />
                      <button onClick={() => handleRemoveField(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {editingTemplate.fields.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-slate-400 italic text-center py-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-dashed border-gray-300 dark:border-slate-600">
                      No fields added. Click "Add Field" to add customizable options.
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex flex-col-reverse sm:flex-row justify-end gap-2 bg-gray-50/50 dark:bg-slate-800/80 shrink-0">
              <button onClick={() => setEditingTemplate(null)} className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-center">
                Cancel
              </button>
              <button onClick={handleSave} disabled={loading} className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50" style={{ background: '#875a7b' }}>
                <Save size={16} /> Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
