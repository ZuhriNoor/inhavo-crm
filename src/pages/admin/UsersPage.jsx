// UsersPage — Admin: manage users
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, X, Shield, RefreshCw } from 'lucide-react';
import { getUsers, updateUser, deleteUserProfile } from '../../services/usersService';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '../../services/firebase';
import { getStores } from '../../services/storesService';
import { getInitials, stringToColor } from '../../utils/helpers';

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400';

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
  const isEditing = !!editUser;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      displayName: editUser?.displayName || '',
      email: editUser?.email || '',
      password: '',
      role: editUser?.role || 'user',
      assignedStores: editUser?.assignedStores || [],
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
          assignedStores,
        });
      } else {
        // Create auth user via secondary app (keeps admin signed in)
        const uid = await createUserWithSecondaryApp(data.email, data.password);
        // Write Firestore profile under UID
        await setDoc(doc(db, 'users', uid), {
          uid,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          assignedStores,
          createdAt: serverTimestamp(),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('User save error:', err);
      alert(err.message || 'Failed to save user.');
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Edit User' : 'New User'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <input
              {...register('displayName', { required: 'Name is required' })}
              className={inputCls}
              placeholder="John Smith"
            />
            {errors.displayName && <p className="text-xs text-red-500 mt-0.5">{errors.displayName.message}</p>}
          </div>

          {!isEditing && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input
                  {...register('email', { required: 'Email is required' })}
                  type="email"
                  className={inputCls}
                  placeholder="user@example.com"
                />
                {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select {...register('role')} className={inputCls}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Assigned Stores</label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto border border-gray-100 rounded-lg p-2">
              {stores.length === 0 ? (
                <p className="text-xs text-gray-400 py-1">No stores yet. Create stores first.</p>
              ) : (
                stores.map((store) => (
                  <label key={store.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 rounded">
                    <input
                      type="checkbox"
                      value={store.id}
                      {...register('assignedStores')}
                      className="accent-purple-600 w-3.5 h-3.5"
                    />
                    <span className="text-gray-700">{store.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60 flex items-center gap-2"
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

  const getStoreNames = (storeIds) => {
    if (!storeIds || storeIds.length === 0) return 'No stores assigned';
    return storeIds
      .map((id) => stores.find((s) => s.id === id)?.name || id)
      .join(', ');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <p className="text-sm text-gray-500">{users.length} user(s)</p>
        <div className="flex items-center gap-2">
          <button onClick={loadData} disabled={loading} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setEditingUser(null); setShowModal(true); }}
            className="flex items-center gap-2 px-3.5 py-2 text-sm text-white rounded-lg"
            style={{ background: '#875a7b' }}
          >
            <Plus size={15} /> New User
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No users yet.</div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const uid = u.uid || u.id;
              const avatarColor = stringToColor(u.displayName);
              return (
                <div key={uid} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-all">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: avatarColor }}
                  >
                    {getInitials(u.displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">{u.displayName}</p>
                      {u.role === 'admin' && (
                        <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          <Shield size={10} /> Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{u.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {getStoreNames(u.assignedStores)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingUser(u); setShowModal(true); }}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                      title="Edit user"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
