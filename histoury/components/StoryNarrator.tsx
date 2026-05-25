"use client";

import { useRef, useState } from "react";
import { API_URL } from "@/app/utils/api";

const languageMap: { [key: string]: string } = {
  english: "en",
  hindi: "hi",
  kannada: "kn",
  tamil: "ta",
  telugu: "te",
};

export default function StoryNarrator({
  landmark,
}: {
  landmark: string | null;
}) {
  const [story, setStory] = useState("Here’s your AI-generated story...");
  const [language, setLanguage] = useState("english");
  const [loading, setLoading] = useState(false);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!landmark) {
      alert("No landmark detected yet.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("landmark", landmark);
    formData.append("language", languageMap[language]);

    try {
      const res = await fetch(`${API_URL}/generate_summary/`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      setStory(data.summary || "No summary returned.");
      setAudioPath(data.audio_file || null);
    } catch (err) {
      console.error(err);
      setStory("Failed to fetch summary.");
    } finally {
      setLoading(false);
    }
  };

  const handlePause = () => {
    audioRef.current?.pause();
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <div className="mt-6 bg-white border border-amber-300 p-6 rounded-2xl shadow-lg text-amber-900 space-y-6 w-full max-w-3xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-center text-amber-800">
        📖 AI-Generated Story
      </h2>

      <textarea
        value={story}
        onChange={(e) => setStory(e.target.value)}
        placeholder="The story will appear here..."
        className="w-full h-44 sm:h-52 resize-none p-4 text-base rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50 text-amber-900"
      />

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 rounded-xl border border-amber-300 bg-white text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {Object.keys(languageMap).map((lang) => (
            <option key={lang} value={lang}>
              {lang[0].toUpperCase() + lang.slice(1)}
            </option>
          ))}
        </select>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2 rounded-xl transition-all duration-200"
          >
            ✍️ {loading ? "Generating..." : "Generate Story"}
          </button>
        </div>
      </div>

      {audioPath && (
        <div className="mt-6 text-center space-y-4">
          <audio
            ref={audioRef}
            controls
            src={`${API_URL}/download_audio/${encodeURIComponent(
              audioPath
            )}`}
            className="w-full max-w-md mx-auto"
          />

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => audioRef.current?.play()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl"
            >
              ▶️ Play
            </button>
            <button
              onClick={handlePause}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-4 py-2 rounded-xl"
            >
              ⏸️ Pause
            </button>
            <button
              onClick={handleStop}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl"
            >
              ⏹️ Stop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
