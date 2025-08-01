import { MockupProject } from '../types';

interface AssetRegistryEntry {
  id: string;
  name: string;
  type: 'blank' | 'design';
  cloudinaryPublicId: string;
  url: string;
  width?: number;
  height?: number;
  uploadedAt: string;
  userId: string;
}

interface AssetRegistry {
  version: number;
  lastUpdated: string;
  assets: AssetRegistryEntry[];
  projects: MockupProject[];
}

class AssetRegistryService {
  private readonly REGISTRY_PUBLIC_ID = 'mockupr/registry/user-assets';
  private readonly cloudName: string;
  private readonly userId: string;

  constructor() {
    this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    this.userId = 'mockupr-user'; // In a real app, this would be the actual user ID
    
    if (!this.cloudName) {
      throw new Error('Cloudinary cloud name is required');
    }
  }

  async loadAssetRegistry(): Promise<AssetRegistry> {
    try {
      console.log('Loading asset registry from Cloudinary...');
      
      // Try to fetch the registry file from Cloudinary
      const cacheBuster = Date.now();
      const registryUrl = `https://res.cloudinary.com/${this.cloudName}/raw/upload/${this.REGISTRY_PUBLIC_ID}.json?t=${cacheBuster}&_cb=${Math.random()}`;
      
      console.log('Fetching registry from:', registryUrl);
      
      const response = await fetch(registryUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('Registry fetch response:', response.status, response.statusText);
      
      if (response.ok) {
        const registry = await response.json();
        console.log('Asset registry loaded successfully:', {
          version: registry.version,
          assetsCount: registry.assets?.length || 0,
          projectsCount: registry.projects?.length || 0,
          lastUpdated: registry.lastUpdated
        });
        return registry;
      } else {
        console.log('No existing registry found (status:', response.status, '), creating new one');
        return this.createEmptyRegistry();
      }
    } catch (error) {
      console.error('Failed to load registry, creating new one:', error);
      return this.createEmptyRegistry();
    }
  }

  async saveAssetRegistry(registry: AssetRegistry): Promise<boolean> {
    try {
      console.log('Saving asset registry to Cloudinary...');
      
      // Convert registry to JSON blob
      const registryBlob = new Blob([JSON.stringify(registry, null, 2)], {
        type: 'application/json'
      });

      // Upload as raw file to Cloudinary
      const formData = new FormData();
      formData.append('file', registryBlob);
      formData.append('upload_preset', 'mockupr_unsigned');
      formData.append('public_id', this.REGISTRY_PUBLIC_ID);
      formData.append('resource_type', 'raw');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/raw/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const responseData = await response.json();
      console.log('Cloudinary upload response:', responseData);

      if (response.ok) {
        console.log('Asset registry saved successfully');
        return true;
      } else {
        console.error('Failed to save registry:', response.statusText, responseData);
        return false;
      }
    } catch (error) {
      console.error('Error saving asset registry:', error);
      return false;
    }
  }

  async addAssetToRegistry(asset: AssetRegistryEntry): Promise<boolean> {
    try {
      const registry = await this.loadAssetRegistry();
      
      // Remove existing entry with same ID if it exists
      registry.assets = registry.assets.filter(a => a.id !== asset.id);
      
      // Add new asset
      registry.assets.push(asset);
      registry.lastUpdated = new Date().toISOString();
      registry.version += 1;
      
      return await this.saveAssetRegistry(registry);
    } catch (error) {
      console.error('Error adding asset to registry:', error);
      return false;
    }
  }

  async removeAssetFromRegistry(assetId: string): Promise<boolean> {
    try {
      const registry = await this.loadAssetRegistry();
      
      registry.assets = registry.assets.filter(a => a.id !== assetId);
      registry.lastUpdated = new Date().toISOString();
      registry.version += 1;
      
      return await this.saveAssetRegistry(registry);
    } catch (error) {
      console.error('Error removing asset from registry:', error);
      return false;
    }
  }

  async getAllUserAssets(): Promise<AssetRegistryEntry[]> {
    try {
      const registry = await this.loadAssetRegistry();
      return registry.assets.filter(asset => asset.userId === this.userId);
    } catch (error) {
      console.error('Error getting user assets:', error);
      return [];
    }
  }

  async saveProjectToRegistry(project: MockupProject): Promise<boolean> {
    try {
      const registry = await this.loadAssetRegistry();
      
      // Remove existing project with same ID if it exists
      registry.projects = registry.projects.filter(p => p.id !== project.id);
      
      // Add/update project
      registry.projects.push(project);
      registry.lastUpdated = new Date().toISOString();
      registry.version += 1;
      
      return await this.saveAssetRegistry(registry);
    } catch (error) {
      console.error('Error saving project to registry:', error);
      return false;
    }
  }

  async removeProjectFromRegistry(projectId: string): Promise<boolean> {
    try {
      const registry = await this.loadAssetRegistry();
      
      registry.projects = registry.projects.filter(p => p.id !== projectId);
      registry.lastUpdated = new Date().toISOString();
      registry.version += 1;
      
      return await this.saveAssetRegistry(registry);
    } catch (error) {
      console.error('Error removing project from registry:', error);
      return false;
    }
  }

  async getAllUserProjects(): Promise<MockupProject[]> {
    try {
      const registry = await this.loadAssetRegistry();
      return registry.projects || [];
    } catch (error) {
      console.error('Error getting user projects:', error);
      return [];
    }
  }

  private createEmptyRegistry(): AssetRegistry {
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      assets: [],
      projects: []
    };
  }
}

export const assetRegistryService = new AssetRegistryService();
export type { AssetRegistryEntry, AssetRegistry };