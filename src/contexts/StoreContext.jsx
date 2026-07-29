// StoreContext — manages the currently selected store
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getStores } from '../services/storesService';

const StoreContext = createContext(null);
const STORAGE_KEY = 'inhavo_selected_store_id';

export const StoreProvider = ({ children }) => {
  const { isAdmin, assignedStores } = useAuth();
  const [allStores, setAllStores] = useState([]);
  const [availableStores, setAvailableStores] = useState([]);
  const [activeStore, setActiveStore] = useState(null);
  const [loadingStores, setLoadingStores] = useState(true);

  const handleSetActiveStore = (store) => {
    setActiveStore(store);
    if (store?.id) {
      localStorage.setItem(STORAGE_KEY, store.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  useEffect(() => {
    const fetchStores = async () => {
      setLoadingStores(true);
      try {
        const stores = await getStores();
        setAllStores(stores);

        const visible = isAdmin
          ? stores
          : stores.filter((s) => assignedStores.includes(s.id));

        setAvailableStores(visible);

        // Auto-select saved store from localStorage, or fallback to first available
        if (visible.length > 0) {
          const savedStoreId = localStorage.getItem(STORAGE_KEY);
          const matched = savedStoreId ? visible.find((s) => s.id === savedStoreId) : null;
          const target = matched || visible[0];
          setActiveStore(target);
          if (target?.id) {
            localStorage.setItem(STORAGE_KEY, target.id);
          }
        }
      } catch (err) {
        console.error('Failed to load stores:', err);
      } finally {
        setLoadingStores(false);
      }
    };

    fetchStores();
  }, [isAdmin, assignedStores]);

  const refreshStores = async () => {
    const stores = await getStores();
    setAllStores(stores);
    const visible = isAdmin
      ? stores
      : stores.filter((s) => assignedStores.includes(s.id));
    setAvailableStores(visible);
  };

  return (
    <StoreContext.Provider
      value={{
        allStores,
        availableStores,
        activeStore,
        setActiveStore: handleSetActiveStore,
        loadingStores,
        refreshStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};

export default StoreContext;
