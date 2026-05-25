"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const ScanUploader = dynamic(() => import("@/components/ScanUploader"), {
  ssr: false,
});
import StoryNarrator from "@/components/StoryNarrator";

export default function ScanPage() {
  const [landmark, setLandmark] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-amber-50 py-16 px-4 space-y-10">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-amber-900 mb-4">
          Scan a Monument
        </h1>
        <p className="text-amber-800 mb-8">
          Upload or click a photo of a historical landmark to discover its
          story.
        </p>
      </div>

      <ScanUploader
        onDetect={(name) => {
          setLandmark(name);
        }}
      />

      {landmark && <StoryNarrator landmark={landmark} />}
    </div>
  );
}
