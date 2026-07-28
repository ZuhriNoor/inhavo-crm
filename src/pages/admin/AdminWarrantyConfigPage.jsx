import { useState, useEffect } from 'react';
import { Save, CheckCircle, RefreshCw } from 'lucide-react';
import { getWarrantySettings, updateWarrantySettings } from '../../services/warrantiesService';

const AdminWarrantyConfigPage = () => {
  const [termsText, setTermsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settings = await getWarrantySettings();
      // Also handle legacy format if they saved it before this update
      if (settings.terms && Array.isArray(settings.terms)) {
        setTermsText(settings.terms.join('\n'));
      } else {
        setTermsText(settings.termsText || '');
      }
    } catch (error) {
      console.error('Error fetching warranty settings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateWarrantySettings({ termsText });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <RefreshCw className="animate-spin mr-2" size={20} /> Loading settings...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 dark:bg-slate-900 transition-colors p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">Warranty Settings</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">Configure the global standard terms that appear on all generated warranty certificates.</p>
          </div>
          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
            {saved && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-medium">
                <CheckCircle size={16} /> Saved
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white rounded-lg shadow-sm hover:opacity-90 disabled:opacity-50 transition-colors shrink-0"
              style={{ background: '#875a7b' }}
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Global Terms */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm sm:text-base">Standard Warranty Terms</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">This text will be displayed exactly as typed on the generated warranty certificate.</p>
          </div>
          
          <div className="p-4 sm:p-5">
            <textarea
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              className="w-full px-3.5 sm:px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xs sm:text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-colors resize-y leading-relaxed"
              rows={12}
              placeholder="Enter warranty terms and conditions..."
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminWarrantyConfigPage;
