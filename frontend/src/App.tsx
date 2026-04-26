import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import ErrorBoundary from './components/error/ErrorBoundary';
import GlobalLoading from './components/common/GlobalLoading';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import LoginPage from './pages/auth/Login';
import DashboardPage from './pages/dashboard/Dashboard';
import KeywordListPage from './pages/keywords/KeywordList';
import TopicListPage from './pages/topics/TopicList';
import ContentListPage from './pages/contents/ContentList';
import ContentDetailPage from './pages/contents/ContentDetail';
import ContentGeneratePage from './pages/contents/ContentGenerate';
import SkillListPage from './pages/skills/SkillList';
import PublishQueuePage from './pages/publish/PublishQueue';
import AnalyticsDashboardPage from './pages/analytics/Dashboard';
import AssetListPage from './pages/assets/AssetList';
import SearchPage from './pages/search/SearchPage';
import ProfilePage from './pages/settings/Profile';
import SettingsPage from './pages/settings/Settings';
import NotificationListPage from './pages/notifications/NotificationList';
import WorkflowListPage from './pages/workflows/WorkflowList';
import WorkflowEditPage from './pages/workflows/WorkflowEdit';
import WorkflowVisualEditorPage from './pages/workflows/WorkflowVisualEditor';
import ExecutionHistoryPage from './pages/workflows/ExecutionHistory';
import DraftReviewPage from './pages/drafts/DraftReview';
import KnowledgeBasesPage from './pages/knowledge-bases/GroupList';
import BaseListPage from './pages/knowledge-bases/BaseList';
import DocumentListPage from './pages/knowledge-bases/DocumentList';
import DocumentDetailPage from './pages/knowledge-bases/DocumentDetail';

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN}>
        <GlobalLoading />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="keywords" element={<KeywordListPage />} />
            <Route path="topics" element={<TopicListPage />} />
            <Route path="contents" element={<ContentListPage />} />
            <Route path="contents/:id" element={<ContentDetailPage />} />
            <Route path="contents/generate" element={<ContentGeneratePage />} />
            <Route path="skills" element={<SkillListPage />} />
            <Route path="workflows" element={<WorkflowListPage />} />
            <Route path="workflows/create" element={<WorkflowEditPage />} />
            <Route path="workflows/:id/edit" element={<WorkflowEditPage />} />
            <Route path="workflows/:id/visual" element={<WorkflowVisualEditorPage />} />
            <Route path="workflows/visual" element={<WorkflowVisualEditorPage />} />
            <Route path="workflows/executions" element={<ExecutionHistoryPage />} />
            <Route path="workflows/executions/:id" element={<ExecutionHistoryPage />} />
            <Route path="drafts" element={<DraftReviewPage />} />
            <Route path="knowledge-bases" element={<KnowledgeBasesPage />} />
            <Route path="knowledge-bases/groups/:id" element={<BaseListPage />} />
            <Route path="knowledge-bases/bases/:id/documents" element={<DocumentListPage />} />
            <Route path="knowledge-bases/documents/:id" element={<DocumentDetailPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="publish" element={<PublishQueuePage />} />
            <Route path="analytics" element={<AnalyticsDashboardPage />} />
            <Route path="assets" element={<AssetListPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="notifications" element={<NotificationListPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
