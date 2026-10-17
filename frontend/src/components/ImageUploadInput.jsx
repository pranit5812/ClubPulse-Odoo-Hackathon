import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  X,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  RefreshCw,
  Eye
} from 'lucide-react';

export const ImageUploadInput = ({
  value = '',
  onChange,
  error = null,
  label = 'Event Banner Image',
  required = false
}) => {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState(
    value && !value.startsWith('data:image/') ? 'url' : 'file'
  );
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Format bytes to KB or MB
  const formatBytes = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Compress & resize image if needed to optimize storage
  const processImageFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLocalError('Please select a valid image file (PNG, JPG, WEBP, GIF, or SVG).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setLocalError('Image file is too large. Maximum supported size is 10MB.');
      return;
    }

    setLocalError(null);
    setProcessing(true);
    setFileName(file.name);
    setFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;

      // If file is SVG or under 1MB, use directly
      if (file.type.includes('svg') || file.size < 1024 * 1024) {
        onChange(dataUrl);
        setProcessing(false);
        return;
      }

      // Downscale high-resolution camera photos (e.g. 4000x3000) for performance
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1600;
        const maxHeight = 900;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onChange(optimizedDataUrl);
        } else {
          onChange(dataUrl);
        }
        setProcessing(false);
      };
      img.onerror = () => {
        onChange(dataUrl);
        setProcessing(false);
      };
      img.src = dataUrl;
    };

    reader.onerror = () => {
      setLocalError('Failed to read image file from device.');
      setProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleClearImage = () => {
    onChange('');
    setFileName('');
    setFileSize(null);
    setLocalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayError = localError || error;

  return (
    <div className="space-y-2">
      {/* Label and Source Mode Toggle */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-[#171A2B]">
          {label} {required && <span className="text-[#D9485F]">*</span>}{' '}
          <span className="text-[#687086] font-normal">
            ({activeTab === 'file' ? 'Upload from device' : 'Web URL link'})
          </span>
        </label>

        {/* Tab Toggle */}
        <div className="flex items-center bg-[#F7F8FC] border border-[#E7E9F1] rounded-lg p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'file'
                ? 'bg-white text-[#625BF6] shadow-2xs font-bold'
                : 'text-[#687086] hover:text-[#171A2B]'
            }`}
          >
            <FolderOpen className="w-3 h-3" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'url'
                ? 'bg-white text-[#625BF6] shadow-2xs font-bold'
                : 'text-[#687086] hover:text-[#171A2B]'
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>URL Link</span>
          </button>
        </div>
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* TAB 1: UPLOAD FROM DEVICE */}
      {activeTab === 'file' && (
        <div className="space-y-3">
          {!value ? (
            /* Drag and Drop / Click to Upload Box */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#625BF6] bg-[#625BF6]/5'
                  : 'border-[#E7E9F1] hover:border-[#625BF6]/50 bg-[#F7F8FC]/60 hover:bg-[#EEEDFE]/30'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-[#EEEDFE] text-[#625BF6] flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-[#171A2B]">
                Click to browse files from your device
              </div>
              <p className="text-[11px] text-[#687086] mt-0.5">
                or drag and drop your event banner image here
              </p>

              {/* Prominent File Browser Button */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-white hover:bg-[#F7F8FC] text-[#625BF6] border border-[#D4D1FD] rounded-xl text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Choose Image File...</span>
                </button>
              </div>

              <div className="text-[10px] text-[#8B93A7] mt-3">
                Supported formats: PNG, JPG, JPEG, WEBP, SVG • Max 10MB
              </div>
            </div>
          ) : (
            /* Selected File Preview Box */
            <div className="rounded-2xl border border-[#E7E9F1] bg-white p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-8 h-8 rounded-lg bg-[#16856B]/10 text-[#16856B] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-[#171A2B] truncate">
                      {fileName || 'Uploaded Image File'}
                    </div>
                    {fileSize && (
                      <div className="text-[10px] text-[#687086]">
                        Size: {formatBytes(fileSize)} • Ready to save
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-[#F7F8FC] hover:bg-[#EEEDFE] text-[#625BF6] rounded-lg text-xs font-semibold flex items-center gap-1 border border-[#E7E9F1] transition-colors"
                    title="Choose a different image from device"
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="p-1.5 text-[#687086] hover:text-[#D9485F] hover:bg-[#D9485F]/10 rounded-lg transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview Thumbnail */}
              <div className="h-36 sm:h-44 w-full rounded-xl overflow-hidden border border-[#E7E9F1] relative bg-[#17182B]">
                <img
                  src={value}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ENTER URL LINK */}
      {activeTab === 'url' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <LinkIcon className="w-4 h-4 text-[#687086] absolute left-3 top-2.5" />
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={value.startsWith('data:image/') ? '' : value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-[#E7E9F1] bg-white focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
              />
            </div>
            {value && !value.startsWith('data:image/') && (
              <button
                type="button"
                onClick={handleClearImage}
                className="p-2.5 text-[#687086] hover:text-[#D9485F] hover:bg-[#D9485F]/10 rounded-xl transition-colors border border-[#E7E9F1]"
                title="Clear URL"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Browser Button in URL mode too */}
          <div className="flex items-center justify-between text-[11px] text-[#687086]">
            <span>Or choose an image directly from your computer:</span>
            <button
              type="button"
              onClick={() => {
                setActiveTab('file');
                setTimeout(() => fileInputRef.current?.click(), 50);
              }}
              className="text-[#625BF6] hover:underline font-semibold flex items-center gap-1"
            >
              <FolderOpen className="w-3 h-3" />
              <span>Browse Device</span>
            </button>
          </div>

          {/* Live Preview for URL */}
          {value && !value.startsWith('data:image/') && (
            <div className="h-36 sm:h-44 w-full rounded-xl overflow-hidden border border-[#E7E9F1] relative bg-[#17182B]">
              <img
                src={value}
                alt="Banner preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>Web URL Preview</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {displayError && (
        <div className="flex items-center gap-1 text-[11px] text-[#D9485F] mt-1 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploadInput;
