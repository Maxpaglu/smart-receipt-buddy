import { useCallback, useRef, useState } from "react";
import { Upload, Camera, Image as ImageIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReceiptUploaderProps {
  onImageReady: (base64: string, mimeType: string, previewUrl: string) => void;
  isProcessing: boolean;
}

export function ReceiptUploader({ onImageReady, isProcessing }: ReceiptUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
        alert("Please upload a JPG, PNG, or WebP image.");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        alert("File too large. Max 15MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        setPreview(dataUrl);
        onImageReady(base64, file.type, dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [onImageReady],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      alert("Camera access denied or not available.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = dataUrl.split(",")[1];
    setPreview(dataUrl);
    stopCamera();
    onImageReady(base64, "image/jpeg", dataUrl);
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraActive(false);
  };

  const clearPreview = () => {
    setPreview(null);
    stopCamera();
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {cameraActive ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative overflow-hidden rounded-xl border border-border"
          >
            <video ref={videoRef} className="w-full rounded-xl" autoPlay playsInline muted />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
              <button
                onClick={capturePhoto}
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
              >
                Capture
              </button>
              <button
                onClick={stopCamera}
                className="rounded-full bg-secondary px-6 py-2.5 text-sm font-medium text-secondary-foreground"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative overflow-hidden rounded-xl border border-border"
          >
            <img src={preview} alt="Receipt preview" className="max-h-80 w-full rounded-xl object-contain bg-secondary/50" />
            {!isProcessing && (
              <button
                onClick={clearPreview}
                className="absolute right-3 top-3 rounded-full bg-background/80 p-1.5 backdrop-blur-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="relative h-full w-full overflow-hidden">
                  <div className="scanline absolute inset-0" />
                </div>
                <p className="absolute text-sm font-medium text-primary">Scanning receipt...</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-all ${
              dragActive ? "border-primary bg-primary/5 pulse-border" : "border-border hover:border-muted-foreground"
            }`}
          >
            <div className="rounded-full bg-secondary p-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drop your receipt image here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG, or WebP • Max 15MB
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = "";
        }}
      />

      {!preview && !cameraActive && (
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
          >
            <ImageIcon className="h-4 w-4" />
            Browse Files
          </button>
          <button
            onClick={startCamera}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
          >
            <Camera className="h-4 w-4" />
            Use Camera
          </button>
        </div>
      )}
    </div>
  );
}
