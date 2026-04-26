import { apiClient } from './client';

// ============================================
// 类型定义
// ============================================
export interface UploadedFile {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  url: string;
  uploaded_by: string;
  created_at: string;
}

export interface UploadResponse {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
}

// ============================================
// API 函数
// ============================================
export const uploadApi = {
  /**
   * 上传单个文件
   */
  uploadSingle: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ success: true; data: UploadResponse }>(
      '/upload/single',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  /**
   * 上传多个文件
   */
  uploadMultiple: async (files: File[]): Promise<{ files: UploadResponse[]; count: number }> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await apiClient.post<{ success: true; data: { files: UploadResponse[]; count: number } }>(
      '/upload/multiple',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  /**
   * 上传图片
   */
  uploadImage: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ success: true; data: UploadResponse }>(
      '/upload/image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  /**
   * 删除文件
   */
  deleteFile: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: true; data: { message: string } }>(
      `/upload/${id}`
    );
  },

  /**
   * 获取文件信息
   */
  getFileInfo: async (id: string): Promise<UploadedFile> => {
    const response = await apiClient.get<{ success: true; data: UploadedFile }>(
      `/upload/${id}`
    );
    return response.data;
  },
};
