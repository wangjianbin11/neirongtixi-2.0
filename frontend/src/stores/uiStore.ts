import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'auto';

interface UIState {
  // 侧边栏
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // 主题
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // 全局加载状态
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // 当前选中的菜单
  selectedMenuKey: string;
  setSelectedMenuKey: (key: string) => void;

  // 打开的面板
  panels: {
    keywordPanel: boolean;
    topicPanel: boolean;
    contentPanel: boolean;
  };
  togglePanel: (panel: keyof UIState['panels']) => void;
  closePanel: (panel: keyof UIState['panels']) => void;
  openPanel: (panel: keyof UIState['panels']) => void;

  // 搜索状态
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // 侧边栏
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // 主题
      theme: 'light',
      setTheme: (theme) => {
        set({ theme });
        // 应用主题到 document
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },

      // 全局加载状态
      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading }),

      // 当前选中的菜单
      selectedMenuKey: '/dashboard',
      setSelectedMenuKey: (key) => set({ selectedMenuKey: key }),

      // 打开的面板
      panels: {
        keywordPanel: false,
        topicPanel: false,
        contentPanel: false,
      },
      togglePanel: (panel) =>
        set((state) => ({
          panels: { ...state.panels, [panel]: !state.panels[panel] },
        })),
      closePanel: (panel) =>
        set((state) => ({
          panels: { ...state.panels, [panel]: false },
        })),
      openPanel: (panel) =>
        set((state) => ({
          panels: { ...state.panels, [panel]: true },
        })),

      // 搜索状态
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    {
      name: 'asg-ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);

export default useUIStore;
