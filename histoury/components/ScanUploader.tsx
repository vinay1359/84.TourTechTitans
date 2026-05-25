"use client";

import { useRef, useState, DragEvent, ChangeEvent, useEffect } from "react";
import Image from "next/image";
import { API_URL } from "@/app/utils/api";

// Add Camera icon import
import { Camera } from "lucide-react";

export default function ScanUploader({
  onDetect,
}: {
  onDetect: (landmark: string, coords: { lat: number; lng: number }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [landmark, setLandmark] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  // Clean up camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Handle video element when it's ready
  useEffect(() => {
    if (showCamera && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [showCamera, stream]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    uploadToBackend(file);
  };

  const uploadToBackend = async (file: File) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`${API_URL}/detect_landmark/`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      if (data.name && data.lat && data.lng) {
        setLandmark(data.name);
        const coordData = { lat: data.lat, lng: data.lng };
        setCoords(coordData);
        onDetect(data.name, coordData); // Pass to parent
      } else {
        setLandmark("Could not detect landmark");
        setCoords(null);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setLandmark("Error contacting backend");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const startCamera = async () => {
    setCameraLoading(true);

    try {
      // First set up UI state
      setShowCamera(true);

      // Then request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(mediaStream);

      // Directly set the stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current
          .play()
          .catch((err) => console.error("Error playing video:", err));
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert(
        "Could not access your camera. Please make sure you have granted camera permissions."
      );
      setShowCamera(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !stream) return;

    // Create a canvas to capture the image
    const canvas = document.createElement("canvas");
    const videoElement = videoRef.current;
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;

    canvas.width = width;
    canvas.height = height;

    // Draw the video frame to the canvas
    const context = canvas.getContext("2d");
    if (context) {
      context.drawImage(videoElement, 0, 0, width, height);

      // Convert to data URL and set as preview
      const imageDataUrl = canvas.toDataURL("image/jpeg");
      setPreviewUrl(imageDataUrl);

      // Convert data URL to File object
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "captured-image.jpg", {
            type: "image/jpeg",
          });
          // Upload the captured image to backend
          uploadToBackend(file);
        }
      }, "image/jpeg");

      // Stop the camera after capture
      stopCamera();
    }
  };

  const uploadImage = () => {
    if (previewUrl) {
      // Convert dataURL to a File for upload
      fetch(previewUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], "uploaded-image.jpg", {
            type: "image/jpeg",
          });
          uploadToBackend(file);
        })
        .catch((err) => {
          console.error("Error processing image:", err);
          alert("Error processing image. Please try again.");
        });
    }
  };

  const retakePhoto = () => {
    setPreviewUrl(null);
    startCamera();
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <div
        className={`border-4 border-dashed rounded-lg p-4 transition min-h-64 ${
          dragging ? "border-amber-700 bg-amber-100" : "border-amber-300"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {showCamera ? (
          <div className="relative w-full flex flex-col items-center">
            {cameraLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-70 z-10 rounded">
                <div className="text-amber-700 font-bold">
                  Accessing camera...
                </div>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover rounded"
            />
            <div className="mt-4 flex gap-4 justify-center">
              <button
                onClick={capturePhoto}
                className="bg-amber-700 hover:bg-amber-800 text-white font-bold py-2 px-4 rounded-full transition duration-300"
              >
                Take Photo
              </button>
              <button
                onClick={stopCamera}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full transition duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : previewUrl ? (
          <div className="relative flex flex-col items-center">
            <div className="relative">
              <Image
                src={previewUrl}
                alt="Captured photo"
                width={400}
                height={300}
                className="mx-auto rounded h-64 object-contain"
              />
            </div>
            <div className="mt-4 flex gap-4">
              <button
                onClick={uploadImage}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full transition duration-300"
              >
                Upload Photo
              </button>
              <button
                onClick={retakePhoto}
                className="bg-amber-700 hover:bg-amber-800 text-white font-bold py-2 px-4 rounded-full transition duration-300"
              >
                Retake Photo
              </button>
              <button
                onClick={() => setPreviewUrl(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full transition duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-amber-700 py-12">
            <p className="mb-4 font-medium">
              Drag and drop an image here, or click below to upload
            </p>
            <button
              onClick={triggerFileInput}
              className="bg-amber-700 hover:bg-amber-800 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
            >
              Upload Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleChange}
              className="hidden"
              aria-label="Upload image"
              title="Choose a file to upload"
            />
          </div>
        )}
      </div>

      {loading && (
        <p className="text-center mt-4 text-amber-600">
          🔍 Detecting landmark...
        </p>
      )}

      {landmark && (
        <div className="mt-6 bg-amber-50 p-4 rounded-lg shadow">
          <h3 className="font-semibold text-lg">📍 Detected Landmark:</h3>
          <p className="text-amber-800">{landmark}</p>
          {coords && (
            <p className="text-sm text-amber-600">
              Latitude: {coords.lat}, Longitude: {coords.lng}
            </p>
          )}
        </div>
      )}

      {/* Camera Button - Only show when not already using camera */}
      {!showCamera && !previewUrl && (
        <div className="mt-6 text-center">
          <button
            onClick={startCamera}
            className="flex items-center gap-2 mx-auto text-amber-700 hover:text-amber-900 underline"
          >
            <Camera size={18} />
            Or click a photo using your camera
          </button>
        </div>
      )}
    </div>
  );
}
