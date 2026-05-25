"use client";

import { useState } from "react";
import ScanUploader from "./ScanUploader";
import StoryNarrator from "./StoryNarrator";

export default function TouristGuide() {
  const [landmark, setLandmark] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-10">
      <ScanUploader
        onDetect={(landmark) => {
          setLandmark(landmark);
        }}
      />

      {landmark && (
        <div className="text-center text-amber-800 font-medium">
          📍 Landmark detected: <strong>{landmark}</strong>
        </div>
      )}

      <StoryNarrator landmark={landmark} />

      {/* Future: Map, Nearby Places, Recommendations, etc. */}
    </div>
  );
}
