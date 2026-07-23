// LeadModal — Create/Edit lead form in a modal dialog
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, User, Building2, Phone, Mail, MapPin, Calendar, StickyNote, Star, Target, Globe, IndianRupee, Briefcase } from 'lucide-react';
import { createLead, updateLead } from '../../services/leadsService';
import { notifyLeadAssigned } from '../../services/notificationsService';
import { toInputDate, fromInputDate } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

const LEAD_SOURCES = [
  'Walk-in Showroom',
  'WhatsApp',
  'Phone Call',
  'Facebook',
  'Google (Search/Ads)',
  'Website',
  'Referral',
  'Architect / Interior Designer',
  'Existing (Repeat) Customer',
];

const Field = ({ label, icon: Icon, error, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{label}</label>
    <div className="relative">
      {Icon && (
        <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none z-10" />
      )}
      {children}
    </div>
    {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
  </div>
);

const inputCls = (hasIcon) =>
  `w-full py-2 pr-3 text-sm bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 dark:focus:border-purple-400 transition-all ${
    hasIcon ? 'pl-9' : 'pl-3'
  }`;

const LeadModal = ({ lead, stages, users, storeId, onClose, onSaved }) => {
  const { user, profile } = useAuth();
  const isEditing = !!lead;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      opportunityTitle: '',
      customerName: '',
      company: '',
      phone: '',
      email: '',
      address: '',
      source: '',
      expectedRevenue: '',
      expectedClosingDate: '',
      lookingFor: '',
      priority: 0,
      assignedUserId: user?.uid || '',
      stageId: stages?.[0]?.id || '',
      notes: '',
      nextFollowUp: '',
    },
  });

  const currentPriority = watch('priority');

  // Pre-fill when editing
  useEffect(() => {
    if (lead) {
      reset({
        opportunityTitle: lead.opportunityTitle || '',
        customerName: lead.customerName || '',
        company: lead.company || '',
        phone: lead.phone || '',
        email: lead.email || '',
        address: lead.address || '',
        source: lead.source || '',
        expectedRevenue: lead.expectedRevenue || '',
        expectedClosingDate: lead.expectedClosingDate ? toInputDate(lead.expectedClosingDate) : '',
        lookingFor: lead.lookingFor || '',
        priority: lead.priority || 0,
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
      expectedRevenue: Number(data.expectedRevenue) || 0,
      expectedClosingDate: data.expectedClosingDate ? fromInputDate(data.expectedClosingDate) : null,
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
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
            {isEditing ? 'Edit Lead' : 'New Lead'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-2">Core Information</h3>
              
              <Field label="Opportunity Title *" icon={Briefcase} error={errors.opportunityTitle?.message}>
                <input
                  {...register('opportunityTitle', { required: 'Title is required' })}
                  className={inputCls(true)}
                  placeholder="e.g. 50 Laptops for ACME"
                />
              </Field>

              <Field label="Customer Name *" icon={User} error={errors.customerName?.message}>
                <input
                  {...register('customerName', { required: 'Customer name is required' })}
                  className={inputCls(true)}
                  placeholder="John Smith"
                />
              </Field>

              <Field label="Phone *" icon={Phone} error={errors.phone?.message}>
                <input
                  {...register('phone', { required: 'Phone is required' })}
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

              <Field label="Address / Location *" icon={MapPin} error={errors.address?.message}>
                <input
                  {...register('address', { required: 'Location is required' })}
                  className={inputCls(true)}
                  placeholder="123 Main St, Mumbai"
                />
              </Field>
              
              <Field label="Company" icon={Building2}>
                <input {...register('company')} className={inputCls(true)} placeholder="Acme Corp" />
              </Field>

              <Field label="Lead Source" icon={Globe}>
                <select {...register('source')} className={`${inputCls(true)} max-w-full truncate`}>
                  <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Select Lead Source</option>
                  {LEAD_SOURCES.map((src) => (
                    <option key={src} value={src} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 py-1">
                      {src}
                    </option>
                  ))}
                  {lead?.source && !LEAD_SOURCES.includes(lead.source) && (
                    <option value={lead.source} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">{lead.source}</option>
                  )}
                </select>
              </Field>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Sales Details</h3>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setValue('priority', currentPriority === star ? 0 : star)}
                      className={`transition-colors ${
                        star <= currentPriority ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-200 dark:text-slate-600 hover:text-yellow-200'
                      }`}
                    >
                      <Star size={16} fill={star <= currentPriority ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Expected Revenue" icon={IndianRupee}>
                <input
                  {...register('expectedRevenue')}
                  type="number"
                  className={inputCls(true)}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Expected Closing" icon={Target}>
                <input
                  {...register('expectedClosingDate')}
                  type="date"
                  className={inputCls(true)}
                />
              </Field>

              <Field label="Looking For" icon={StickyNote}>
                <textarea
                  {...register('lookingFor')}
                  rows={2}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 resize-none"
                  placeholder="Products or services requested…"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Stage</label>
                  <select
                    {...register('stageId')}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
                  >
                    {stages?.map((s) => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Assigned To</label>
                  <select
                    {...register('assignedUserId')}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Unassigned</option>
                    {users?.map((u) => (
                      <option key={u.uid || u.id} value={u.uid || u.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">{u.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Field label="Notes" icon={StickyNote}>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 resize-none"
                  placeholder="Additional notes…"
                />
              </Field>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2 text-sm text-white font-medium rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
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
