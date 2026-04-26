import { useState } from 'react';
import { Upload, message, Progress, Button, Space, Image, Tag } from 'antd';
import { InboxOutlined, DeleteOutlined, EyeOutlined, FileOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import { uploadApi, UploadResponse } from '../../api/upload';

const { Dragger } = Upload;

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // MB
  maxCount?: number;
  multiple?: boolean;
  value?: UploadResponse[];
  onChange?: (files: UploadResponse[]) => void;
  disabled?: boolean;
  listType?: 'picture-card' | 'text' | 'picture';
}

export default function FileUpload({
  accept = '*/*',
  maxSize = 10,
  maxCount = 10,
  multiple = true,
  value = [],
  onChange,
  disabled = false,
  listType = 'picture-card',
}: FileUploadProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // 转换 value 为 fileList
  const initFileList = (files: UploadResponse[]) => {
    return files.map((file) => ({
      uid: file.id,
      name: file.original_name,
      status: 'done' as const,
      url: `${window.location.origin}/api/v1${file.url}`,
      response: file,
    }));
  };

  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;

    try {
      // 文件大小验证
      const sizeMB = (file as File).size / 1024 / 1024;
      if (sizeMB > maxSize) {
        onError(new Error(`文件大小不能超过 ${maxSize}MB`));
        message.error(`文件大小不能超过 ${maxSize}MB`);
        return;
      }

      let response: UploadResponse;

      // 根据文件类型选择上传方式
      if ((file as File).type.startsWith('image/')) {
        response = await uploadApi.uploadImage(file as File);
      } else {
        response = await uploadApi.uploadSingle(file as File);
      }

      onSuccess(response);
      message.success('上传成功');

      // 通知父组件
      if (onChange) {
        onChange([...value, response]);
      }
    } catch (error) {
      onError(error as Error);
      message.error('上传失败');
    }
  };

  const handleRemove = async (file: UploadFile) => {
    // 如果是已上传的文件，调用删除API
    if (file.response && (file.response as UploadResponse).id) {
      try {
        await uploadApi.deleteFile((file.response as UploadResponse).id);
        message.success('删除成功');
      } catch (error) {
        message.error('删除失败');
        return false;
      }
    }

    // 通知父组件
    if (onChange && file.response) {
      const newValue = value.filter(
        (f) => f.id !== (file.response as UploadResponse).id
      );
      onChange(newValue);
    }
    return true;
  };

  const handlePreview = async (file: UploadFile) => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  const uploadButton = (
    <div>
      <InboxOutlined style={{ fontSize: 32 }} />
      <div style={{ marginTop: 8 }}>点击或拖拽上传</div>
      <div style={{ fontSize: 12, color: '#999' }}>
        支持 {accept === 'image/*' ? '图片' : '文件'}上传
        <br />
        最大 {maxSize}MB
      </div>
    </div>
  );

  // 转换当前 value 为 fileList 用于显示
  const currentFileList = initFileList(value);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Dragger
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        listType={listType}
        fileList={currentFileList}
        customRequest={handleUpload}
        onRemove={handleRemove}
        onPreview={handlePreview}
        maxCount={maxCount}
      >
        {currentFileList.length >= maxCount ? null : uploadButton}
      </Dragger>

      {value.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Space wrap>
            {value.map((file) => (
              <Tag
                key={file.id}
                closable
                onClose={async () => {
                  try {
                    await uploadApi.deleteFile(file.id);
                    if (onChange) {
                      onChange(value.filter((f) => f.id !== file.id));
                    }
                    message.success('删除成功');
                  } catch (error) {
                    message.error('删除失败');
                  }
                }}
                style={{ padding: '4px 8px' }}
              >
                <FileOutlined style={{ marginRight: 4 }} />
                {file.original_name}
              </Tag>
            ))}
          </Space>
        </div>
      )}
    </Space>
  );
}
