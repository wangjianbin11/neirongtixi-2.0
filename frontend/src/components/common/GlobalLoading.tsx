import { Spin } from 'antd';
import { useUIStore } from '@/stores/uiStore';

export const GlobalLoading: React.FC = () => {
  const { isLoading } = useUIStore();

  if (!isLoading) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <Spin size="large" tip="加载中..." />
    </div>
  );
};

export default GlobalLoading;
