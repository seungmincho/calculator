'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RotateCcw, Maximize, Image as ImageIcon, Info, Settings, X } from 'lucide-react';

interface ImageDimensions {
  width: number;
  height: number;
}

interface ResizeOptions {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
}

const ImageResizer = () => {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<ImageDimensions | null>(null);
  const [resizedImageUrl, setResizedImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [options, setOptions] = useState<ResizeOptions>({
    width: 800,
    height: 600,
    maintainAspectRatio: true,
    quality: 0.9,
    format: 'jpeg'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const presetSizes = [
    { name: '소셜미디어 (1080x1080)', width: 1080, height: 1080 },
    { name: '인스타그램 스토리 (1080x1920)', width: 1080, height: 1920 },
    { name: '페이스북 커버 (1200x630)', width: 1200, height: 630 },
    { name: '유튜브 썸네일 (1280x720)', width: 1280, height: 720 },
    { name: '웹 사이트 (1920x1080)', width: 1920, height: 1080 },
    { name: '모바일 (375x667)', width: 375, height: 667 },
    { name: '프로필 사진 (400x400)', width: 400, height: 400 },
    { name: '이메일 헤더 (600x200)', width: 600, height: 200 }
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
        setOriginalDimensions({ width: img.width, height: img.height });
        setOptions(prev => ({
          ...prev,
          width: img.width,
          height: img.height
        }));
        setResizedImageUrl(null);
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

  const updateDimensions = (newWidth: number, newHeight: number) => {
    if (!originalDimensions) return;

    if (options.maintainAspectRatio && originalImage) {
      const aspectRatio = originalDimensions.width / originalDimensions.height;
      setOptions(prev => ({
        ...prev,
        width: newWidth,
        height: Math.round(newWidth / aspectRatio)
      }));
    } else {
      setOptions(prev => ({
        ...prev,
        width: newWidth,
        height: newHeight
      }));
    }
  };

  const handlePresetSelect = (preset: { width: number; height: number }) => {
    setOptions(prev => ({
      ...prev,
      width: preset.width,
      height: preset.height
    }));
  };

  const resizeImage = useCallback(() => {
    if (!originalImage || !canvasRef.current) return;

    setIsProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = options.width;
    canvas.height = options.height;

    // 고품질 리샘플링을 위한 설정
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 이미지 그리기
    ctx.drawImage(originalImage, 0, 0, options.width, options.height);

    // 포맷에 따른 출력
    const mimeType = `image/${options.format}`;
    const quality = options.format === 'png' ? undefined : options.quality;
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setResizedImageUrl(url);
      }
      setIsProcessing(false);
    }, mimeType, quality);
  }, [originalImage, options]);

  const downloadImage = () => {
    if (!resizedImageUrl) return;

    const link = document.createElement('a');
    link.href = resizedImageUrl;
    link.download = `resized_${fileName.replace(/\.[^/.]+$/, '')}.${options.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetImage = () => {
    setOriginalImage(null);
    setOriginalDimensions(null);
    setResizedImageUrl(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateEstimatedSize = () => {
    if (!originalDimensions) return 0;
    
    // 추정 파일 크기 계산 (매우 대략적)
    const pixels = options.width * options.height;
    let bytesPerPixel = 3; // RGB
    
    if (options.format === 'png') {
      bytesPerPixel = 4; // RGBA
    } else if (options.format === 'jpeg') {
      bytesPerPixel = 3 * options.quality;
    } else if (options.format === 'webp') {
      bytesPerPixel = 2.5 * options.quality;
    }
    
    return pixels * bytesPerPixel;
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              이미지 리사이저
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              브라우저에서 바로 이미지 크기를 조정하고 다운로드하세요.
            </p>
          </div>
          {!isFullscreen && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="전체화면"
            >
              <Maximize className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
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
                      className="w-full h-48 object-contain bg-gray-100 dark:bg-gray-700 rounded-lg"
                    />
                    <button
                      onClick={resetImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">원본 정보</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      <p>파일명: {fileName}</p>
                      <p>크기: {originalDimensions?.width} × {originalDimensions?.height}px</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Presets */}
            {originalImage && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  <Settings className="w-5 h-5 inline mr-2" />
                  사전 설정
                </h3>
                <div className="space-y-2">
                  {presetSizes.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => handlePresetSelect(preset)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {preset.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {preset.width} × {preset.height}px
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="lg:col-span-1">
            {originalImage && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  리사이즈 설정
                </h2>

                <div className="space-y-6">
                  {/* Dimensions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      크기 설정
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">폭 (px)</label>
                        <input
                          type="number"
                          value={options.width}
                          onChange={(e) => updateDimensions(parseInt(e.target.value) || 0, options.height)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">높이 (px)</label>
                        <input
                          type="number"
                          value={options.height}
                          onChange={(e) => updateDimensions(options.width, parseInt(e.target.value) || 0)}
                          disabled={options.maintainAspectRatio}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
                        />
                      </div>
                    </div>
                    
                    <label className="flex items-center mt-3">
                      <input
                        type="checkbox"
                        checked={options.maintainAspectRatio}
                        onChange={(e) => setOptions(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">비율 유지</span>
                    </label>
                  </div>

                  {/* Format */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      출력 형식
                    </label>
                    <select
                      value={options.format}
                      onChange={(e) => setOptions(prev => ({ ...prev, format: e.target.value as 'jpeg' | 'png' | 'webp' }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="jpeg">JPEG</option>
                      <option value="png">PNG</option>
                      <option value="webp">WebP</option>
                    </select>
                  </div>

                  {/* Quality */}
                  {options.format !== 'png' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        품질: {Math.round(options.quality * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={options.quality}
                        onChange={(e) => setOptions(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-blue-800 dark:text-blue-300 font-medium mb-1">예상 결과</p>
                        <p className="text-blue-700 dark:text-blue-300">
                          크기: {options.width} × {options.height}px<br />
                          예상 용량: {formatFileSize(calculateEstimatedSize())}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Process Button */}
                  <button
                    onClick={resizeImage}
                    disabled={isProcessing}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>처리 중...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        <span>리사이즈 실행</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Result Section */}
          <div className="lg:col-span-1">
            {resizedImageUrl && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  결과 미리보기
                </h2>

                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={resizedImageUrl}
                      alt="Resized"
                      className="w-full h-48 object-contain bg-gray-100 dark:bg-gray-700 rounded-lg"
                    />
                  </div>

                  <button
                    onClick={downloadImage}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>다운로드</span>
                  </button>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">결과 정보</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      <p>크기: {options.width} × {options.height}px</p>
                      <p>형식: {options.format.toUpperCase()}</p>
                      {options.format !== 'png' && <p>품질: {Math.round(options.quality * 100)}%</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">이미지 리사이저 사용법</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">✅ 주요 기능</h3>
              <ul className="text-green-800 dark:text-green-300 text-sm space-y-1">
                <li>• 브라우저에서 직접 처리 (서버 업로드 없음)</li>
                <li>• JPG, PNG, WebP 형식 지원</li>
                <li>• 비율 유지 옵션</li>
                <li>• 품질 조정 기능</li>
                <li>• 사전 설정된 크기 템플릿</li>
                <li>• 즉시 다운로드</li>
              </ul>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-6">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">💡 사용 팁</h3>
              <ul className="text-amber-800 dark:text-amber-300 text-sm space-y-1">
                <li>• 웹용 이미지는 JPEG 또는 WebP 추천</li>
                <li>• 투명 배경이 필요하면 PNG 사용</li>
                <li>• 품질 70-90%가 적절한 품질/용량 균형</li>
                <li>• 큰 이미지는 단계적으로 줄이는 것이 좋음</li>
                <li>• 모바일용은 2배 해상도로 준비</li>
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

export default ImageResizer;