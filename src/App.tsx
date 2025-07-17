import React, { useState } from 'react';
import { useEffect } from 'react';
import { UploadedImage, MockupProject, DesignElement } from './types';
import { uploadToCloudinary, generateId, validateImageFile, convertRegistryEntryToUploadedImage } from './utils/fileUtils';
import { assetRegistryService } from './services/assetRegistryService';
import { ImageCompressor } from './utils/imageCompression';
import { cloudinaryService } from './services/cloudinaryService';
import { authService } from './services/authService';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboard/Dashboard';
import DesignCanvas from './components/Canvas/DesignCanvas';
import AssetGrid from './components/Library/AssetGrid';
import LoginForm from './components/Auth/LoginForm';
import CompressionProgress from './components/Upload/CompressionProgress';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [blanks, setBlanks] = useState<UploadedImage[]>([]);
  const [designs, setDesigns] = useState<UploadedImage[]>([]);
  const [projects, setProjects] = useState<MockupProject[]>([]);
  const [currentProject, setCurrentProject] = useState<MockupProject | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [compressionProgress, setCompressionProgress] = useState<{ [key: string]: { progress: number; fileName: string; originalSize?: number; compressedSize?: number; isComplete: boolean; hasError: boolean; compressionRatio?: number } }>({});
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [hasLoadedAssets, setHasLoadedAssets] = useState(false);

  // Load assets from Cloudinary on authentication
  useEffect(() => {
    if (isAuthenticated && !hasLoadedAssets) {
      loadAllAssets();
    }
  }, [isAuthenticated, hasLoadedAssets]);

  const loadAllAssets = async () => {
    if (hasLoadedAssets) return; // Prevent duplicate loading
    
    setIsLoadingAssets(true);
    try {
      console.log('Loading all assets from Cloudinary registry...');
      
      // Load assets from registry
      const registryAssets = await assetRegistryService.getAllUserAssets();
      console.log('Registry assets found:', registryAssets.length);
      
      if (registryAssets.length > 0) {
        const convertedAssets = registryAssets.map(convertRegistryEntryToUploadedImage);
        console.log('Converted assets:', convertedAssets);
        
        // Separate blanks and designs
        const cloudinaryBlanks = convertedAssets.filter(asset => asset.type === 'blank');
        const cloudinaryDesigns = convertedAssets.filter(asset => asset.type === 'design');
        
        console.log('Blanks found:', cloudinaryBlanks.length);
        console.log('Designs found:', cloudinaryDesigns.length);
        
        setBlanks(cloudinaryBlanks);
        setDesigns(cloudinaryDesigns);
        
        console.log(`Successfully loaded ${registryAssets.length} assets from Cloudinary`);
      } else {
        console.log('No assets found in registry');
        setBlanks([]);
        setDesigns([]);
      }

      // Load projects from registry
      const projectsData = await assetRegistryService.getAllUserProjects();
      setProjects(projectsData);
      console.log(`Loaded ${projectsData.length} projects from Cloudinary`);
      
      setHasLoadedAssets(true);
    } catch (error) {
      console.error('Failed to load assets from Cloudinary:', error);
      setBlanks([]);
      setDesigns([]);
      setProjects([]);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setHasLoadedAssets(false); // Reset flag to trigger asset loading
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('dashboard');
    setCurrentProject(null);
    setHasLoadedAssets(false);
    // Clear all state on logout
    setBlanks([]);
    setDesigns([]);
    setProjects([]);
  };

  const handleUploadImages = async (files: FileList, type: 'blank' | 'design') => {
    const validFiles = Array.from(files).filter(validateImageFile);
    
    if (validFiles.length === 0) {
      alert('Please upload valid image files (PNG, JPG, SVG, WebP) under 100MB. Large files will be automatically compressed.');
      return;
    }

    const newImages: UploadedImage[] = [];
    
    for (const file of validFiles) {
      try {
        const assetId = generateId(); // Generate unique ID for this asset
        
        // Initialize compression progress
        setCompressionProgress(prev => ({
          ...prev,
          [assetId]: {
            progress: 0,
            fileName: file.name,
            isComplete: false,
            hasError: false
          }
        }));

        // Compress image if needed
        const compressionResult = await ImageCompressor.compressImage(
          file,
          (progress) => {
            setCompressionProgress(prev => ({
              ...prev,
              [assetId]: {
                ...prev[assetId],
                progress: Math.round(progress * 0.7) // Compression takes 70% of total progress
              }
            }));
          }
        );

        // Update compression progress with results
        setCompressionProgress(prev => ({
          ...prev,
          [assetId]: {
            ...prev[assetId],
            progress: 70,
            originalSize: compressionResult.originalSize,
            compressedSize: compressionResult.compressedSize,
            compressionRatio: compressionResult.compressionRatio,
            isComplete: false
          }
        }));

        setUploadProgress(prev => ({ ...prev, [assetId]: 0 }));

        // Upload compressed file to Cloudinary
        const cloudinaryResult = await uploadToCloudinary(
          compressionResult.compressedFile, 
          `mockupr/${type}s`, 
          type, 
          assetId
        );
        
        // Update upload progress
        setCompressionProgress(prev => ({
          ...prev,
          [assetId]: {
            ...prev[assetId],
            progress: 100,
            isComplete: true
          }
        }));

        const image: UploadedImage = {
          id: assetId, // Use the same ID for consistency
          name: compressionResult.compressedFile.name,
          url: cloudinaryResult.url,
          type,
          uploadedAt: new Date(),
          originalWidth: cloudinaryResult.width,
          originalHeight: cloudinaryResult.height,
          cloudinaryPublicId: cloudinaryResult.publicId
        };
        
        newImages.push(image);
        setUploadProgress(prev => ({ ...prev, [assetId]: 100 }));
        
        // Remove progress after a delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const updated = { ...prev };
            delete updated[assetId];
            return updated;
          });
          setCompressionProgress(prev => {
            const updated = { ...prev };
            delete updated[assetId];
            return updated;
          });
        }, 2000);
        
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
        
        // Mark compression as failed
        const fileId = Object.keys(compressionProgress).find(id =>
          compressionProgress[id].fileName === file.name
        );
        if (fileId) {
          setCompressionProgress(prev => ({
            ...prev,
            [fileId]: {
              ...prev[fileId],
              hasError: true,
              isComplete: true,
              progress: 100
            }
          }));
        }
        
        alert(`Failed to upload ${file.name}. Please try again.`);
      }
    }

    // Update state with new images
    if (type === 'blank') {
      setBlanks(prev => [...prev, ...newImages]);
    } else {
      setDesigns(prev => [...prev, ...newImages]);
    }
  };

  const handleDeleteImage = async (id: string) => {
    // Find the image to get its Cloudinary public ID
    const imageToDelete = [...blanks, ...designs].find(img => img.id === id);
    
    // Remove from asset registry
    try {
      await assetRegistryService.removeAssetFromRegistry(id);
      console.log('Asset removed from registry:', id);
    } catch (error) {
      console.error('Failed to remove from registry:', error);
    }
    
    if (imageToDelete?.cloudinaryPublicId) {
      try {
        await cloudinaryService.deleteImage(imageToDelete.cloudinaryPublicId);
      } catch (error) {
        console.error('Failed to delete from Cloudinary:', error);
      }
    }
    
    // Update state
    setBlanks(prev => prev.filter(img => img.id !== id));
    setDesigns(prev => prev.filter(img => img.id !== id));
  };

  const handleCreateProject = (blank: UploadedImage) => {
    const project: MockupProject = {
      id: generateId(),
      name: `Mockup ${projects.length + 1}`,
      blankId: blank.id,
      designs: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save to Cloudinary
    assetRegistryService.saveProjectToRegistry(project).catch(error => {
      console.error('Failed to save project to registry:', error);
    });
    
    setProjects(prev => [...prev, project]);
    setCurrentProject(project);
    setActiveTab('canvas');
  };

  const handleEditProject = (project: MockupProject) => {
    setCurrentProject(project);
    setActiveTab('canvas');
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await assetRegistryService.removeProjectFromRegistry(id);
      console.log('Project removed from registry:', id);
    } catch (error) {
      console.error('Failed to remove project from registry:', error);
    }
    
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProject?.id === id) {
      setCurrentProject(null);
    }
  };

  const handleProjectUpdate = async (updatedProject: MockupProject) => {
    // Save to Cloudinary
    try {
      await assetRegistryService.saveProjectToRegistry(updatedProject);
      console.log('Project saved to registry:', updatedProject.id);
    } catch (error) {
      console.error('Failed to save project to registry:', error);
    }
    
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setCurrentProject(updatedProject);
  };

  const handleAddDesignToProject = (designImage: UploadedImage) => {
    if (!currentProject) return;

    // Calculate reasonable display size while preserving aspect ratio
    const maxDisplaySize = 300; // Maximum size for initial display
    let displayWidth = designImage.originalWidth || 150;
    let displayHeight = designImage.originalHeight || 150;

    // Scale down if too large, but preserve aspect ratio
    if (displayWidth > maxDisplaySize || displayHeight > maxDisplaySize) {
      const aspectRatio = displayWidth / displayHeight;
      if (displayWidth > displayHeight) {
        displayWidth = maxDisplaySize;
        displayHeight = maxDisplaySize / aspectRatio;
      } else {
        displayHeight = maxDisplaySize;
        displayWidth = maxDisplaySize * aspectRatio;
      }
    }

    const newDesign: DesignElement = {
      id: generateId(),
      imageId: designImage.id,
      x: 200,
      y: 200,
      width: displayWidth,
      height: displayHeight,
      rotation: 0,
      zIndex: currentProject.designs.length,
      originalWidth: designImage.originalWidth,
      originalHeight: designImage.originalHeight,
      opacity: 100 // Default to 100% opacity
    };

    const updatedProject = {
      ...currentProject,
      designs: [...currentProject.designs, newDesign],
      updatedAt: new Date()
    };

    handleProjectUpdate(updatedProject);
  };

  const currentBlank = currentProject ? blanks.find(b => b.id === currentProject.blankId) : null;
  const hasActiveUploads = Object.keys(uploadProgress).length > 0;
  const hasActiveCompressions = Object.keys(compressionProgress).length > 0;

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Loading Assets Indicator */}
        {isLoadingAssets && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-blue-800 font-medium">Loading your assets from Cloudinary...</p>
                <p className="text-blue-600 text-sm">Syncing your uploaded files and projects</p>
              </div>
            </div>
          </div>
        )}

        {/* Compression Progress */}
        {hasActiveCompressions && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <h3 className="text-lg font-semibold text-gray-900">Optimizing Images</h3>
            </div>
            <div className="grid gap-3">
              {Object.entries(compressionProgress).map(([id, progress]) => (
                <CompressionProgress
                  key={id}
                  fileName={progress.fileName}
                  progress={progress.progress}
                  originalSize={progress.originalSize}
                  compressedSize={progress.compressedSize}
                  isComplete={progress.isComplete}
                  hasError={progress.hasError}
                  compressionRatio={progress.compressionRatio}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress Indicator */}
        {hasActiveUploads && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-blue-800 font-medium">Uploading files...</p>
                <p className="text-blue-600 text-sm">Please wait while your files are being uploaded to Cloudinary</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            blanks={blanks}
            designs={designs}
            projects={projects}
            uploadProgress={uploadProgress}
            compressionProgress={compressionProgress}
            onUploadBlanks={(files) => handleUploadImages(files, 'blank')}
            onUploadDesigns={(files) => handleUploadImages(files, 'design')}
            onDeleteImage={handleDeleteImage}
            onCreateProject={handleCreateProject}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {activeTab === 'canvas' && (
          <div className="space-y-6">
            {currentProject ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{currentProject.name}</h2>
                    <p className="text-gray-600">Design your mockup</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      value={currentProject.name}
                      onChange={(e) => handleProjectUpdate({ ...currentProject, name: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <DesignCanvas
                  project={currentProject}
                  blankImage={currentBlank}
                  designImages={designs}
                  blanks={blanks}
                  onProjectUpdate={handleProjectUpdate}
                />

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Designs</h3>
                  <AssetGrid
                    images={designs}
                    onDelete={handleDeleteImage}
                    onSelect={handleAddDesignToProject}
                    selectable={true}
                    title="Design Library"
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-xl mb-4">No project selected</p>
                <p className="text-gray-400 mb-6">Create a new project from the dashboard to start designing</p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Asset Library</h2>
              <p className="text-gray-600 mb-8">Manage all your uploaded templates and designs stored in Cloudinary</p>
            </div>

            <AssetGrid
              images={blanks}
              onDelete={handleDeleteImage}
              title="Blank Templates"
            />

            <AssetGrid
              images={designs}
              onDelete={handleDeleteImage}
              title="Design Assets"
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;