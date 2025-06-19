'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, RotateCw, RotateCcw, Square, Type, Palette, Sliders, Undo, Redo, Maximize, X, Save, Image as ImageIcon } from 'lucide-react';

interface ImageDimensions {
  width: number;
  height: number;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  isDragging?: boolean;
}

interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  sepia: number;
  hueRotate: number;
}

const ImageEditor = () => {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);

  // Editing states
  const [currentTool, setCurrentTool] = useState<'crop' | 'text' | 'filter' | 'rotate'>('crop');
  const [rotation, setRotation] = useState(0);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [filters, setFilters] = useState<FilterSettings>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    sepia: 0,
    hueRotate: 0
  });

  // History for undo/redo
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const fonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 
    'Comic Sans MS', 'Impact', 'Arial Black', 'Tahoma', 'Trebuchet MS'
  ];

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setCropArea({ x: 0, y: 0, width: img.width, height: img.height });
        setRotation(0);
        setTextElements([]);
        setFilters({
          brightness: 100,
          contrast: 100,
          saturation: 100,
          blur: 0,
          sepia: 0,
          hueRotate: 0
        });
        setSelectedTextId(null);
        saveInitialState();
        drawCanvas();
      };
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const drawCanvas = useCallback(() => {
    if (!originalImage || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to fit container while maintaining aspect ratio
    const maxWidth = 600;
    const maxHeight = 400;
    const scale = Math.min(maxWidth / originalImage.width, maxHeight / originalImage.height);
    canvas.width = originalImage.width * scale;
    canvas.height = originalImage.height * scale;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    
    // Rotate if needed
    if (rotation !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    // Apply filters
    const filterString = [
      `brightness(${filters.brightness}%)`,
      `contrast(${filters.contrast}%)`,
      `saturate(${filters.saturation}%)`,
      `blur(${filters.blur}px)`,
      `sepia(${filters.sepia}%)`,
      `hue-rotate(${filters.hueRotate}deg)`
    ].join(' ');
    
    ctx.filter = filterString;

    // Draw image
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    ctx.restore();

    // Draw text elements
    textElements.forEach((textEl) => {
      ctx.font = `${textEl.fontSize * scale}px ${textEl.fontFamily}`;
      ctx.fillStyle = textEl.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      
      // Scale text position
      const textX = textEl.x * scale;
      const textY = textEl.y * scale;
      
      ctx.strokeText(textEl.text, textX, textY);
      ctx.fillText(textEl.text, textX, textY);
      
      // Draw selection indicator
      if (selectedTextId === textEl.id) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        const metrics = ctx.measureText(textEl.text);
        ctx.strokeRect(textX - 2, textY - textEl.fontSize * scale - 2, metrics.width + 4, textEl.fontSize * scale + 4);
        ctx.setLineDash([]);
      }
    });

    // Draw crop overlay if cropping
    if (isCropping && currentTool === 'crop') {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Clear crop area
      if (cropArea.width > 0 && cropArea.height > 0) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillRect(
          cropArea.x * scale,
          cropArea.y * scale,
          cropArea.width * scale,
          cropArea.height * scale
        );
      }
      ctx.restore();
      
      // Draw crop handles
      if (cropArea.width > 0 && cropArea.height > 0) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          cropArea.x * scale,
          cropArea.y * scale,
          cropArea.width * scale,
          cropArea.height * scale
        );
        
        // Draw corner handles
        const handleSize = 8;
        ctx.fillStyle = '#3b82f6';
        [
          [cropArea.x * scale, cropArea.y * scale],
          [(cropArea.x + cropArea.width) * scale, cropArea.y * scale],
          [cropArea.x * scale, (cropArea.y + cropArea.height) * scale],
          [(cropArea.x + cropArea.width) * scale, (cropArea.y + cropArea.height) * scale]
        ].forEach(([x, y]) => {
          ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        });
      }
    }
  }, [originalImage, rotation, filters, textElements, cropArea, isCropping, currentTool, selectedTextId]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle global mouse events for cropping outside canvas
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isMouseDown || !originalImage || !previewCanvasRef.current) return;
      
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      
      if (currentTool === 'crop' && isCropping && cropStart) {
        const width = coords.x - cropStart.x;
        const height = coords.y - cropStart.y;
        setCropArea({
          x: width < 0 ? coords.x : cropStart.x,
          y: height < 0 ? coords.y : cropStart.y,
          width: Math.abs(width),
          height: Math.abs(height)
        });
      } else if (currentTool === 'text' && selectedTextId && dragStart) {
        const canvas = previewCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const deltaX = canvasX - dragStart.x;
        const deltaY = canvasY - dragStart.y;
        const scale = Math.min(600 / originalImage.width, 400 / originalImage.height);
        
        setTextElements(prev => prev.map(textEl => 
          textEl.id === selectedTextId 
            ? { ...textEl, x: textEl.x + deltaX / scale, y: textEl.y + deltaY / scale }
            : textEl
        ));
        setDragStart({ x: canvasX, y: canvasY });
      }
    };

    const handleGlobalMouseUp = () => {
      if (isMouseDown) {
        setIsMouseDown(false);
        if (selectedTextId && dragStart) {
          saveToHistory();
        }
        setDragStart(null);
        setCropStart(null);
      }
    };

    if (isMouseDown) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isMouseDown, currentTool, isCropping, cropStart, selectedTextId, dragStart, originalImage]);

  const saveInitialState = () => {
    const state = {
      rotation: 0,
      textElements: [],
      filters: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        sepia: 0,
        hueRotate: 0
      },
      cropArea: originalImage ? { x: 0, y: 0, width: originalImage.width, height: originalImage.height } : { x: 0, y: 0, width: 0, height: 0 }
    };
    setHistory([state]);
    setHistoryIndex(0);
  };

  const saveToHistory = () => {
    const state = {
      rotation,
      textElements: [...textElements],
      filters: { ...filters },
      cropArea: { ...cropArea }
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setRotation(prevState.rotation);
      setTextElements(prevState.textElements);
      setFilters(prevState.filters);
      setCropArea(prevState.cropArea);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setRotation(nextState.rotation);
      setTextElements(nextState.textElements);
      setFilters(nextState.filters);
      setCropArea(nextState.cropArea);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleRotate = (angle: number) => {
    setRotation((prev) => (prev + angle) % 360);
    saveToHistory();
  };

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !originalImage) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = originalImage.width / canvas.width;
    const scaleY = originalImage.height / canvas.height;
    
    // Clamp coordinates to canvas bounds
    const canvasX = Math.max(0, Math.min(clientX - rect.left, canvas.width));
    const canvasY = Math.max(0, Math.min(clientY - rect.top, canvas.height));
    
    return {
      x: Math.max(0, Math.min(canvasX * scaleX, originalImage.width)),
      y: Math.max(0, Math.min(canvasY * scaleY, originalImage.height))
    };
  };

  const getTextAtPosition = (x: number, y: number): TextElement | null => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return null;
    
    const scale = Math.min(600 / originalImage!.width, 400 / originalImage!.height);
    
    for (let i = textElements.length - 1; i >= 0; i--) {
      const textEl = textElements[i];
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      
      ctx.font = `${textEl.fontSize * scale}px ${textEl.fontFamily}`;
      const metrics = ctx.measureText(textEl.text);
      
      const textX = textEl.x * scale;
      const textY = textEl.y * scale;
      
      if (x >= textX && x <= textX + metrics.width &&
          y >= textY - textEl.fontSize * scale && y <= textY) {
        return textEl;
      }
    }
    return null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !originalImage) return;
    
    setIsMouseDown(true);
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);

    if (currentTool === 'text') {
      const clickedText = getTextAtPosition(canvasX, canvasY);
      
      if (clickedText) {
        setSelectedTextId(clickedText.id);
        setDragStart({ x: canvasX, y: canvasY });
      } else if (currentText.trim()) {
        const newTextElement: TextElement = {
          id: Date.now().toString(),
          text: currentText,
          x: coords.x,
          y: coords.y,
          fontSize,
          color: textColor,
          fontFamily
        };
        
        setTextElements([...textElements, newTextElement]);
        setCurrentText('');
        saveToHistory();
      }
    } else if (currentTool === 'crop' && isCropping) {
      setCropStart({ x: coords.x, y: coords.y });
      setCropArea({ x: coords.x, y: coords.y, width: 0, height: 0 });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDown) return;
    
    const canvas = previewCanvasRef.current;
    if (!canvas || !originalImage) return;
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);

    if (currentTool === 'text' && selectedTextId && dragStart) {
      const deltaX = canvasX - dragStart.x;
      const deltaY = canvasY - dragStart.y;
      const scale = Math.min(600 / originalImage.width, 400 / originalImage.height);
      
      setTextElements(prev => prev.map(textEl => 
        textEl.id === selectedTextId 
          ? { ...textEl, x: textEl.x + deltaX / scale, y: textEl.y + deltaY / scale }
          : textEl
      ));
      setDragStart({ x: canvasX, y: canvasY });
    } else if (currentTool === 'crop' && isCropping && cropStart) {
      const width = coords.x - cropStart.x;
      const height = coords.y - cropStart.y;
      setCropArea({
        x: width < 0 ? coords.x : cropStart.x,
        y: height < 0 ? coords.y : cropStart.y,
        width: Math.abs(width),
        height: Math.abs(height)
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsMouseDown(false);
    if (selectedTextId && dragStart) {
      saveToHistory();
    }
    setDragStart(null);
    setCropStart(null);
  };

  const applyEdit = () => {
    if (!originalImage || !canvasRef.current) return;

    setIsProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set final canvas size
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    
    // Rotate if needed
    if (rotation !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    // Apply filters
    const filterString = [
      `brightness(${filters.brightness}%)`,
      `contrast(${filters.contrast}%)`,
      `saturate(${filters.saturation}%)`,
      `blur(${filters.blur}px)`,
      `sepia(${filters.sepia}%)`,
      `hue-rotate(${filters.hueRotate}deg)`
    ].join(' ');
    
    ctx.filter = filterString;

    // Draw image (crop if needed)
    if (currentTool === 'crop' && cropArea.width > 0 && cropArea.height > 0) {
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
      ctx.drawImage(
        originalImage,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );
    } else {
      ctx.drawImage(originalImage, 0, 0);
    }

    ctx.restore();

    // Draw text elements
    textElements.forEach((textEl) => {
      ctx.font = `${textEl.fontSize}px ${textEl.fontFamily}`;
      ctx.fillStyle = textEl.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeText(textEl.text, textEl.x, textEl.y);
      ctx.fillText(textEl.text, textEl.x, textEl.y);
    });

    // Convert to blob and create URL
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setEditedImageUrl(url);
        saveToHistory();
      }
      setIsProcessing(false);
    });
  };

  const downloadImage = () => {
    if (!editedImageUrl) return;

    const link = document.createElement('a');
    link.href = editedImageUrl;
    link.download = `edited_${fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetImage = () => {
    setOriginalImage(null);
    setEditedImageUrl(null);
    setFileName('');
    setRotation(0);
    setTextElements([]);
    setFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      sepia: 0,
      hueRotate: 0
    });
    setHistory([]);
    setHistoryIndex(-1);
    setSelectedTextId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded-full">
              <Palette className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            {!isFullscreen && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="ml-4 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="전체화면"
              >
                <Maximize className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            이미지 편집기
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            브라우저에서 바로 이미지를 편집하세요. 크롭, 회전, 필터, 텍스트 추가 등 다양한 편집 기능을 제공합니다.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                <Upload className="w-5 h-5 inline mr-2" />
                이미지 업로드
              </h2>

              {!originalImage ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    dragOver
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    클릭하거나 이미지를 드래그하세요
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    JPG, PNG, WebP 파일 지원
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={originalImage.src}
                      alt="Original"
                      className="w-full h-32 object-contain bg-gray-100 dark:bg-gray-700 rounded-lg"
                    />
                    <button
                      onClick={resetImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">원본 정보</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      <p>파일명: {fileName}</p>
                      <p>크기: {originalImage.width} × {originalImage.height}px</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tools */}
            {originalImage && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  편집 도구
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCurrentTool('crop')}
                    className={`p-3 rounded-lg border transition-colors ${
                      currentTool === 'crop'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                    }`}
                  >
                    <Square className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm">크롭</span>
                  </button>
                  <button
                    onClick={() => setCurrentTool('rotate')}
                    className={`p-3 rounded-lg border transition-colors ${
                      currentTool === 'rotate'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                    }`}
                  >
                    <RotateCw className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm">회전</span>
                  </button>
                  <button
                    onClick={() => setCurrentTool('text')}
                    className={`p-3 rounded-lg border transition-colors ${
                      currentTool === 'text'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                    }`}
                  >
                    <Type className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm">텍스트</span>
                  </button>
                  <button
                    onClick={() => setCurrentTool('filter')}
                    className={`p-3 rounded-lg border transition-colors ${
                      currentTool === 'filter'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                    }`}
                  >
                    <Sliders className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm">필터</span>
                  </button>
                </div>

                {/* Tool Controls */}
                <div className="mt-6 space-y-4">
                  {currentTool === 'rotate' && (
                    <div>
                      <h4 className="font-medium mb-2 text-gray-900 dark:text-white">회전</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRotate(-90)}
                          className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-4 h-4 mx-auto" />
                        </button>
                        <button
                          onClick={() => handleRotate(90)}
                          className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <RotateCw className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                  )}

                  {currentTool === 'text' && (
                    <div className="space-y-3">
                      <h4 className="font-medium mb-2 text-gray-900 dark:text-white">텍스트 추가</h4>
                      <input
                        type="text"
                        value={currentText}
                        onChange={(e) => setCurrentText(e.target.value)}
                        placeholder="텍스트 입력"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                        />
                        <input
                          type="range"
                          min="12"
                          max="72"
                          value={fontSize}
                          onChange={(e) => setFontSize(parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {fonts.map((font) => (
                          <option key={font} value={font}>{font}</option>
                        ))}
                      </select>
                      {selectedTextId && (
                        <button
                          onClick={() => {
                            setTextElements(prev => prev.filter(t => t.id !== selectedTextId));
                            setSelectedTextId(null);
                            saveToHistory();
                          }}
                          className="w-full mt-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          선택된 텍스트 삭제
                        </button>
                      )}
                    </div>
                  )}

                  {currentTool === 'crop' && (
                    <div>
                      <h4 className="font-medium mb-2 text-gray-900 dark:text-white">크롭</h4>
                      <button
                        onClick={() => setIsCropping(!isCropping)}
                        className={`w-full p-2 rounded-lg transition-colors ${
                          isCropping
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        {isCropping ? '크롭 완료' : '크롭 시작'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-2">
            {originalImage && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    편집 미리보기
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={undo}
                      disabled={historyIndex <= 0}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Undo className="w-4 h-4" />
                    </button>
                    <button
                      onClick={redo}
                      disabled={historyIndex >= history.length - 1}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Redo className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  <canvas
                    ref={previewCanvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    className="max-w-full max-h-96 mx-auto cursor-crosshair"
                  />
                </div>

                <button
                  onClick={applyEdit}
                  disabled={isProcessing}
                  className="w-full mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>처리 중...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>편집 적용</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="lg:col-span-1">
            {originalImage && currentTool === 'filter' && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  필터 설정
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      밝기: {filters.brightness}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={filters.brightness}
                      onChange={(e) => setFilters(prev => ({ ...prev, brightness: parseInt(e.target.value) }))}
                      onMouseUp={() => saveToHistory()}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      대비: {filters.contrast}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={filters.contrast}
                      onChange={(e) => setFilters(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
                      onMouseUp={() => saveToHistory()}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      채도: {filters.saturation}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={filters.saturation}
                      onChange={(e) => setFilters(prev => ({ ...prev, saturation: parseInt(e.target.value) }))}
                      onMouseUp={() => saveToHistory()}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      블러: {filters.blur}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={filters.blur}
                      onChange={(e) => setFilters(prev => ({ ...prev, blur: parseInt(e.target.value) }))}
                      onMouseUp={() => saveToHistory()}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      세피아: {filters.sepia}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.sepia}
                      onChange={(e) => setFilters(prev => ({ ...prev, sepia: parseInt(e.target.value) }))}
                      onMouseUp={() => saveToHistory()}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      색조 회전: {filters.hueRotate}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={filters.hueRotate}
                      onChange={(e) => setFilters(prev => ({ ...prev, hueRotate: parseInt(e.target.value) }))}
                      onMouseUp={() => saveToHistory()}
                      className="w-full"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setFilters({
                        brightness: 100,
                        contrast: 100,
                        saturation: 100,
                        blur: 0,
                        sepia: 0,
                        hueRotate: 0
                      });
                      saveToHistory();
                    }}
                    className="w-full p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    초기화
                  </button>
                </div>
              </div>
            )}

            {/* Result */}
            {editedImageUrl && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mt-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  편집 결과
                </h2>

                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={editedImageUrl}
                      alt="Edited"
                      className="w-full h-32 object-contain bg-gray-100 dark:bg-gray-700 rounded-lg"
                    />
                  </div>

                  <button
                    onClick={downloadImage}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>다운로드</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">이미지 편집기 사용법</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">✅ 주요 기능</h3>
              <ul className="text-green-800 dark:text-green-300 text-sm space-y-1">
                <li>• 브라우저에서 직접 편집 (서버 업로드 없음)</li>
                <li>• 이미지 크롭 및 회전</li>
                <li>• 텍스트 오버레이 추가</li>
                <li>• 밝기, 대비, 채도 조정</li>
                <li>• 다양한 필터 효과</li>
                <li>• 실행 취소/다시 실행</li>
                <li>• 즉시 다운로드</li>
              </ul>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-6">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">💡 사용 팁</h3>
              <ul className="text-amber-800 dark:text-amber-300 text-sm space-y-1">
                <li>• 편집 도구를 선택한 후 미리보기에서 작업하세요</li>
                <li>• 텍스트 도구에서는 캔버스를 클릭하여 텍스트를 추가</li>
                <li>• 필터 조정 시 실시간으로 미리보기 확인 가능</li>
                <li>• 편집 적용 버튼을 눌러야 최종 결과 생성</li>
                <li>• 실행 취소 기능으로 이전 상태로 복원 가능</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Fullscreen close button */}
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="fixed top-4 right-4 z-50 p-2 bg-gray-900 bg-opacity-50 hover:bg-opacity-70 text-white rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageEditor;