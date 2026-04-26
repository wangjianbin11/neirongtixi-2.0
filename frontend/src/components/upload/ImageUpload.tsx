import { useState } from 'react';
import { Upload, message, Image, Space, Button, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { uploadApi, UploadResponse } from '../../api/upload';

interface ImageUploadProps {
  value?: UploadResponse[];
  onChange?: (files: UploadResponse[]) => void;
  maxCount?: number;
  disabled?: boolean;
}

export default function ImageUpload({
  value = [],
  onChange,
  maxCount = 5,
  disabled = false,
}: ImageUploadProps) {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  const handleUpload = async (file: File) => {
    try {
      const response = await uploadApi.uploadImage(file);
      if (onChange) {
        onChange([...value, response]);
      }
      message.success('上传成功');
      return false; // 阻止默认上传行为
    } catch (error) {
      message.error('上传失败');
      return false;
    }
  };

  const handleRemove = async (file: UploadResponse) => {
    try {
      await uploadApi.deleteFile(file.id);
      if (onChange) {
        onChange(value.filter((f) => f.id !== file.id));
      }
      message.success('删除成功');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handlePreview = (url: string) => {
    setPreviewImage(`${window.location.origin}/api/v1${url}`);
    setPreviewVisible(true);
  };

  const uploadButton = (
    <div style={{ width: 104, height: 104, border: '1px dashed #d9d9d9', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <PlusOutlined style={{ fontSize: 24, color: '#999' }} />
      <div style={{ marginTop: 8, color: '#999' }}>上传图片</div>
    </div>
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space wrap>
        {value.map((file) => (
          <div
            key={file.id}
            style={{
              position: 'relative',
              width: 104,
              height: 104,
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <Image
              src={`${window.location.origin}/api/v1${file.url}`}
              alt={file.original_name}
              preview={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.3s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
            >
              <Space>
                <Button
                  type="primary"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(file.url)}
                >
                  预览
                </Button>
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemove(file)}
                >
                  删除
                </Button>
              </Space>
            </div>
          </div>
        ))}

        {value.length < maxCount && !disabled && (
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={handleUpload}
            disabled={disabled}
          >
            {uploadButton}
          </Upload>
        )}
      </Space>

      <Modal
        open={previewVisible}
        title="图片预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="80vw"
        style={{ top: 20 }}
      >
        <Image src={previewImage} style={{ width: '100%' }} preview={false} />
      </Modal>
    </Space>
  );
}
