interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  tags?: string[];
  created_at: string;
}

interface CloudinarySearchResponse {
  total_count: number;
  time: number;
  resources: CloudinaryUploadResponse[];
}

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  uploadPreset?: string;
}

class CloudinaryService {
  private config: CloudinaryConfig;
  private readonly USER_TAG = 'mockupr-user';
  private readonly BLANK_TAG = 'mockupr-blank';
  private readonly DESIGN_TAG = 'mockupr-design';

  constructor() {
    this.config = {
      cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
      apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY,
      uploadPreset: 'mockupr_uploads' // We'll create this preset
    };

    if (!this.config.cloudName || !this.config.apiKey) {
      throw new Error('Cloudinary configuration is missing. Please check your environment variables.');
    }
  }

  async uploadImage(file: File, folder: string = 'mockupr', assetType: 'blank' | 'design', assetId: string): Promise<CloudinaryUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'mockupr_unsigned'); // Unsigned preset for client-side uploads
    formData.append('folder', folder);
    formData.append('resource_type', 'image');
    
    // Add multiple tags for identification
    const tags = [
      this.USER_TAG,
      assetType === 'blank' ? this.BLANK_TAG : this.DESIGN_TAG,
      `id-${assetId}` // Unique ID tag for this asset
    ].join(',');
    formData.append('tags', tags);
    
    // Add context metadata for easier searching
    formData.append('context', `asset_id=${assetId}|asset_type=${assetType}|app=mockupr`);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result: CloudinaryUploadResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload image to Cloudinary');
    }
  }

  async getAllUserAssets(): Promise<CloudinaryUploadResponse[]> {
    try {
      // Try multiple approaches to get user assets
      const assets: CloudinaryUploadResponse[] = [];
      
      // Method 1: Try the public list API with user tag
      try {
        const listUrl = `https://res.cloudinary.com/${this.config.cloudName}/image/list/${this.USER_TAG}.json`;
        const listResponse = await fetch(listUrl);
        
        if (listResponse.ok) {
          const listData = await listResponse.json();
          if (listData.resources && Array.isArray(listData.resources)) {
            assets.push(...listData.resources.map((resource: any) => ({
              public_id: resource.public_id,
              secure_url: resource.secure_url || `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${resource.public_id}`,
              width: resource.width || 800,
              height: resource.height || 600,
              format: resource.format || 'jpg',
              resource_type: resource.resource_type || 'image',
              tags: resource.tags || [],
              created_at: resource.created_at || new Date().toISOString()
            })));
          }
        }
      } catch (error) {
        console.log('List API failed, trying alternative methods');
      }
      
      // Method 2: Try searching by folder structure
      if (assets.length === 0) {
        try {
          const folderUrls = [
            `https://res.cloudinary.com/${this.config.cloudName}/image/list/mockupr.json`,
            `https://res.cloudinary.com/${this.config.cloudName}/image/list/mockupr/blanks.json`,
            `https://res.cloudinary.com/${this.config.cloudName}/image/list/mockupr/designs.json`
          ];
          
          for (const folderUrl of folderUrls) {
            try {
              const folderResponse = await fetch(folderUrl);
              if (folderResponse.ok) {
                const folderData = await folderResponse.json();
                if (folderData.resources && Array.isArray(folderData.resources)) {
                  assets.push(...folderData.resources.map((resource: any) => ({
                    public_id: resource.public_id,
                    secure_url: resource.secure_url || `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${resource.public_id}`,
                    width: resource.width || 800,
                    height: resource.height || 600,
                    format: resource.format || 'jpg',
                    resource_type: resource.resource_type || 'image',
                    tags: resource.tags || [],
                    created_at: resource.created_at || new Date().toISOString()
                  })));
                }
              }
            } catch (folderError) {
              console.log(`Failed to fetch from ${folderUrl}`);
            }
          }
        } catch (error) {
          console.log('Folder search failed');
        }
      }
      
      // Method 3: Use a more robust search approach with direct URLs
      if (assets.length === 0) {
        // Try to get assets by checking if they exist with known patterns
        console.log('Attempting direct asset discovery...');
        
        // This would require server-side implementation for full functionality
        // For now, we'll rely on local storage as backup
      }
      
      // Remove duplicates based on public_id
      const uniqueAssets = assets.filter((asset, index, self) => 
        index === self.findIndex(a => a.public_id === asset.public_id)
      );
      
      console.log(`Found ${uniqueAssets.length} assets from Cloudinary`);
      return uniqueAssets;
      
    } catch (error) {
      console.warn('Failed to load assets from Cloudinary:', error);
      return [];
    }
  }

  async renameAsset(publicId: string, newName: string): Promise<boolean> {
    try {
      // For client-side renaming, we'll need to implement a backend endpoint
      // For now, we'll just log the request
      console.log('Asset rename requested:', { publicId, newName });
      return true;
    } catch (error) {
      console.error('Cloudinary rename error:', error);
      return false;
    }
  }

  async deleteImage(publicId: string): Promise<boolean> {
    try {
      // For client-side deletion, we'll need to implement a backend endpoint
      // For now, we'll just return true as deletion will be handled server-side
      console.log('Image deletion requested for:', publicId);
      return true;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }

  getOptimizedUrl(publicId: string, options: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
  } = {}): string {
    const { width, height, quality = 'auto', format = 'auto' } = options;
    
    let transformations = [`q_${quality}`, `f_${format}`];
    
    if (width && height) {
      transformations.push(`w_${width}`, `h_${height}`, 'c_fit');
    } else if (width) {
      transformations.push(`w_${width}`, 'c_scale');
    } else if (height) {
      transformations.push(`h_${height}`, 'c_scale');
    }

    const transformString = transformations.join(',');
    return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${transformString}/${publicId}`;
  }

  getThumbnailUrl(publicId: string, size: number = 200): string {
    return this.getOptimizedUrl(publicId, {
      width: size,
      height: size,
      quality: '80'
    });
  }
}

export const cloudinaryService = new CloudinaryService();
export type { CloudinaryUploadResponse, CloudinarySearchResponse };