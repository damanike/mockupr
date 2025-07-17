import React, { useState } from 'react';
import { Plus, Image, Palette, Upload } from 'lucide-react';
import { UploadedImage, MockupProject } from '../../types';
import { generateId } from '../../utils/fileUtils';
import UploadZone from '../Upload/UploadZone';
import AssetGrid from '../Library/AssetGrid';
import ProjectCard from './ProjectCard';

interface DashboardProps {
  blanks: UploadedImage[];
  designs: UploadedImage[];
  projects: MockupProject[];
  uploadProgress: { [key: string]: number };
  compressionProgress: { [key: string]: any };
  onUploadBlanks: (files: FileList) => void;
  onUploadDesigns: (files: FileList) => void;
  onDeleteImage: (id: string) => void;
  onCreateProject: (blank: UploadedImage) => void;
  onEditProject: (project: MockupProject) => void;
  onDeleteProject: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  blanks,
  designs,
  projects,
  uploadProgress,
  compressionProgress,
  onUploadBlanks,
  onUploadDesigns,
  onDeleteImage,
  onCreateProject,
  onEditProject,
  onDeleteProject
}) => {
  const [showCreateProject, setShowCreateProject] = useState(false);

  const handleCreateProjectClick = () => {
    if (blanks.length === 0) {
      alert('Please upload at least one blank template before creating a project.');
      return;
    }
    setShowCreateProject(!showCreateProject);
  };

  const handleBlankSelect = (blank: UploadedImage) => {
    onCreateProject(blank);
    setShowCreateProject(false);
  };

  const hasActiveUploads = Object.keys(uploadProgress).length > 0;

  return (
    <div className="space-y-8">
      {/* Upload Progress Indicator */}
      {hasActiveUploads && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Upload className="w-5 h-5 text-blue-600 animate-pulse" />
            <div>
              <p className="text-blue-800 font-medium">Uploading and registering assets...</p>
              <p className="text-blue-600 text-sm">Your files are being stored and registered for cross-device access</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Image className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Blank Templates</h3>
          </div>
          <p className="text-gray-600 mb-4">Upload product mockup templates</p>
          <div className="text-2xl font-bold text-blue-600">{blanks.length}</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-xl border border-emerald-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Palette className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Design Assets</h3>
          </div>
          <p className="text-gray-600 mb-4">Your uploaded design files</p>
          <div className="text-2xl font-bold text-emerald-600">{designs.length}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Plus className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Active Projects</h3>
          </div>
          <p className="text-gray-600 mb-4">Your saved mockup projects</p>
          <div className="text-2xl font-bold text-purple-600">{projects.length}</div>
        </div>
      </div>

      {/* Upload Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Upload Blank Templates</h2>
          <UploadZone
            onFilesUploaded={onUploadBlanks}
            acceptedTypes="image/*"
            title="Drop blank templates here"
            description="Upload multiple T-shirts, hoodies, mugs, or any blank product images at once. Images are stored securely in Cloudinary."
            multiple={true}
          />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Upload Design Assets</h2>
          <UploadZone
            onFilesUploaded={onUploadDesigns}
            acceptedTypes="image/*"
            title="Drop design files here"
            description="Upload multiple logos, graphics, or any design elements at once. Images are stored securely in Cloudinary."
            multiple={true}
          />
        </div>
      </div>

      {/* Asset Library */}
      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Blank Templates</h2>
            <button
              onClick={handleCreateProjectClick}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                blanks.length > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={blanks.length === 0}
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
          
          {showCreateProject && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 font-medium mb-3">Select a blank template to create a new project:</p>
            </div>
          )}
          
          <AssetGrid
            images={blanks}
            onDelete={onDeleteImage}
            onSelect={showCreateProject ? handleBlankSelect : undefined}
            selectable={showCreateProject}
            title="Blank Templates"
            onRename={(id, newName) => {
              // Handle rename logic here
              console.log('Rename blank:', id, newName);
            }}
          />
        </div>

        <div>
          <AssetGrid
            images={designs}
            onDelete={onDeleteImage}
            title="Design Assets"
            onRename={(id, newName) => {
              // Handle rename logic here
              console.log('Rename design:', id, newName);
            }}
          />
        </div>
      </div>

      {/* Recent Projects */}
      {projects.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.slice(0, 8).map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={onEditProject}
                onDelete={onDeleteProject}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;