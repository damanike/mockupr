import { cloudinaryService } from '../services/cloudinaryService';
import { assetRegistryService, AssetRegistryEntry } from '../services/assetRegistryService';
import { UploadedImage } from '../types';

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const createImageUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const convertRegistryEntryToUploadedImage = (entry: AssetRegistryEntry): UploadedImage => {
  return {
    id: entry.id,
    name: entry.name,
    url: entry.url,
    type: entry.type,
    uploadedAt: new Date(entry.uploadedAt),
    originalWidth: entry.width,
    originalHeight: entry.height,
    cloudinaryPublicId: entry.cloudinaryPublicId
  };
};

export const convertCloudinaryToUploadedImage = (cloudinaryAsset: any): UploadedImage => {
  console.log('Converting Cloudinary asset:', cloudinaryAsset);
  
  // Extract asset ID from tags
  const idTag = cloudinaryAsset.tags?.find((tag: string) => tag.startsWith('id-'));
  const assetId = idTag ? idTag.replace('id-', '') : generateId();
  
  console.log('Asset ID extracted:', assetId, 'from tags:', cloudinaryAsset.tags);
  
  // Determine type based on tags
  const isBlank = cloudinaryAsset.tags?.includes('mockupr-blank');
  const isDesign = cloudinaryAsset.tags?.includes('mockupr-design');
  
  // Fallback to folder-based detection if tags are missing
  const folderBasedType = cloudinaryAsset.folder?.includes('blanks') || 
                         cloudinaryAsset.public_id.includes('blanks') ? 'blank' : 'design';
  
  const finalType = isBlank ? 'blank' : isDesign ? 'design' : folderBasedType;
  console.log('Asset type determined:', finalType, 'isBlank:', isBlank, 'isDesign:', isDesign);
  
  const convertedAsset = {
    id: assetId,
    name: cloudinaryAsset.public_id.split('/').pop() || 'Untitled',
    url: cloudinaryAsset.secure_url || `https://res.cloudinary.com/${cloudinaryAsset.cloud_name || 'your-cloud'}/image/upload/${cloudinaryAsset.public_id}`,
    type: finalType,
    uploadedAt: new Date(cloudinaryAsset.created_at),
    originalWidth: cloudinaryAsset.width,
    originalHeight: cloudinaryAsset.height,
    cloudinaryPublicId: cloudinaryAsset.public_id
  };
  
  console.log('Converted asset:', convertedAsset);
  return convertedAsset;
};

export const uploadToCloudinary = async (file: File, folder: string = 'mockupr', assetType: 'blank' | 'design', assetId: string) => {
  try {
    const result = await cloudinaryService.uploadImage(file, folder, assetType, assetId);
    
    // Add to asset registry for cross-browser syncing
    const registryEntry: AssetRegistryEntry = {
      id: assetId,
      name: file.name,
      type: assetType,
      cloudinaryPublicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      uploadedAt: new Date().toISOString(),
      userId: 'mockupr-user'
    };
    
    await assetRegistryService.addAssetToRegistry(registryEntry);
    console.log('Asset added to registry:', registryEntry);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Failed to upload to Cloudinary:', error);
    throw error;
  }
};

export const downloadImage = (canvas: HTMLCanvasElement, filename: string, format: 'png' | 'jpg' | 'webp' = 'png') => {
  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB in bytes
  
  // Function to get file size from data URL
  const getDataUrlSize = (dataUrl: string): number => {
    // Remove data URL prefix and calculate base64 size
    const base64 = dataUrl.split(',')[1];
    return Math.ceil(base64.length * 0.75); // Base64 to bytes conversion
  };

  // Function to try different quality settings
  const tryExportWithQuality = (quality: number): { dataUrl: string; size: number } => {
    const dataUrl = canvas.toDataURL(`image/${format}`, quality);
    const size = getDataUrlSize(dataUrl);
    return { dataUrl, size };
  };

  let finalDataUrl: string;
  let finalSize: number;

  if (format === 'png') {
    // PNG doesn't support quality parameter, so we'll use it as-is
    // If PNG is too large, we'll convert to JPEG with high quality
    const pngResult = tryExportWithQuality(1.0);
    
    if (pngResult.size <= MAX_FILE_SIZE) {
      finalDataUrl = pngResult.dataUrl;
      finalSize = pngResult.size;
    } else {
      // Convert to JPEG with high quality if PNG is too large
      format = 'jpg';
      const jpegResult = tryExportWithQuality(0.95);
      finalDataUrl = jpegResult.dataUrl;
      finalSize = jpegResult.size;
    }
  } else {
    // For JPEG and WebP, start with high quality and reduce if needed
    let quality = 0.98;
    let result = tryExportWithQuality(quality);
    
    // Binary search for optimal quality that fits within size limit
    let minQuality = 0.1;
    let maxQuality = 0.98;
    
    while (result.size > MAX_FILE_SIZE && quality > minQuality) {
      maxQuality = quality;
      quality = (minQuality + maxQuality) / 2;
      result = tryExportWithQuality(quality);
      
      // Prevent infinite loop
      if (maxQuality - minQuality < 0.01) break;
    }
    
    finalDataUrl = result.dataUrl;
    finalSize = result.size;
  }

  // Create download link
  const link = document.createElement('a');
  const sizeInMB = (finalSize / (1024 * 1024)).toFixed(1);
  link.download = `${filename}-hd-${sizeInMB}MB.${format}`;
  link.href = finalDataUrl;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Log export info for debugging
  console.log(`Exported ${filename} as ${format.toUpperCase()}:`, {
    size: `${sizeInMB}MB`,
    dimensions: `${canvas.width}x${canvas.height}px`,
    quality: format === 'png' ? 'lossless' : `${Math.round((finalDataUrl.includes('jpeg') ? 0.95 : 0.98) * 100)}%`
  });
};

export const validateImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
  return validTypes.includes(file.type) && file.size <= 100 * 1024 * 1024; // 100MB limit (will be compressed)
};

export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  });
};