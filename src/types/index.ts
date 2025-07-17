export interface UploadedImage {
  id: string;
  name: string;
  url: string;
  type: 'blank' | 'design';
  uploadedAt: Date;
  originalWidth?: number;
  originalHeight?: number;
  cloudinaryPublicId?: string; // Store Cloudinary public ID for management
}

export interface DesignElement {
  id: string;
  imageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  originalWidth?: number;
  originalHeight?: number;
  opacity?: number; // 0-100 percentage
}

export interface MockupProject {
  id: string;
  name: string;
  blankId: string;
  designs: DesignElement[];
  createdAt: Date;
  updatedAt: Date;
  thumbnail?: string;
}

export interface CanvasSettings {
  showGrid: boolean;
  snapToGrid: boolean;
  zoom: number;
}

export interface User {
  email: string;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  stayLoggedIn?: boolean;
}