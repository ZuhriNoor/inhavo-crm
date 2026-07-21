// StoresPage — Admin: manage stores
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, X, Store, RefreshCw } from 'lucide-react';
import { getStores, createStore, updateStore, deleteStore } from '../../services/storesService';
import { useStore } from '../../contexts/StoreContext';

const inputCls =
  'w-full px-3 py-2 text-sm bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400';

const StoreModal = ({ store: editStore, onClose, onSaved }) => {
  const isEditing = !!editStore;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: editStore?.name || '',
      description: editStore?.description || '',
      address: editStore?.address || '',
      bankDetails: editStore?.bankDetails || '',
      defaultTerms: editStore?.defaultTerms || '',
    },
  });

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await updateStore(editStore.id, data);
      } else {
        await createStore(data);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
            {isEditing ? 'Edit Store' : 'New Store'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0">
          <div className="px-6 py-4 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Store Name *</label>
              <input
                {...register('name', { required: 'Name is required' })}
                className={inputCls}
                placeholder="Mumbai Branch"
              />
              {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Description</label>
              <textarea
                {...register('description')}
                rows={2}
                className={inputCls + ' resize-none'}
                placeholder="Optional description…"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Company Address (For PDF)</label>
              <textarea
                {...register('address')}
                rows={2}
                className={inputCls + ' resize-none'}
                placeholder="123 Business Rd, City, Country"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Bank Details (For PDF)</label>
              <textarea
                {...register('bankDetails')}
                rows={2}
                className={inputCls + ' resize-none'}
                placeholder="Bank Name: XYZ Bank&#10;A/C No: 123456789"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Default Terms (For PDF)</label>
              <textarea
                {...register('defaultTerms')}
                rows={2}
                className={inputCls + ' resize-none'}
                placeholder="1. Payment 100% advance..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0 bg-gray-50 dark:bg-slate-800/80 rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60 flex items-center gap-2"
              style={{ background: '#875a7b' }}
            >
              {isSubmitting ? <><span className="spinner w-3 h-3 border-white" /> Saving…</> : (isEditing ? 'Save' : 'Create Store')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StoresPage = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const { refreshStores } = useStore();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStores();
      setStores(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (store) => {
    if (!confirm(`Delete store "${store.name}"? All associated data will become unlinked.`)) return;
    await deleteStore(store.id);
    await refreshStores();
    loadData();
  };

  const handleSaved = async () => {
    await refreshStores();
    loadData();
  };

  const STORE_COLORS = ['#875a7b', '#00a09d', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/50 dark:bg-slate-900 transition-colors">
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <p className="text-sm text-gray-500 dark:text-slate-400">{stores.length} store(s)</p>
        <div className="flex items-center gap-2">
          <button onClick={loadData} disabled={loading} className="p-2 text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setEditingStore(null); setShowModal(true); }}
            className="flex items-center gap-2 px-3.5 py-2 text-sm text-white rounded-lg"
            style={{ background: '#875a7b' }}
          >
            <Plus size={15} /> New Store
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
          </div>
        ) : stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-slate-500 gap-2">
            <Store size={36} className="opacity-30" />
            <p className="text-sm">No stores yet. Create one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stores.map((store, idx) => {
              const color = STORE_COLORS[idx % STORE_COLORS.length];
              return (
                <div key={store.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all">
                  <div className="h-1.5" style={{ background: color }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ background: color }}
                        >
                          <Store size={16} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-slate-100 text-sm">{store.name}</p>
                          {store.description && (
                            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">{store.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setEditingStore(store); setShowModal(true); }}
                          className="p-1.5 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(store)}
                          className="p-1.5 text-red-400 dark:text-rose-400 hover:text-red-600 dark:hover:text-rose-300 hover:bg-red-50 dark:hover:bg-rose-950/40 rounded-lg"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <StoreModal
          store={editingStore}
          onClose={() => { setShowModal(false); setEditingStore(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default StoresPage;
