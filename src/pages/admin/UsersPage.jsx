// UsersPage — Admin: manage users
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, X, Shield, RefreshCw, Mail } from 'lucide-react';
import { getUsers, updateUser, deleteUserProfile } from '../../services/usersService';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { db } from '../../services/firebase';
import { getStores } from '../../services/storesService';
import { getInitials, stringToColor } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

const inputCls =
  'w-full px-3 py-2 text-sm bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400';

/**
 * Creates a secondary Firebase app instance to register new users
 * without signing out the currently logged-in admin.
 */
const createUserWithSecondaryApp = async (email, password) => {
  const secondaryApp = initializeApp(
    {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    },
    `secondary-${Date.now()}`, // unique name avoids conflicts
  );
  const secondaryAuth = getAuth(secondaryApp);
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  // Sign out of the secondary app immediately
  await secondaryAuth.signOut();
  return cred.user.uid;
};

const UserModal = ({ user: editUser, stores, onClose, onSaved }) => {
  const { user: authUser, refreshProfile } = useAuth();
  const isEditing = !!editUser;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      displayName: editUser?.displayName || '',
      email: editUser?.email || '',
      password: '',
      role: editUser?.role || 'user',
      phone: editUser?.phone || '',
      location: editUser?.location || '',
      assignedStores: editUser?.assignedStores || [],
      canViewPurchaseOrders: editUser?.canViewPurchaseOrders || false,
      canManagePayments: editUser?.canManagePayments || false,
      dataAccessLevel: editUser?.dataAccessLevel || 'all',
    },
  });

  const onSubmit = async (data) => {
    try {
      const assignedStores = Array.isArray(data.assignedStores)
        ? data.assignedStores.filter(Boolean)
        : [data.assignedStores].filter(Boolean);

      if (isEditing) {
        await updateUser(editUser.uid || editUser.id, {
          displayName: data.displayName,
          role: data.role,
          phone: data.phone || '',
          location: data.location || '',
          assignedStores,
          canViewPurchaseOrders: data.canViewPurchaseOrders,
          canManagePayments: data.canManagePayments,
          dataAccessLevel: data.dataAccessLevel,
        });
        if (authUser && (editUser.uid || editUser.id) === authUser.uid) {
          await refreshProfile();
        }
      } else {
        // Create auth user via secondary app (keeps admin signed in)
        const uid = await createUserWithSecondaryApp(data.email, data.password);
        // Write Firestore profile under UID
        await setDoc(doc(db, 'users', uid), {
          uid,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          phone: data.phone || '',
          location: data.location || '',
          assignedStores,
          canViewPurchaseOrders: data.canViewPurchaseOrders,
          canManagePayments: data.canManagePayments,
          dataAccessLevel: data.dataAccessLevel,
          createdAt: serverTimestamp(),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('User save error:', err);
      alert(err.message || 'Failed to save user.');
    }
  };  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] md:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
            {isEditing ? 'Edit User' : 'New User'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 space-y-4 overflow-y-auto flex-1">
            <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Display Name *</label>
            <input
              {...register('displayName', { required: 'Name is required' })}
              className={inputCls}
              placeholder="John Doe"
            />
            {errors.displayName && <p className="text-xs text-red-500 mt-0.5">{errors.displayName.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Phone</label>
            <input
              {...register('phone')}
              type="text"
              className={inputCls}
              placeholder="+1 234 567 890"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Location</label>
            <input
              {...register('location')}
              type="text"
              className={inputCls}
              placeholder="e.g. New York, NY"
            />
          </div>

          {!isEditing && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Email *</label>
                <input
                  {...register('email', { required: 'Email is required' })}
                  type="email"
                  className={inputCls}
                  placeholder="john@example.com"
                />
                {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Password *</label>
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Min 6 characters' },
                  })}
                  type="password"
                  className={inputCls}
                  placeholder="Min 6 characters"
                />
                {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password.message}</p>}
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Role</label>
            <select {...register('role')} className={inputCls}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Data Access Level</label>
            <select {...register('dataAccessLevel')} className={inputCls}>
              <option value="all">All Store Data</option>
              <option value="own">Own Data Only</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/60 px-1 rounded py-1 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/40">
              <input
                type="checkbox"
                {...register('canViewPurchaseOrders')}
                className="accent-purple-600 w-4 h-4"
              />
              <span className="text-gray-700 dark:text-slate-200">Can View Purchase Orders</span>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/60 px-1 rounded py-1 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/40">
              <input
                type="checkbox"
                {...register('canManagePayments')}
                className="accent-purple-600 w-4 h-4"
              />
              <span className="text-gray-700 dark:text-slate-200">Can Manage Payments (Sale Orders)</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-2">Assigned Stores</label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-700/40 rounded-lg p-2">
              {stores.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-slate-400 py-1">No stores yet. Create stores first.</p>
              ) : (
                stores.map((store) => (
                  <label key={store.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/60 px-1 rounded">
                    <input
                      type="checkbox"
                      value={store.id}
                      {...register('assignedStores')}
                      className="accent-purple-600 w-3.5 h-3.5"
                    />
                    <span className="text-gray-700 dark:text-slate-200">{store.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>


          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0 bg-gray-50/50 dark:bg-slate-800/80 rounded-b-2xl">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-center">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: '#875a7b' }}
            >
              {isSubmitting
                ? <><span className="spinner w-3 h-3 border-white" /> Saving…</>
                : (isEditing ? 'Save Changes' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, storesData] = await Promise.all([
        getUsers(),
        getStores(),
      ]);
      setUsers(usersData);
      setStores(storesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (user) => {
    if (!confirm(`Delete "${user.displayName}"? Their Auth account will remain but their access will be removed.`)) return;
    try {
      await deleteUserProfile(user.uid || user.id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (user) => {
    if (!confirm(`Send password reset email to ${user.email}?`)) return;
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, user.email);
      alert(`Password reset email sent to ${user.email}`);
    } catch (err) {
      alert(`Error sending reset email: ${err.message}`);
    }
  };

  const getStoreNames = (storeIds) => {
    if (!storeIds || storeIds.length === 0) return 'No stores assigned';
    return storeIds
      .map((id) => stores.find((s) => s.id === id)?.name || id)
      .join(', ');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/50 dark:bg-slate-900 transition-colors">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 shrink-0">
        <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{users.length} user(s)</p>
        <div className="flex items-center gap-2">
          <button onClick={loadData} disabled={loading} className="p-2 text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setEditingUser(null); setShowModal(true); }}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm text-white font-medium rounded-lg"
            style={{ background: '#875a7b' }}
          >
            <Plus size={15} /> New User
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500 text-sm">No users yet.</div>
        ) : (
          <div className="space-y-2.5">
            {users.map((u) => {
              const uid = u.uid || u.id;
              const avatarColor = stringToColor(u.displayName);
              return (
                <div key={uid} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto flex-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: avatarColor }}
                    >
                      {getInitials(u.displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">{u.displayName}</p>
                        {u.role === 'admin' && (
                          <span className="flex items-center gap-1 text-[10px] sm:text-xs bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full shrink-0 font-medium">
                            <Shield size={10} /> Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-slate-400 truncate">{u.email}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5 truncate">
                        {getStoreNames(u.assignedStores)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end border-gray-100 dark:border-slate-700/60">
                    <button
                      onClick={() => handleResetPassword(u)}
                      className="p-2 text-gray-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-all"
                      title="Send password reset email"
                    >
                      <Mail size={14} />
                    </button>
                    <button
                      onClick={() => { setEditingUser(u); setShowModal(true); }}
                      className="p-2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                      title="Edit user"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="p-2 text-red-400 dark:text-rose-400 hover:text-red-600 dark:hover:text-rose-300 hover:bg-red-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                      title="Delete user"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <UserModal
          user={editingUser}
          stores={stores}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          onSaved={loadData}
        />
      )}
    </div>
  );
};

export default UsersPage;
