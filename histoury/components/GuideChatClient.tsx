"use client";

import { useState } from "react";
import { Mic, Globe, Send, X } from "lucide-react";

type Language = "en" | "hi" | "kn" | "ta" | "te";

interface ChatEntry {
  query: string;
  response: string;
  audioUrl: string;
}

interface SpeechRecognitionResultEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

const languageMap: Record<Language, string> = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada",
  ta: "Tamil",
  te: "Telugu",
};

export default function GuideChatClient() {
  const [query, setQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en");
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🎤 Handle speech-to-text
  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as SpeechRecognitionWindow).SpeechRecognition ||
      (window as SpeechRecognitionWindow).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = `${selectedLanguage}-IN`;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (e) => {
      const spoken = e.results[0][0].transcript;
      setQuery(spoken);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  // 🧠 Ask backend and update chat history
  const handleSend = async () => {
    if (!query.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query, language: selectedLanguage }),
      });

      const data = await res.json();
      const newEntry: ChatEntry = {
        query,
        response: data.result || data.text || "No response returned.",
        audioUrl: data.audio_url || "",
      };
      setChatHistory((prev) => [...prev, newEntry]);
      setQuery("");
    } catch (err) {
      console.error("Ask error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl p-6 space-y-6">
      {/* 🌐 Language selector */}
      <div className="flex justify-end">
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-orange-500" />
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value as Language)}
            className="pl-2 pr-4 py-1 rounded-lg border border-orange-300 text-gray-700 text-sm focus:ring-2 focus:ring-orange-400"
          >
            {Object.entries(languageMap).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 📝 Text input */}
      <textarea
        className="w-full p-4 rounded-xl border text-black border-orange-300 focus:ring-2 focus:ring-orange-400"
        rows={3}
        placeholder="Ask about a monument, culture, or place..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* 🎤 & ✉️ & ❌ buttons */}
      <div className="flex flex-wrap justify-between gap-4">
        <button
          onClick={handleSend}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
        >
          {loading ? "Thinking..." : "Ask"}
          <Send className="w-4 h-4" />
        </button>

        <button
          onClick={handleVoiceInput}
          disabled={isListening}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white ${
            isListening ? "bg-red-500" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isListening ? "Listening..." : "Speak"}
          <Mic className="w-4 h-4" />
        </button>

        {/* 🧼 Clear text box button */}
        <button
          onClick={() => setQuery("")}
          className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-xl"
        >
          Clear
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 💬 Chat history */}
      <div className="mt-4 space-y-4">
        {chatHistory.map((entry, idx) => (
          <div
            key={idx}
            className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
          >
            <p className="text-orange-700 font-semibold mb-1">
              You: {entry.query}
            </p>
            <p className="text-gray-800 mb-2">🧭 Guide: {entry.response}</p>

            {entry.audioUrl && (
              <audio controls className="w-full mt-2">
                <source
                  src={entry.audioUrl}
                  type="audio/mpeg"
                />
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        ))}
      </div>

      {/* 🧹 Clear chat button */}
      {chatHistory.length > 0 && (
        <div className="text-center mt-4">
          <button
            onClick={() => setChatHistory([])}
            className="text-sm text-orange-600 underline hover:text-orange-800"
          >
            🧹 Clear This Conversation
          </button>
        </div>
      )}
    </div>
  );
}
