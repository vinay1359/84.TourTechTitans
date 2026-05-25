"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL, createTrip } from "@/app/utils/api";
import {
  DayPicker,
  SelectRangeEventHandler,
  DateRange,
} from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";

// Custom CSS for date picker
function AddTripPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract data from URL params
  const placeName = searchParams.get("name") || "";
  const lat = searchParams.get("lat") || "";
  const lng = searchParams.get("lng") || "";

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: undefined,
  });
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");

  // Check if backend is reachable
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_URL}/`, {
          credentials: "include",
        });
        setBackendStatus(response.ok ? "online" : "offline");
      } catch (err) {
        console.error("Backend check failed:", err);
        setBackendStatus("offline");
      }
    };

    checkBackend();
  }, []);

  // Update the custom CSS for the date picker with the provided styles
  useEffect(() => {
    // Add custom CSS to override the day picker styles
    const style = document.createElement("style");
    style.innerHTML = `
      /* Base date picker styling */
      .rdp-root {
        --rdp-day-height: 36px !important;
        --rdp-day-width: 36px !important;
        --rdp-accent-color: #d97706 !important;
        --rdp-accent-background-color: #b45309 !important;
        margin: 0 !important;
        font-family: inherit !important;
      }
      
      /* Month container styling for side-by-side display */
      .rdp-months {
        display: flex !important;
        justify-content: center !important;
        flex-direction: row !important; 
        gap: 1.5rem !important;
      }
      
      /* Wrapper styling */
      .rdp {
        margin: 0 !important;
        padding: 0.75rem !important;
        border-radius: 12px !important;
        background: #fffbeb !important;
      }
      
      /* Month styling */
      .rdp-month {
        background-color: white !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        padding: 16px !important;
        border: 1px solid #fef3c7 !important;
      }
      
      /* Caption styling */
      .rdp-caption {
        padding: 0 0 12px 0 !important;
        border-bottom: 1px solid #fef3c7 !important;
        margin-bottom: 8px !important;
      }
      
      /* Month dropdown styling */
      .rdp-dropdown {
        color: #64748b !important;
        font-weight: 600 !important;
        padding: 4px 8px !important;
        border-radius: 6px !important;
        border: 1px solid #f1f5f9 !important;
        background-color: white !important;
      }
      
      .rdp-dropdown option:disabled {
        color: #cbd5e1 !important;
      }
      
      /* Selected day styling */
      .rdp-day_selected { 
        background-color: #d97706 !important; 
        color: white !important;
        font-weight: bold !important;
        border-radius: 6px !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
        transform: scale(1.05) !important;
        transition: transform 0.2s ease !important;
      }
      
      .rdp-day_selected:hover { 
        background-color: #b45309 !important; 
        color: white !important;
      }
      
      /* Range styling */
      .rdp-day_range_middle {
        background-color: #fbbf24 !important;
        color: #78350f !important;
        border-radius: 0 !important;
      }
      
      .rdp-day_range_start { 
        background-color: #d97706 !important; 
        color: white !important;
        font-weight: bold !important;
        border-top-left-radius: 6px !important;
        border-bottom-left-radius: 6px !important;
        border-top-right-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
      }
      
      .rdp-day_range_end {
        background-color: #d97706 !important; 
        color: white !important;
        font-weight: bold !important;
        border-top-right-radius: 6px !important;
        border-bottom-right-radius: 6px !important;
        border-top-left-radius: 0 !important;
        border-bottom-left-radius: 0 !important;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
      }
      
      /* Start and end are the same day */
      .rdp-day_range_start.rdp-day_range_end {
        border-radius: 6px !important;
      }
      
      /* Today styling */
      .rdp-day_today { 
        color: #d97706 !important; 
        font-weight: bold !important;
        border: 2px solid #d97706 !important;
        border-radius: 6px !important;
      }
      
      /* Hover effects */
      .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
        background-color: #fef3c7 !important;
        color: #92400e !important;
        transform: scale(1.05) !important;
        transition: transform 0.2s ease !important;
      }
      
      /* Month caption */
      .rdp-caption_label {
        font-size: 1.1rem !important;
        font-weight: 600 !important;
        color: #78350f !important;
        text-transform: capitalize !important;
      }
      
      /* Navigation buttons */
      .rdp-nav_button {
        color: #d97706 !important;
        border-radius: 6px !important;
        padding: 4px !important;
        background-color: #fef3c7 !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
      }
      
      .rdp-nav_button:hover {
        background-color: #fde68a !important;
        transform: translateY(-1px) !important;
        transition: all 0.2s ease !important;
      }
      
      /* Weekday headers */
      .rdp-head_cell {
        color: #92400e !important;
        font-weight: 600 !important;
        font-size: 0.9rem !important;
        padding-bottom: 12px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
      }
      
      /* Day cells */
      .rdp-day {
        color: #475569 !important;
        font-weight: 500 !important;
        border-radius: 6px !important;
        margin: 2px !important;
        transition: transform 0.2s ease !important;
      }
      
      /* Disabled days */
      .rdp-day_disabled {
        color: #cbd5e1 !important;
      }
      
      /* Table cells */
      .rdp-tbody {
        border-collapse: separate !important;
        border-spacing: 1px !important;
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        .rdp-months {
          flex-direction: column !important;
          gap: 1rem !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Clean up the style element when component unmounts
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleRangeSelect: SelectRangeEventHandler = (range) => {
    setDateRange(range);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (backendStatus === "offline") {
      setError(
        "Cannot connect to server. Please make sure the backend is running."
      );
      return;
    }

    if (!dateRange?.from) {
      setError("Please select a start date for your trip");
      return;
    }

    if (!description.trim()) {
      setError("Please add some notes about your trip");
      return;
    }

    try {
      setIsLoading(true);

      const tripData = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        description,
        start_date: dateRange.from.toISOString(),
        end_date: dateRange.to
          ? dateRange.to.toISOString()
          : dateRange.from.toISOString(),
        place_name: placeName,
      };

      await createTrip(tripData);
      setSuccess(true);

      // Redirect after successful creation to journey page
      setTimeout(() => {
        router.push("/my-journey/plan");
      }, 2000);
    } catch (err) {
      console.error("Error creating trip:", err);

      // Check if error is authentication related
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      if (
        errorMessage.includes("authentication") ||
        errorMessage.includes("token")
      ) {
        setError(
          "You must be logged in to add trips. Please log in and try again."
        );
      } else if (errorMessage.includes("connect")) {
        setError(
          "Cannot connect to server. Please make sure the backend is running."
        );
      } else {
        setError(`Failed to create trip: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!placeName || !lat || !lng) {
    return (
      <div className="min-h-screen bg-amber-50 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-amber-900 mb-4">
            Invalid Place Information
          </h1>
          <p className="text-gray-700 mb-4">
            Sorry, the place information is missing or incomplete. Please try
            again.
          </p>
          <button
            onClick={() => router.back()}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-amber-900 mb-2">
          Plan Your Trip
        </h1>
        <h2 className="text-xl text-amber-800 mb-6">to {placeName}</h2>

        {success ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-center">
            <h3 className="text-xl font-bold mb-2">Thank you!</h3>
            <p>Your trip has been successfully added to your journey plan.</p>
            <p className="text-sm mt-2">Redirecting to your journey page...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">
                Select Trip Dates
              </label>
              <div className="rounded-xl p-3 bg-amber-50 shadow-md border border-amber-100">
                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={handleRangeSelect}
                  numberOfMonths={2}
                  defaultMonth={new Date()}
                  className="mx-auto"
                  showOutsideDays
                  fixedWeeks
                  modifiersClassNames={{
                    selected: "rdp-day_selected",
                    today: "rdp-day_today",
                    range_start: "rdp-day_range_start",
                    range_middle: "rdp-day_range_middle",
                    range_end: "rdp-day_range_end",
                  }}
                />
              </div>
              <p className="text-sm text-amber-700 mt-3 font-medium">
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      <span className="font-bold text-amber-800">
                        Selected:
                      </span>{" "}
                      {format(dateRange.from, "PPP")} to{" "}
                      {format(dateRange.to, "PPP")}
                      <span className="ml-1 bg-amber-100 px-2 py-0.5 rounded-full text-amber-800">
                        {Math.ceil(
                          (dateRange.to.getTime() - dateRange.from.getTime()) /
                            (1000 * 60 * 60 * 24)
                        ) + 1}{" "}
                        days
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-amber-800">
                        Selected:
                      </span>{" "}
                      {format(dateRange.from, "PPP")}{" "}
                      <span className="ml-1 bg-amber-100 px-2 py-0.5 rounded-full text-amber-800">
                        1 day
                      </span>
                    </>
                  )
                ) : (
                  "Please select the date range for your trip"
                )}
              </p>
            </div>

            <div className="mb-8">
              <label className="block text-amber-800 font-medium mb-2 text-lg">
                Trip Notes
              </label>
              <div className="relative">
                <textarea
                  className="w-full p-4 border border-amber-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-700 placeholder-gray-400 transition-all duration-200 hover:border-amber-300 focus:shadow-md outline-none min-h-[150px]"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add your notes, plans, or any details about this trip..."
                  required
                />
                <div className="absolute inset-0 pointer-events-none rounded-xl border-2 border-transparent focus-within:border-amber-500 transition-all duration-200"></div>
              </div>
              <p className="mt-2 text-amber-600 text-sm italic">
                Share your thoughts, planned activities, or any special details
                about your journey.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-xl border border-gray-200 shadow-sm hover:shadow transition-all duration-200 flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-8 rounded-xl shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:shadow-none transition-all duration-200 flex items-center"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Adding to Plan...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Add to My Journey
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AddTripPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-amber-50" />}>
      <AddTripPageContent />
    </Suspense>
  );
}
