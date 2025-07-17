import React, { useCallback } from 'react';
import { Upload, Image, AlertCircle } from 'lucide-react';

interface UploadZoneProps {
  onFilesUploaded: (files: FileList) => void;
  acceptedTypes: string;
  title: string;
  description: string;
  className?: string;
  multiple?: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesUploaded,
  acceptedTypes,
  title,
  description,
  className = '',
  multiple = false
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFilesUploaded(files);
    }
  }, [onFilesUploaded]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      onFilesUploaded(files);
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
        isDragOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400 bg-gray-50'
      } ${className}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        multiple={multiple}
        accept={acceptedTypes}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="flex flex-col items-center space-y-4">
        <div className={`p-4 rounded-full ${isDragOver ? 'bg-blue-100' : 'bg-white'} shadow-sm`}>
          <Upload className={`w-8 h-8 ${isDragOver ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4">{description}</p>
          
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Image className="w-4 h-4" />
            <span>Supports PNG, JPG, SVG, WebP</span>
          </div>
          
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-400 mt-2">
            <AlertCircle className="w-3 h-3" />
            <span>Large files (&gt;5MB) automatically compressed to ~1.5MB with high quality</span>
          </div>
          
          <div className="text-xs text-green-600 mt-2 font-medium">
            ✨ Smart compression handles files up to 100MB - no size limits!
          </div>
          
          {multiple && (
            <div className="text-xs text-blue-600 mt-2 font-medium">
              Select multiple files at once
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadZone;