// StoreContext — manages the currently selected store
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getStores } from '../services/storesService';

const StoreContext = createContext(null);

export const StoreProvider = ({ children }) => {
  const { isAdmin, assignedStores } = useAuth();
  const [allStores, setAllStores] = useState([]);
  const [availableStores, setAvailableStores] = useState([]);
  const [activeStore, setActiveStore] = useState(null);
  const [loadingStores, setLoadingStores] = useState(true);

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

        // Auto-select the first available store
        if (visible.length > 0) {
          setActiveStore((prev) => {
            if (prev && visible.find((s) => s.id === prev.id)) return prev;
            return visible[0];
          });
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
        setActiveStore,
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
