import React from 'react';
import { Calendar, Edit3, Trash2 } from 'lucide-react';
import { MockupProject } from '../../types';

interface ProjectCardProps {
  project: MockupProject;
  onEdit: (project: MockupProject) => void;
  onDelete: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onDelete }) => {
  return (
    <div className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-blue-200">
      <div className="aspect-square bg-gray-100 relative">
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-400 text-center">
              <Edit3 className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">No preview</p>
            </div>
          </div>
        )}
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
          <button
            onClick={() => onEdit(project)}
            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate mb-2">{project.name}</h3>
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-1" />
          <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;