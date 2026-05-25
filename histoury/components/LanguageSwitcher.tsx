"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: {
      translate: {
        TranslateElement: {
          new (
            options: {
              pageLanguage: string;
              includedLanguages: string;
              layout: unknown;
              autoDisplay: boolean;
            },
            elementId: string
          ): unknown;
          InlineLayout: {
            SIMPLE: unknown;
          };
        };
      };
    };
  }
}

const LanguageSwitcher: React.FC = () => {
  useEffect(() => {
    const addTranslateScript = () => {
      if (document.getElementById("google-translate-script")) return;

      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);

      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,hi,ta,te,kn",
            layout:
              window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          "google_translate_element"
        );
      };
    };

    addTranslateScript();

    // Add custom styling for the Google Translate widget
    const addCustomStyles = () => {
      const style = document.createElement("style");
      style.textContent = `
        /* Fix for Google Translate dropdown */
        .goog-te-menu-value {
          color: #78350f !important; /* amber-900 */
          font-weight: 500;
          display: flex;
          align-items: center;
        }
        
        .goog-te-gadget {
          color: transparent !important;
          font-size: 0px !important;
        }
        
        .goog-te-gadget .goog-te-combo {
          color: #78350f;
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 0.25rem;
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
          line-height: 1.25rem;
          max-width: 120px;
        }
        
        @media (max-width: 768px) {
          #google_translate_element {
            margin-top: 0.5rem;
          }
          
          .goog-te-gadget .goog-te-combo {
            width: 100%;
            max-width: none;
          }
        }
      `;
      document.head.appendChild(style);
    };

    addCustomStyles();

    return () => {
      // Clean up added styles if component unmounts
      const customStyle = document.querySelector("style");
      if (customStyle) {
        customStyle.remove();
      }
    };
  }, []);

  return (
    <div
      id="google_translate_element"
      className="text-sm focus:outline-none"
      aria-label="Language Selector"
    />
  );
};

export default LanguageSwitcher;
