import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Building2, Phone, Mail, MapPin, RefreshCw } from 'lucide-react';
import { getVendors, createVendor, updateVendor, deleteVendor } from '../../services/vendorsService';

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getVendors();
      setVendors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormName(vendor.name || '');
      setFormContactPerson(vendor.contactPerson || '');
      setFormPhone(vendor.phone || '');
      setFormEmail(vendor.email || '');
      setFormAddress(vendor.address || '');
      setFormGstin(vendor.gstin || '');
    } else {
      setEditingVendor(null);
      setFormName('');
      setFormContactPerson('');
      setFormPhone('');
      setFormEmail('');
      setFormAddress('');
      setFormGstin('');
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return alert('Vendor name is required');
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        contactPerson: formContactPerson.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        address: formAddress.trim(),
        gstin: formGstin.trim(),
      };

      if (editingVendor) {
        await updateVendor(editingVendor.id, payload);
      } else {
        await createVendor(payload);
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error saving vendor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await deleteVendor(id);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete vendor');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="text-purple-600 dark:text-purple-400" size={24} /> Vendor Configuration
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Manage suppliers and manufacturers available for Purchase Orders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors hover:opacity-90 flex items-center gap-2"
          style={{ background: '#875a7b' }}
        >
          <Plus size={16} /> Add Vendor
        </button>
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <div className="py-12 flex justify-center text-gray-500">
          <RefreshCw className="animate-spin mr-2" size={20} /> Loading vendors...
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-gray-900 dark:text-slate-100 font-medium">No Vendors Added</h3>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Click "Add Vendor" above to configure suppliers for your Purchase Orders.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-900 dark:text-slate-100 text-base">{vendor.name}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(vendor)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(vendor.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-600 dark:text-slate-300">
                  {vendor.contactPerson && (
                    <p><span className="font-medium text-gray-800 dark:text-slate-200">Contact:</span> {vendor.contactPerson}</p>
                  )}
                  {vendor.phone && (
                    <p className="flex items-center gap-1.5"><Phone size={13} className="text-gray-400" /> {vendor.phone}</p>
                  )}
                  {vendor.email && (
                    <p className="flex items-center gap-1.5"><Mail size={13} className="text-gray-400" /> {vendor.email}</p>
                  )}
                  {vendor.address && (
                    <p className="flex items-start gap-1.5"><MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" /> {vendor.address}</p>
                  )}
                  {vendor.gstin && (
                    <p className="text-slate-500 pt-1 font-mono">GSTIN: {vendor.gstin}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 dark:bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-slate-100 text-base">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase mb-1">
                  Vendor / Factory Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Royal Woodcraft Ltd"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="vendor@factory.com"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={formGstin}
                    onChange={(e) => setFormGstin(e.target.value)}
                    placeholder="29AAAAA0000A1Z5"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase mb-1">Address</label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Factory or dispatch address..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 hover:opacity-90 transition-colors"
                  style={{ background: '#875a7b' }}
                >
                  {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  {editingVendor ? 'Update Vendor' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
