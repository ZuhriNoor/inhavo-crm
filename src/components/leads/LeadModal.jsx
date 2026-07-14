// LeadModal — Create/Edit lead form in a modal dialog
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, User, Building2, Phone, Mail, MapPin, Calendar, StickyNote } from 'lucide-react';
import { createLead, updateLead } from '../../services/leadsService';
import { notifyLeadAssigned } from '../../services/notificationsService';
import { toInputDate, fromInputDate } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

const Field = ({ label, icon: Icon, error, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    <div className="relative">
      {Icon && (
        <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      )}
      {children}
    </div>
    {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
  </div>
);

const inputCls = (hasIcon) =>
  `w-full py-2 pr-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all ${
    hasIcon ? 'pl-9' : 'pl-3'
  }`;

const LeadModal = ({ lead, stages, users, storeId, onClose, onSaved }) => {
  const { user, profile } = useAuth();
  const isEditing = !!lead;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      customerName: '',
      company: '',
      phone: '',
      email: '',
      address: '',
      assignedUserId: user?.uid || '',
      stageId: stages?.[0]?.id || '',
      notes: '',
      nextFollowUp: '',
    },
  });

  // Pre-fill when editing
  useEffect(() => {
    if (lead) {
      reset({
        customerName: lead.customerName || '',
        company: lead.company || '',
        phone: lead.phone || '',
        email: lead.email || '',
        address: lead.address || '',
        assignedUserId: lead.assignedUserId || '',
        stageId: lead.stageId || stages?.[0]?.id || '',
        notes: lead.notes || '',
        nextFollowUp: lead.nextFollowUp ? toInputDate(lead.nextFollowUp) : '',
      });
    }
  }, [lead, reset, stages]);

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      storeId,
      nextFollowUp: data.nextFollowUp ? fromInputDate(data.nextFollowUp) : null,
      createdBy: user?.uid,
    };

    try {
      if (isEditing) {
        await updateLead(lead.id, payload);
        // Notify if assignee changed
        if (data.assignedUserId && data.assignedUserId !== lead.assignedUserId) {
          await notifyLeadAssigned(data.assignedUserId, data.customerName, lead.id);
        }
      } else {
        const newId = await createLead(payload);
        if (data.assignedUserId) {
          await notifyLeadAssigned(data.assignedUserId, data.customerName, newId);
        }
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to save lead:', err);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Edit Lead' : 'New Lead'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-4">
            {/* Customer Name */}
            <Field label="Customer Name *" icon={User} error={errors.customerName?.message}>
              <input
                {...register('customerName', { required: 'Customer name is required' })}
                className={inputCls(true)}
                placeholder="John Smith"
              />
            </Field>

            {/* Company */}
            <Field label="Company" icon={Building2}>
              <input
                {...register('company')}
                className={inputCls(true)}
                placeholder="Acme Corp"
              />
            </Field>

            {/* Phone & Email */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" icon={Phone}>
                <input
                  {...register('phone')}
                  className={inputCls(true)}
                  placeholder="+91 98765 43210"
                />
              </Field>
              <Field label="Email" icon={Mail}>
                <input
                  {...register('email')}
                  type="email"
                  className={inputCls(true)}
                  placeholder="john@example.com"
                />
              </Field>
            </div>

            {/* Address */}
            <Field label="Address" icon={MapPin}>
              <input
                {...register('address')}
                className={inputCls(true)}
                placeholder="123 Main St, Mumbai"
              />
            </Field>

            {/* Stage & Assignee */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stage</label>
                <select
                  {...register('stageId')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
                >
                  {stages?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
                <select
                  {...register('assignedUserId')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
                >
                  <option value="">Unassigned</option>
                  {users?.map((u) => (
                    <option key={u.uid || u.id} value={u.uid || u.id}>
                      {u.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Next Follow-up */}
            <Field label="Next Follow-up" icon={Calendar}>
              <input
                {...register('nextFollowUp')}
                type="date"
                className={inputCls(true)}
              />
            </Field>

            {/* Notes */}
            <Field label="Notes" icon={StickyNote}>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 resize-none"
                placeholder="Add notes here…"
              />
            </Field>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm text-white font-medium rounded-lg transition-all disabled:opacity-60 flex items-center gap-2"
              style={{ background: '#875a7b' }}
            >
              {isSubmitting ? (
                <><span className="spinner w-3 h-3 border-white" /> Saving…</>
              ) : (
                isEditing ? 'Save Changes' : 'Create Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;
