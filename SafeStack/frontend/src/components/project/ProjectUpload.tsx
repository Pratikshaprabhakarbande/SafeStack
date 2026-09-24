import { useCallback, useState } from 'react';
import { Upload, FileUp, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useProjectUpload } from '../../hooks/useProjectUpload';

interface ProjectUploadProps {
  onUploadComplete: (projectId: string) => void;
}

const ProjectUpload = ({ onUploadComplete }: ProjectUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const { uploading, uploadProject } = useProjectUpload();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip')) {
        try {
          const result = await uploadProject(file);
          onUploadComplete(result.projectId);
        } catch (error) {
          console.error('Upload error:', error);
        }
      } else {
        alert('Please upload a ZIP file');
      }
    }
  }, [uploadProject, onUploadComplete]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const result = await uploadProject(file);
        onUploadComplete(result.projectId);
      } catch (error) {
        console.error('Upload error:', error);
      }
    }
  }, [uploadProject, onUploadComplete]);

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition ${
          dragActive ? 'border-primary-500 bg-primary-50' : 'border-secondary-300 bg-white'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 text-primary-600 mx-auto animate-spin" />
            <p className="text-lg font-semibold text-secondary-700">Uploading project...</p>
            <p className="text-sm text-secondary-500">Please wait while we process your file</p>
          </div>
        ) : (
          <>
            <Upload className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-secondary-900 mb-2">
              Upload Node.js Project
            </h3>
            <p className="text-secondary-600 mb-6">
              Drag and drop your project ZIP file here, or click to browse
            </p>

            <label className="inline-block">
              <input
                type="file"
                className="hidden"
                accept=".zip"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <span className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition cursor-pointer">
                <FileUp className="w-5 h-5 mr-2" />
                Select ZIP File
              </span>
            </label>

            <div className="mt-8 text-sm text-secondary-500">
              <p className="font-semibold mb-2">Requirements:</p>
              <ul className="space-y-1">
                <li className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Must contain package.json
                </li>
                <li className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Node.js project (npm, yarn, or pnpm)
                </li>
                <li className="flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-blue-500 mr-2" />
                  Supports large project ZIP archives (up to 1GB configurable)
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectUpload;
