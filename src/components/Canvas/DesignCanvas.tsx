import React, { useRef, useEffect, useState } from 'react';
import { RotateCw, Move, Square, Download, ZoomIn, ZoomOut, Trash2, RefreshCw, Lock, Unlock, Sun, Moon, RotateCcw, Eye } from 'lucide-react';
import { UploadedImage, DesignElement, MockupProject } from '../../types';
import { downloadImage } from '../../utils/fileUtils';

interface DesignCanvasProps {
  project: MockupProject | null;
  blankImage: UploadedImage | null;
  designImages: UploadedImage[];
  blanks: UploadedImage[];
  onProjectUpdate: (project: MockupProject) => void;
}

const DesignCanvas: React.FC<DesignCanvasProps> = ({
  project,
  blankImage,
  designImages,
  blanks,
  onProjectUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 });
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);
  const [previewMode, setPreviewMode] = useState<'normal' | 'studio' | 'angled'>('normal');
  const [lightingMode, setLightingMode] = useState<'bright' | 'dim'>('bright');
  const [viewMode, setViewMode] = useState<'front' | 'back'>('front');
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp'>('jpg');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    renderCanvas();
  }, [project, blankImage, designImages, zoom, previewMode, lightingMode, viewMode, selectedElement]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !project || !blankImage?.url) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply preview effects
    ctx.save();
    
    // Lighting effects
    if (lightingMode === 'dim') {
      ctx.globalAlpha = 0.8;
    }

    // Studio background
    if (previewMode === 'studio') {
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
      );
      gradient.addColorStop(0, '#f8f9fa');
      gradient.addColorStop(1, '#e9ecef');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.restore();

    // Draw blank template
    const blankImg = new Image();
    blankImg.crossOrigin = 'anonymous'; // Enable CORS for Cloudinary images
    blankImg.onload = () => {
      ctx.save();
      
      // Apply angled view transformation
      if (previewMode === 'angled') {
        ctx.transform(1, 0, -0.2, 0.9, canvas.width * 0.1, canvas.height * 0.05);
      }
      
      // Apply view mode (flip for back view)
      if (viewMode === 'back') {
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
      }
      
      ctx.drawImage(blankImg, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      
      // Draw design elements
      project.designs.forEach((design) => {
        const designImage = designImages.find(img => img.id === design.imageId);
        if (!designImage?.url) return;

        const designImg = new Image();
        designImg.crossOrigin = 'anonymous'; // Enable CORS for Cloudinary images
        designImg.onload = () => {
          ctx.save();
          
          // Apply preview transformations
          if (previewMode === 'angled') {
            ctx.transform(1, 0, -0.2, 0.9, canvas.width * 0.1, canvas.height * 0.05);
          }
          
          if (viewMode === 'back') {
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
          }
          
          // Transform for rotation
          const centerX = design.x + design.width / 2;
          const centerY = design.y + design.height / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate((design.rotation * Math.PI) / 180);
          ctx.translate(-centerX, -centerY);
          
          // Apply design opacity (default to 100% if not set)
          const designOpacity = design.opacity !== undefined ? design.opacity / 100 : 1;
          ctx.globalAlpha = designOpacity;
          
          // Use normal blend mode to prevent transparency issues
          ctx.globalCompositeOperation = 'source-over';
          
          ctx.drawImage(designImg, design.x, design.y, design.width, design.height);
          
          ctx.restore();
          
          // Draw selection outline and handles if selected (only in normal preview mode)
          if (selectedElement === design.id && previewMode === 'normal') {
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            
            // Selection outline
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 2;
            ctx.strokeRect(design.x - 2, design.y - 2, design.width + 4, design.height + 4);
            
            // Resize handles
            const handleSize = 8;
            const handles = [
              { x: design.x - handleSize/2, y: design.y - handleSize/2, cursor: 'nw-resize', handle: 'nw' },
              { x: design.x + design.width - handleSize/2, y: design.y - handleSize/2, cursor: 'ne-resize', handle: 'ne' },
              { x: design.x - handleSize/2, y: design.y + design.height - handleSize/2, cursor: 'sw-resize', handle: 'sw' },
              { x: design.x + design.width - handleSize/2, y: design.y + design.height - handleSize/2, cursor: 'se-resize', handle: 'se' },
              { x: design.x + design.width/2 - handleSize/2, y: design.y - handleSize/2, cursor: 'n-resize', handle: 'n' },
              { x: design.x + design.width/2 - handleSize/2, y: design.y + design.height - handleSize/2, cursor: 's-resize', handle: 's' },
              { x: design.x - handleSize/2, y: design.y + design.height/2 - handleSize/2, cursor: 'w-resize', handle: 'w' },
              { x: design.x + design.width - handleSize/2, y: design.y + design.height/2 - handleSize/2, cursor: 'e-resize', handle: 'e' }
            ];
            
            ctx.fillStyle = '#3B82F6';
            handles.forEach(handle => {
              ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
            });
            
            // Delete button
            const deleteSize = 20;
            const deleteX = design.x + design.width - deleteSize / 2;
            const deleteY = design.y - deleteSize / 2;
            
            ctx.fillStyle = '#EF4444';
            ctx.beginPath();
            ctx.arc(deleteX, deleteY, deleteSize / 2, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(deleteX - 5, deleteY - 5);
            ctx.lineTo(deleteX + 5, deleteY + 5);
            ctx.moveTo(deleteX + 5, deleteY - 5);
            ctx.lineTo(deleteX - 5, deleteY + 5);
            ctx.stroke();
            
            ctx.restore();
          }
        };
        designImg.src = designImage.url;
      });
    };
    blankImg.src = blankImage.url;
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const getResizeHandle = (x: number, y: number, design: DesignElement): string | null => {
    const handleSize = 8;
    const tolerance = 4;
    
    const handles = [
      { x: design.x - handleSize/2, y: design.y - handleSize/2, handle: 'nw' },
      { x: design.x + design.width - handleSize/2, y: design.y - handleSize/2, handle: 'ne' },
      { x: design.x - handleSize/2, y: design.y + design.height - handleSize/2, handle: 'sw' },
      { x: design.x + design.width - handleSize/2, y: design.y + design.height - handleSize/2, handle: 'se' },
      { x: design.x + design.width/2 - handleSize/2, y: design.y - handleSize/2, handle: 'n' },
      { x: design.x + design.width/2 - handleSize/2, y: design.y + design.height - handleSize/2, handle: 's' },
      { x: design.x - handleSize/2, y: design.y + design.height/2 - handleSize/2, handle: 'w' },
      { x: design.x + design.width - handleSize/2, y: design.y + design.height/2 - handleSize/2, handle: 'e' }
    ];
    
    for (const handle of handles) {
      if (Math.abs(x - (handle.x + handleSize/2)) <= handleSize/2 + tolerance &&
          Math.abs(y - (handle.y + handleSize/2)) <= handleSize/2 + tolerance) {
        return handle.handle;
      }
    }
    
    return null;
  };

  const updateCanvasCursor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!project || previewMode !== 'normal' || isDragging || isResizing) return;

    const { x, y } = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Find element under cursor
    const hoveredElement = [...project.designs]
      .reverse()
      .find(design => {
        return x >= design.x && 
               x <= design.x + design.width && 
               y >= design.y && 
               y <= design.y + design.height;
      });

    if (hoveredElement && selectedElement === hoveredElement.id) {
      // Check for resize handles
      const handle = getResizeHandle(x, y, hoveredElement);
      if (handle) {
        const cursorMap: { [key: string]: string } = {
          'nw': 'nw-resize',
          'ne': 'ne-resize',
          'sw': 'sw-resize',
          'se': 'se-resize',
          'n': 'n-resize',
          's': 's-resize',
          'w': 'w-resize',
          'e': 'e-resize'
        };
        canvas.style.cursor = cursorMap[handle];
        return;
      }
    }

    if (hoveredElement) {
      canvas.style.cursor = 'move';
    } else {
      canvas.style.cursor = 'default';
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!project || previewMode !== 'normal') return;

    const { x, y } = getCanvasCoordinates(e);

    // Find clicked element (reverse order for z-index)
    const clickedElement = [...project.designs]
      .reverse()
      .find(design => {
        // Check if clicking on delete button
        const deleteSize = 20;
        const deleteX = design.x + design.width - deleteSize / 2;
        const deleteY = design.y - deleteSize / 2;
        const distToDelete = Math.sqrt((x - deleteX) ** 2 + (y - deleteY) ** 2);
        
        if (distToDelete <= deleteSize / 2 && selectedElement === design.id) {
          // Delete the design
          handleDeleteDesign(design.id);
          return false;
        }
        
        return x >= design.x && 
               x <= design.x + design.width && 
               y >= design.y && 
               y <= design.y + design.height;
      });

    if (clickedElement) {
      setSelectedElement(clickedElement.id);
      
      // Check if clicking on a resize handle
      if (selectedElement === clickedElement.id) {
        const handle = getResizeHandle(x, y, clickedElement);
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
          setDragStart({ x, y });
          return;
        }
      }
      
      // Start dragging
      setIsDragging(true);
      setDragStart({ x: x - clickedElement.x, y: y - clickedElement.y });
    } else {
      setSelectedElement(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updateCanvasCursor(e);
    
    if (!project || previewMode !== 'normal') return;

    const { x, y } = getCanvasCoordinates(e);
    
    if (isDragging && selectedElement) {
      // Handle dragging
      const updatedDesigns = project.designs.map(design =>
        design.id === selectedElement 
          ? { ...design, x: x - dragStart.x, y: y - dragStart.y }
          : design
      );

      onProjectUpdate({
        ...project,
        designs: updatedDesigns,
        updatedAt: new Date()
      });
    } else if (isResizing && selectedElement && resizeHandle) {
      // Handle resizing
      const selectedDesign = project.designs.find(d => d.id === selectedElement);
      if (!selectedDesign) return;

      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;
      
      let newX = selectedDesign.x;
      let newY = selectedDesign.y;
      let newWidth = selectedDesign.width;
      let newHeight = selectedDesign.height;

      // Calculate new dimensions based on resize handle
      switch (resizeHandle) {
        case 'nw':
          newX = selectedDesign.x + deltaX;
          newY = selectedDesign.y + deltaY;
          newWidth = selectedDesign.width - deltaX;
          newHeight = selectedDesign.height - deltaY;
          break;
        case 'ne':
          newY = selectedDesign.y + deltaY;
          newWidth = selectedDesign.width + deltaX;
          newHeight = selectedDesign.height - deltaY;
          break;
        case 'sw':
          newX = selectedDesign.x + deltaX;
          newWidth = selectedDesign.width - deltaX;
          newHeight = selectedDesign.height + deltaY;
          break;
        case 'se':
          newWidth = selectedDesign.width + deltaX;
          newHeight = selectedDesign.height + deltaY;
          break;
        case 'n':
          newY = selectedDesign.y + deltaY;
          newHeight = selectedDesign.height - deltaY;
          break;
        case 's':
          newHeight = selectedDesign.height + deltaY;
          break;
        case 'w':
          newX = selectedDesign.x + deltaX;
          newWidth = selectedDesign.width - deltaX;
          break;
        case 'e':
          newWidth = selectedDesign.width + deltaX;
          break;
      }

      // Maintain aspect ratio if locked
      if (aspectRatioLocked && (resizeHandle === 'nw' || resizeHandle === 'ne' || resizeHandle === 'sw' || resizeHandle === 'se')) {
        const aspectRatio = selectedDesign.width / selectedDesign.height;
        
        if (resizeHandle === 'nw' || resizeHandle === 'ne') {
          newHeight = newWidth / aspectRatio;
          if (resizeHandle === 'nw') {
            newY = selectedDesign.y + selectedDesign.height - newHeight;
          }
        } else {
          newHeight = newWidth / aspectRatio;
        }
      }

      // Ensure minimum size
      newWidth = Math.max(20, newWidth);
      newHeight = Math.max(20, newHeight);

      const updatedDesigns = project.designs.map(design =>
        design.id === selectedElement 
          ? { ...design, x: newX, y: newY, width: newWidth, height: newHeight }
          : design
      );

      onProjectUpdate({
        ...project,
        designs: updatedDesigns,
        updatedAt: new Date()
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleDeleteDesign = (designId: string) => {
    if (!project) return;

    const updatedDesigns = project.designs.filter(design => design.id !== designId);
    
    onProjectUpdate({
      ...project,
      designs: updatedDesigns,
      updatedAt: new Date()
    });
    
    setSelectedElement(null);
  };

  const updateSelectedElement = (updates: Partial<DesignElement>) => {
    if (!project || !selectedElement) return;

    const updatedDesigns = project.designs.map(design =>
      design.id === selectedElement ? { ...design, ...updates } : design
    );

    onProjectUpdate({
      ...project,
      designs: updatedDesigns,
      updatedAt: new Date()
    });
  };

  const handleProportionalResize = (dimension: 'width' | 'height', value: number) => {
    if (!selectedDesign || !aspectRatioLocked) {
      // Free-form resizing when aspect ratio is unlocked
      if (dimension === 'width') {
        updateSelectedElement({ width: value });
      } else {
        updateSelectedElement({ height: value });
      }
      return;
    }
    
    // Proportional resizing when aspect ratio is locked
    const aspectRatio = selectedDesign.width / selectedDesign.height;
    
    if (dimension === 'width') {
      const newHeight = value / aspectRatio;
      updateSelectedElement({ width: value, height: newHeight });
    } else {
      const newWidth = value * aspectRatio;
      updateSelectedElement({ width: newWidth, height: value });
    }
  };

  const handleBlankChange = (newBlank: UploadedImage) => {
    if (!project) return;

    onProjectUpdate({
      ...project,
      blankId: newBlank.id,
      updatedAt: new Date()
    });
  };

  const handleExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !project || !blankImage) return;

    setIsExporting(true);

    try {
      // Create a high-resolution export canvas (4x for high quality)
      const exportCanvas = document.createElement('canvas');
      const exportCtx = exportCanvas.getContext('2d');
      if (!exportCtx) return;

      // Set high resolution (4x for balance between quality and file size)
      const scale = 4;
      exportCanvas.width = canvasSize.width * scale;
      exportCanvas.height = canvasSize.height * scale;
      exportCtx.scale(scale, scale);

      // Apply current preview settings to export
      exportCtx.save();
      
      if (lightingMode === 'dim') {
        exportCtx.globalAlpha = 0.8;
      }

      if (previewMode === 'studio') {
        const gradient = exportCtx.createRadialGradient(
          canvasSize.width / 2, canvasSize.height / 2, 0,
          canvasSize.width / 2, canvasSize.height / 2, Math.max(canvasSize.width, canvasSize.height) / 2
        );
        gradient.addColorStop(0, '#f8f9fa');
        gradient.addColorStop(1, '#e9ecef');
        exportCtx.fillStyle = gradient;
        exportCtx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      }

      exportCtx.restore();

      // Draw blank template
      const blankImg = new Image();
      blankImg.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve) => {
        blankImg.onload = () => {
          exportCtx.save();
          
          if (previewMode === 'angled') {
            exportCtx.transform(1, 0, -0.2, 0.9, canvasSize.width * 0.1, canvasSize.height * 0.05);
          }
          
          if (viewMode === 'back') {
            exportCtx.scale(-1, 1);
            exportCtx.translate(-canvasSize.width, 0);
          }
          
          exportCtx.drawImage(blankImg, 0, 0, canvasSize.width, canvasSize.height);
          exportCtx.restore();
          resolve();
        };
        blankImg.src = blankImage.url;
      });
      
      // Draw design elements without selection borders
      if (project.designs.length > 0) {
        await Promise.all(project.designs.map(async (design) => {
          const designImage = designImages.find(img => img.id === design.imageId);
          if (!designImage) return;

          return new Promise<void>((resolve) => {
            const designImg = new Image();
            designImg.crossOrigin = 'anonymous';
            designImg.onload = () => {
              exportCtx.save();
              
              if (previewMode === 'angled') {
                exportCtx.transform(1, 0, -0.2, 0.9, canvasSize.width * 0.1, canvasSize.height * 0.05);
              }
              
              if (viewMode === 'back') {
                exportCtx.scale(-1, 1);
                exportCtx.translate(-canvasSize.width, 0);
              }
              
              // Transform for rotation
              const centerX = design.x + design.width / 2;
              const centerY = design.y + design.height / 2;
              exportCtx.translate(centerX, centerY);
              exportCtx.rotate((design.rotation * Math.PI) / 180);
              exportCtx.translate(-centerX, -centerY);
              
              // Apply design opacity
              const designOpacity = design.opacity !== undefined ? design.opacity / 100 : 1;
              exportCtx.globalAlpha = designOpacity;
              exportCtx.globalCompositeOperation = 'source-over';
              
              exportCtx.drawImage(designImg, design.x, design.y, design.width, design.height);
              
              exportCtx.restore();
              resolve();
            };
            designImg.src = designImage.url;
          });
        }));
      }

      // Download with size optimization
      downloadImage(exportCanvas, project.name, exportFormat);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedDesign = project?.designs.find(d => d.id === selectedElement);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Canvas Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Design Canvas</h3>
          <div className="flex items-center space-x-2">
            {/* Preview Controls */}
            <div className="flex items-center space-x-1 mr-4">
              <button
                onClick={() => setPreviewMode(previewMode === 'normal' ? 'studio' : 'normal')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  previewMode === 'studio' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Studio Background"
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPreviewMode(previewMode === 'angled' ? 'normal' : 'angled')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  previewMode === 'angled' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Angled View"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setLightingMode(lightingMode === 'bright' ? 'dim' : 'bright')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  lightingMode === 'dim' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Toggle Lighting"
              >
                {lightingMode === 'bright' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'front' ? 'back' : 'front')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  viewMode === 'back' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Toggle Front/Back View"
              >
                {viewMode === 'front' ? 'Front' : 'Back'}
              </button>
            </div>

            {/* Export Format Selector */}
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'png' | 'jpg' | 'webp')}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="jpg">JPEG (Smaller)</option>
              <option value="png">PNG (Lossless)</option>
              <option value="webp">WebP (Best)</option>
            </select>

            {/* Zoom Controls */}
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600 min-w-[4rem] text-center">
              {(zoom * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export HD (≤15MB)'}</span>
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <div 
            className="border-2 border-gray-300 rounded-lg overflow-hidden"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center top' }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className="cursor-default"
            />
          </div>
        </div>

        {/* Canvas Instructions */}
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>
            <strong>Click</strong> to select • <strong>Drag</strong> to move • <strong>Drag corners/edges</strong> to resize
          </p>
        </div>
      </div>

      {/* Tools Panel */}
      <div className="w-full lg:w-80 space-y-6">
        {/* Blank Templates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Blank Templates</h4>
          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
            {blanks.map((blank) => (
              <div
                key={blank.id}
                onClick={() => handleBlankChange(blank)}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  project?.blankId === blank.id
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="aspect-square bg-gray-100">
                  <img
                    src={blank.url}
                    alt={blank.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {project?.blankId === blank.id && (
                  <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
                    <RefreshCw className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Design Tools */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Design Tools</h4>
          
          {selectedDesign ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Selected Design</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                    className={`p-1.5 rounded-lg transition-colors duration-200 ${
                      aspectRatioLocked 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    title={aspectRatioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                  >
                    {aspectRatioLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteDesign(selectedDesign.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-2">
                {aspectRatioLocked ? 'Proportional resizing enabled' : 'Free-form resizing enabled'}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedDesign.x)}
                      onChange={(e) => updateSelectedElement({ x: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedDesign.y)}
                      onChange={(e) => updateSelectedElement({ y: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size {aspectRatioLocked ? '(Proportional)' : '(Free-form)'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Width</label>
                    <input
                      type="number"
                      value={Math.round(selectedDesign.width)}
                      onChange={(e) => handleProportionalResize('width', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Height</label>
                    <input
                      type="number"
                      value={Math.round(selectedDesign.height)}
                      onChange={(e) => handleProportionalResize('height', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rotation</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={selectedDesign.rotation}
                  onChange={(e) => updateSelectedElement({ rotation: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">
                  {selectedDesign.rotation}°
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedDesign.opacity !== undefined ? selectedDesign.opacity : 100}
                  onChange={(e) => updateSelectedElement({ opacity: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">
                  {selectedDesign.opacity !== undefined ? selectedDesign.opacity : 100}%
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Move className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                Click on a design element to select and edit it
              </p>
              <p className="text-gray-400 text-xs mt-2">
                Drag to move • Drag corners to resize
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignCanvas;