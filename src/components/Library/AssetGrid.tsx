import React from 'react';
import { Trash2, Download, Edit3, Cloud } from 'lucide-react';
import { UploadedImage } from '../../types';

interface AssetGridProps {
  images: UploadedImage[];
  onDelete: (id: string) => void;
  onSelect?: (image: UploadedImage) => void;
  selectable?: boolean;
  title: string;
  onRename?: (id: string, newName: string) => void;
}

const AssetGrid: React.FC<AssetGridProps> = ({
  images,
  onDelete,
  onSelect,
  selectable = false,
  title,
  onRename
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  const handleRename = (image: UploadedImage) => {
    setEditingId(image.id);
    setEditingName(image.name);
  };

  const handleSaveRename = (id: string) => {
    if (onRename && editingName.trim()) {
      onRename(id, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">{`No ${title.toLowerCase()} uploaded yet`}</p>
        <p className="text-gray-400 text-sm mt-2">Upload some files to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className={`group relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md ${
              selectable ? 'cursor-pointer hover:border-blue-300' : ''
            }`}
            onClick={() => selectable && onSelect?.(image)}
          >
            <div className="aspect-square bg-gray-100">
              <img
                src={image.url}
                alt={image.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="p-3">
              {editingId === image.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(image.id);
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                    autoFocus
                  />
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleSaveRename(image.id)}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate flex-1">
                    {image.name}
                  </p>
                  {image.cloudinaryPublicId && (
                    <Cloud className="w-3 h-3 text-blue-500 ml-1" title="Stored in Cloudinary" />
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {new Date(image.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
              {onRename && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRename(image);
                  }}
                  className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                  title="Rename"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(image.id);
                }}
                className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetGrid;