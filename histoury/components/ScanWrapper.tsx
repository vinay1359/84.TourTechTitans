"use client";

import dynamic from "next/dynamic";

// Dynamic import of the client-only ScanUploader
const ScanUploader = dynamic(() => import("./ScanUploader"), {
  ssr: false,
});

export default function ScanWrapper() {
  return <ScanUploader onDetect={() => {}} />;
}
