interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
  initialQuality?: number;
  alwaysKeepResolution?: boolean;
  onProgress?: (progress: number) => void;
}

interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  wasCompressed: boolean;
}

export class ImageCompressor {
  private static readonly TARGET_SIZE_MB = 1.5;
  private static readonly COMPRESSION_THRESHOLD_MB = 5.0;
  private static readonly MIN_QUALITY = 0.6;
  private static readonly MAX_QUALITY = 0.95;

  static async compressImage(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<CompressionResult> {
    const originalSize = file.size;
    const originalSizeMB = originalSize / (1024 * 1024);

    // If file is already under 5MB, return as-is
    if (originalSizeMB <= this.COMPRESSION_THRESHOLD_MB) {
      onProgress?.(100);
      return {
        compressedFile: file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        wasCompressed: false
      };
    }

    // For very large files (>50MB), show warning but proceed
    if (originalSizeMB > 50) {
      console.warn(`Large file detected: ${originalSizeMB.toFixed(1)}MB. This may take longer to compress.`);
    }

    onProgress?.(10);

    try {
      // Dynamic import to avoid bundling issues
      const imageCompression = (await import('browser-image-compression')).default;
      
      onProgress?.(20);

      // Calculate optimal settings based on file size
      const compressionSettings = this.calculateCompressionSettings(originalSizeMB);
      
      onProgress?.(30);

      const options: CompressionOptions = {
        maxSizeMB: compressionSettings.targetSizeMB,
        maxWidthOrHeight: compressionSettings.maxDimension,
        useWebWorker: true,
        initialQuality: compressionSettings.quality,
        alwaysKeepResolution: false,
        onProgress: (progressPercent) => {
          // Map compression progress to 30-90% of total progress
          const mappedProgress = 30 + (progressPercent * 0.6);
          onProgress?.(Math.round(mappedProgress));
        }
      };

      // Perform compression
      const compressedFile = await imageCompression(file, options);
      
      onProgress?.(95);

      const compressedSize = compressedFile.size;
      const compressedSizeMB = compressedSize / (1024 * 1024);
      
      // If compression didn't achieve target, try more aggressive settings
      let finalFile = compressedFile;
      if (compressedSizeMB > this.TARGET_SIZE_MB * 1.5) {
        const aggressiveOptions: CompressionOptions = {
          maxSizeMB: this.TARGET_SIZE_MB,
          maxWidthOrHeight: Math.max(800, compressionSettings.maxDimension * 0.7),
          useWebWorker: true,
          initialQuality: Math.max(this.MIN_QUALITY, compressionSettings.quality - 0.15),
          alwaysKeepResolution: false,
          fileType: originalSizeMB > 20 ? 'image/jpeg' : undefined // Force JPEG for very large files
        };
        
        try {
          finalFile = await imageCompression(compressedFile, aggressiveOptions);
          
          // If still too large, try ultra-aggressive compression
          const ultraCompressedSizeMB = finalFile.size / (1024 * 1024);
          if (ultraCompressedSizeMB > this.TARGET_SIZE_MB * 2 && originalSizeMB > 30) {
            const ultraOptions: CompressionOptions = {
              maxSizeMB: this.TARGET_SIZE_MB * 0.8,
              maxWidthOrHeight: 1200,
              useWebWorker: true,
              initialQuality: this.MIN_QUALITY,
              alwaysKeepResolution: false,
              fileType: 'image/jpeg'
            };
            
            try {
              const ultraCompressed = await imageCompression(finalFile, ultraOptions);
              finalFile = ultraCompressed;
            } catch (error) {
              console.warn('Ultra compression failed, using previous result:', error);
            }
          }
        } catch (error) {
          console.warn('Aggressive compression failed, using initial result:', error);
          finalFile = compressedFile;
        }
      }

      onProgress?.(100);

      const finalSize = finalFile.size;
      const compressionRatio = originalSize / finalSize;

      return {
        compressedFile: finalFile,
        originalSize,
        compressedSize: finalSize,
        compressionRatio,
        wasCompressed: true
      };

    } catch (error) {
      console.error('Compression failed:', error);
      onProgress?.(100);
      
      // Return original file if compression fails
      return {
        compressedFile: file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        wasCompressed: false
      };
    }
  }

  private static calculateCompressionSettings(originalSizeMB: number) {
    // Calculate target size based on original file size
    let targetSizeMB = this.TARGET_SIZE_MB;
    
    // For extremely large files, be more aggressive
    if (originalSizeMB > 50) {
      targetSizeMB = Math.max(1.0, originalSizeMB * 0.03); // 3% of original size
    } else if (originalSizeMB > 20) {
      targetSizeMB = Math.max(1.2, originalSizeMB * 0.08); // 8% of original size
    } else if (originalSizeMB > 10) {
      targetSizeMB = Math.max(1.5, originalSizeMB * 0.15); // 15% of original size
    }
    
    // Calculate quality based on original size
    let quality = this.MAX_QUALITY;
    if (originalSizeMB > 50) {
      quality = 0.65;
    } else if (originalSizeMB > 30) {
      quality = 0.7;
    } else if (originalSizeMB > 10) {
      quality = 0.8;
    } else if (originalSizeMB > 8) {
      quality = 0.85;
    }

    // Calculate max dimension to preserve quality while reducing size
    let maxDimension = 2400;
    if (originalSizeMB > 50) {
      maxDimension = 1400;
    } else if (originalSizeMB > 30) {
      maxDimension = 1600;
    } else if (originalSizeMB > 20) {
      maxDimension = 1800;
    } else if (originalSizeMB > 10) {
      maxDimension = 2200;
    }

    return {
      targetSizeMB,
      quality: Math.max(this.MIN_QUALITY, quality),
      maxDimension
    };
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static calculateCompressionPercentage(originalSize: number, compressedSize: number): number {
    return Math.round(((originalSize - compressedSize) / originalSize) * 100);
  }
}