import { useState } from 'react';
import {
  Card,
  Input,
  Button,
  List,
  Tag,
  Space,
  Pagination,
  Alert,
  Statistic,
  Row,
  Col,
  Typography,
  Divider,
  Select,
  message,
  Empty,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  LinkOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { searchApi, PaginatedSearchResults, GoogleSearchResult } from '../../api/search';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PaginatedSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [maxPages, setMaxPages] = useState(10);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // 执行搜索
  const handleSearch = async (searchQuery: string, page: number = 1) => {
    if (!searchQuery.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    setLoading(true);
    setSelectedItems(new Set());
    try {
      const results = await searchApi.search({
        q: searchQuery,
        page,
        maxPages,
      });
      setSearchResults(results);
      setCurrentPage(page);
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  // 翻页
  const handlePageChange = (page: number) => {
    handleSearch(query, page);
  };

  // 切换最大页数
  const handleMaxPagesChange = (value: number) => {
    setMaxPages(value);
  };

  // 选择/取消选择项
  const toggleSelectItem = (link: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(link)) {
        newSet.delete(link);
      } else {
        newSet.add(link);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (searchResults && selectedItems.size === searchResults.items.length) {
      setSelectedItems(new Set());
    } else if (searchResults) {
      setSelectedItems(new Set(searchResults.items.map(item => item.link)));
    }
  };

  // 导出选中结果
  const handleExport = () => {
    if (selectedItems.size === 0) {
      message.warning('请先选择要导出的结果');
      return;
    }

    const selectedItemsList = searchResults?.items.filter(item => selectedItems.has(item.link)) || [];
    const data = selectedItemsList.map(item => ({
      标题: item.title,
      链接: item.link,
      摘要: item.snippet,
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search_results_${query}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success(`已导出 ${selectedItems.size} 条结果`);
  };

  // 复制链接
  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    message.success('链接已复制');
  };

  // 打开链接
  const openLink = (link: string) => {
    window.open(link, '_blank');
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 搜索栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Space.Compact style={{ width: '100%' }}>
            <Search
              placeholder="输入搜索关键词..."
              size="large"
              enterButton={<SearchOutlined />}
              loading={loading}
              onSearch={handleSearch}
              onChange={(e) => setQuery(e.target.value)}
              value={query}
            />
            <Select
              defaultValue={10}
              style={{ width: 120 }}
              onChange={handleMaxPagesChange}
            >
              <Option value={1}>1页 (10条)</Option>
              <Option value={2}>2页 (20条)</Option>
              <Option value={3}>3页 (30条)</Option>
              <Option value={5}>5页 (50条)</Option>
              <Option value={10}>10页 (100条)</Option>
            </Select>
          </Space.Compact>

          {searchResults && (
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="搜索结果"
                  value={searchResults.totalResults}
                  formatter={(value) => `${Number(value).toLocaleString()} 条`}
                  suffix={<DatabaseOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="当前页"
                  value={`${searchResults.currentPage} / ${searchResults.totalPages}`}
                  prefix={<LinkOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="已获取"
                  value={searchResults.items.length}
                  suffix="条"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="搜索耗时"
                  value={searchResults.searchTime}
                  suffix="秒"
                  prefix={<ClockCircleOutlined />}
                  precision={2}
                />
              </Col>
            </Row>
          )}

          {selectedItems.size > 0 && (
            <Alert
              message={
                <Space>
                  <Text>已选择 <Text strong>{selectedItems.size}</Text> 条结果</Text>
                  <Button type="primary" size="small" icon={<ExportOutlined />} onClick={handleExport}>
                    导出选中
                  </Button>
                </Space>
              }
              type="info"
              showIcon
              closable
              onClose={() => setSelectedItems(new Set())}
            />
          )}
        </Space>
      </Card>

      {/* 搜索结果列表 */}
      {searchResults && searchResults.items.length > 0 && (
        <Card
          title={
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                搜索结果: "{searchResults.query}"
              </Title>
              <Button
                size="small"
                onClick={toggleSelectAll}
              >
                {selectedItems.size === searchResults.items.length ? '取消全选' : '全选'}
              </Button>
            </Space>
          }
          extra={
            <Space>
              <Tag color="blue">共 {searchResults.totalResults.toLocaleString()} 条</Tag>
              <Tag color="green">第 {searchResults.currentPage}/{searchResults.totalPages} 页</Tag>
            </Space>
          }
        >
          <List
            dataSource={searchResults.items}
            renderItem={(item, index) => (
              <List.Item
                key={item.link}
                style={{
                  padding: 16,
                  backgroundColor: selectedItems.has(item.link) ? '#e6f7ff' : 'transparent',
                  borderRadius: 4,
                  marginBottom: 8,
                  border: selectedItems.has(item.link) ? '1px solid #1890ff' : '1px solid #f0f0f0',
                  cursor: 'pointer',
                }}
                onClick={() => toggleSelectItem(item.link)}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ width: 40, textAlign: 'center', color: '#999' }}>
                      {(searchResults.currentPage - 1) * 10 + index + 1}
                    </div>
                  }
                  title={
                    <Space>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLink(item.link);
                        }}
                        style={{ fontSize: 16, fontWeight: 500 }}
                      >
                        {item.title}
                      </a>
                      <Button
                        type="text"
                        size="small"
                        icon={<LinkOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyLink(item.link);
                        }}
                      />
                    </Space>
                  }
                  description={
                    <div>
                      <div style={{ color: '#006621', fontSize: 12, marginBottom: 4 }}>
                        {item.link}
                      </div>
                      <Paragraph
                        ellipsis={{ rows: 2 }}
                        style={{ color: '#545454', marginBottom: 0 }}
                      >
                        {item.snippet}
                      </Paragraph>
                    </div>
                  }
                />
              </List.Item>
            )}
          />

          <Divider />

          {/* 分页 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <Pagination
              current={searchResults.currentPage}
              total={Math.min(searchResults.totalPages, maxPages) * 10}
              pageSize={10}
              onChange={handlePageChange}
              showSizeChanger={false}
              showTotal={(total) => `共 ${total} 条`}
              disabled={loading}
            />
          </div>
        </Card>
      )}

      {/* 加载中 */}
      {loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#999' }}>正在搜索中...</div>
          </div>
        </Card>
      )}

      {/* 无结果 */}
      {!loading && searchResults && searchResults.items.length === 0 && (
        <Card>
          <Empty
            description={
              <Space direction="vertical">
                <Text>未找到相关结果</Text>
                <Text type="secondary">请尝试其他关键词或减少搜索页数</Text>
              </Space>
            }
          />
        </Card>
      )}

      {/* 初始状态 */}
      {!loading && !searchResults && (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical">
                <Text>输入关键词开始搜索</Text>
                <Text type="secondary">
                  支持最多搜索 {maxPages} 页，共 {maxPages * 10} 条结果
                </Text>
              </Space>
            }
          />
        </Card>
      )}
    </div>
  );
}
