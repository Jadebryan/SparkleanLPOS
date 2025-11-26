import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { MinimizedModal } from '@/components/ui/ModalTabBar';

interface TabState {
  id: string;
  type: 'create-order';
  data: any; // Store form state/data
  draftId?: string | null;
  title: string;
  subtitle?: string;
  icon?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  onSaveDraft?: () => Promise<void>; // Callback to save draft to database
}

interface ModalTabContextType {
  tabs: MinimizedModal[];
  activeTabId: string | null;
  openTab: (type: 'create-order', data?: any, draftId?: string | null) => string;
  closeTab: (tabId: string) => void;
  restoreTab: (tabId: string) => void;
  minimizeTab: (tabId: string, data: any) => void;
  updateTabData: (tabId: string, data: any) => void;
  getTabData: (tabId: string) => any;
  registerDraftSave: (tabId: string, saveFn: () => Promise<void>) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  isTabActive: (tabId: string) => boolean;
  isTabMinimized: (tabId: string) => boolean;
}

const ModalTabContext = createContext<ModalTabContextType | undefined>(undefined);

export const ModalTabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tabs, setTabs] = useState<MinimizedModal[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const tabDataRef = useRef<Map<string, TabState>>(new Map());

  // Generate unique tab ID
  const generateTabId = useCallback(() => {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Register draft save function for a tab
  const registerDraftSave = useCallback((tabId: string, saveFn: () => Promise<void>) => {
    const tabState = tabDataRef.current.get(tabId);
    if (tabState) {
      tabState.onSaveDraft = saveFn;
      tabDataRef.current.set(tabId, tabState);
    }
  }, []);

  // Close a tab (defined first to avoid circular dependency)
  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    tabDataRef.current.delete(tabId);
    if (activeTabId === tabId) {
      // If closing active tab, activate the last tab or set to null
      setActiveTabId(null);
    }
  }, [activeTabId]);

  // Restore a tab (make it active) - defined before minimizeTab
  const restoreTab = useCallback((tabId: string) => {
    // Remove from minimized tabs when restoring
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    setActiveTabId(tabId);
  }, []);

  // Minimize a tab (can now use restoreTab and closeTab)
  const minimizeTab = useCallback((tabId: string, data: any) => {
    const tabState = tabDataRef.current.get(tabId);
    if (!tabState) return;

    // Update tab data
    tabState.data = data;
    tabDataRef.current.set(tabId, tabState);

    // Add to minimized tabs if not already there
    setTabs(prev => {
      if (prev.find(t => t.id === tabId)) {
        return prev; // Already minimized
      }
      return [
        ...prev,
        {
          id: tabId,
          title: tabState.title,
          subtitle: tabState.subtitle,
          icon: tabState.icon,
          onRestore: () => restoreTab(tabId),
          onClose: () => closeTab(tabId),
        },
      ];
    });

    setActiveTabId(null);
  }, [restoreTab, closeTab]);

  // Open a new tab
  const openTab = useCallback((type: 'create-order', data?: any, draftId?: string | null): string => {
    const tabId = generateTabId();
    
    // If there's an active tab, save it as draft first (fire-and-forget)
    if (activeTabId) {
      const activeTab = tabDataRef.current.get(activeTabId);
      if (activeTab && activeTab.type === 'create-order') {
        // Try to save current tab as draft to database (async, don't wait)
        if (activeTab.onSaveDraft) {
          activeTab.onSaveDraft().catch(error => {
            console.error('Error auto-saving draft:', error);
            // Continue anyway - data is already in tab context
          });
        }
        // Minimize the current tab
        minimizeTab(activeTabId, activeTab.data);
      }
    }

    // Create new tab state
    const tabState: TabState = {
      id: tabId,
      type,
      data: data || {},
      draftId: draftId || null,
      title: type === 'create-order' ? 'Create New Order' : 'New Tab',
      subtitle: type === 'create-order' ? 'Process new customer request' : undefined,
      icon: type === 'create-order' ? 'create-outline' : 'document-outline',
    };

    tabDataRef.current.set(tabId, tabState);

    // Don't add to minimized tabs - new tabs should be active
    // They'll be added to minimized tabs only when minimized
    setActiveTabId(tabId);

    return tabId;
  }, [activeTabId, generateTabId, minimizeTab]);


  // Update tab data
  const updateTabData = useCallback((tabId: string, data: any) => {
    const tabState = tabDataRef.current.get(tabId);
    if (tabState) {
      tabState.data = data;
      tabDataRef.current.set(tabId, tabState);
    }
  }, []);

  // Get tab data
  const getTabData = useCallback((tabId: string) => {
    return tabDataRef.current.get(tabId)?.data || {};
  }, []);

  // Reorder tabs
  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs(prev => {
      const newTabs = [...prev];
      const [removed] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, removed);
      return newTabs;
    });
  }, []);

  // Check if tab is active
  const isTabActive = useCallback((tabId: string) => {
    return activeTabId === tabId;
  }, [activeTabId]);

  // Check if tab is minimized
  const isTabMinimized = useCallback((tabId: string) => {
    return tabs.some(t => t.id === tabId);
  }, [tabs]);

  return (
    <ModalTabContext.Provider
      value={{
        tabs,
        activeTabId,
        openTab,
        closeTab,
        restoreTab,
        minimizeTab,
        updateTabData,
        getTabData,
        registerDraftSave,
        reorderTabs,
        isTabActive,
        isTabMinimized,
      }}
    >
      {children}
    </ModalTabContext.Provider>
  );
};

export const useModalTabs = () => {
  const context = useContext(ModalTabContext);
  if (!context) {
    throw new Error('useModalTabs must be used within ModalTabProvider');
  }
  return context;
};

