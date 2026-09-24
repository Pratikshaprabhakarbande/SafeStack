import { useState, useCallback } from 'react';
import { projectService } from '../services/projectService';
import toast from 'react-hot-toast';

export const useProjectUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadProject = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      const result = await projectService.uploadProject(file);
      setProgress(100);
      toast.success('Project uploaded successfully!');
      return result.data;
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Upload failed');
      throw error;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploading, progress, uploadProject };
};
