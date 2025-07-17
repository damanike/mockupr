import React from 'react';
import { Zap, CheckCircle, AlertCircle, FileImage } from 'lucide-react';

interface CompressionProgressProps {
  fileName: string;
  progress: number;
  originalSize?: number;
  compressedSize?: number;
  isComplete: boolean;
  hasError: boolean;
  compressionRatio?: number;
}

const CompressionProgress: React.FC<CompressionProgressProps> = ({
  fileName,
  progress,
  originalSize,
  compressedSize,
  isComplete,
  hasError,
  compressionRatio
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCompressionPercentage = (): number => {
    if (!originalSize || !compressedSize) return 0;
    return Math.round(((originalSize - compressedSize) / originalSize) * 100);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ${
          hasError ? 'bg-red-100' : 
          isComplete ? 'bg-green-100' : 'bg-blue-100'
        }`}>
          {hasError ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : isComplete ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <Zap className="w-5 h-5 text-blue-600 animate-pulse" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {fileName}
            </p>
            <span className="text-sm text-gray-500">
              {progress}%
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                hasError ? 'bg-red-500' :
                isComplete ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Status Text */}
          <div className="text-xs text-gray-600">
            {hasError ? (
              <span className="text-red-600">Compression failed - using original file</span>
            ) : isComplete ? (
              <div className="space-y-1">
                {originalSize && compressedSize && compressionRatio && compressionRatio > 1 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Original: {formatFileSize(originalSize)}</span>
                      <span>Compressed: {formatFileSize(compressedSize)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600 font-medium">
                        {getCompressionPercentage()}% smaller
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>Ratio: {compressionRatio.toFixed(1)}x</span>
                    </div>
                  </>
                ) : (
                  <span className="text-blue-600">File already optimized - no compression needed</span>
                )}
              </div>
            ) : (
              <span>Compressing image for optimal storage...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompressionProgress;