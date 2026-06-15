"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Camera, X } from "lucide-react";
import Image from "next/image";

interface PhotoUploaderProps {
  onPhotoSelect: (file: File) => void;
  selectedPhoto?: File | null;
}

export default function PhotoUploader({ onPhotoSelect, selectedPhoto }: PhotoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onPhotoSelect(file);
    },
    [onPhotoSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const clearPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onPhotoSelect(null as unknown as File);
  };

  return (
    <div className="w-full">
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-gray-100">
          <Image src={preview} alt="Your photo" fill className="object-cover" />
          <button
            onClick={clearPhoto}
            className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all aspect-[3/4] flex flex-col items-center justify-center ${
            isDragActive
              ? "border-purple-400 bg-purple-50"
              : "border-gray-300 hover:border-purple-300 hover:bg-purple-50/50"
          }`}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            {isDragActive ? (
              <Upload className="w-7 h-7 text-purple-600" />
            ) : (
              <Camera className="w-7 h-7 text-purple-600" />
            )}
          </div>
          <p className="font-medium text-gray-900 mb-1">
            {isDragActive ? "Drop your photo here" : "Upload your photo"}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            JPG, PNG or WEBP · Max 10MB
          </p>
          <p className="text-xs text-gray-400">
            For best results, use a full-body photo with good lighting
          </p>
        </div>
      )}
    </div>
  );
}
