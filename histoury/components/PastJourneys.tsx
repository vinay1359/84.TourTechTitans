"use client";

import { useState, useEffect } from "react";
import { getUserJourneysHistory } from "@/app/utils/api";
import { Calendar, Layers } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import dynamic from "next/dynamic";

// Dynamically import the map components with no SSR
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});
const ZoomControl = dynamic(
  () => import("react-leaflet").then((mod) => mod.ZoomControl),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);
import { useMap } from "react-leaflet";

interface Journey {
  journey_id: string;
  place_name: string;
  start_date: string;
  end_date: string;
  description: string;
  lat: number;
  lng: number;
}

// Component to fit map bounds to all markers
function FitBoundsToMarkers({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      try {
        // Create bounds from all marker positions
        const L = window.L;
        let bounds;

        if (positions.length === 1) {
          // For a single marker, center on it with a reasonable zoom
          map.setView(positions[0], 10, { animate: true });
          return;
        } else {
          // For multiple markers, fit bounds with padding
          bounds = L.latLngBounds(positions);

          // Add 15% padding around the bounds for better visual
          map.fitBounds(bounds, {
            padding: [60, 60],
            maxZoom: 12, // Don't zoom in too far
            animate: true,
          });
        }
      } catch (error) {
        console.error("Error fitting map to bounds:", error);
        // Fallback to a reasonable default view
        map.setView([30, 0], 2);
      }
    }
  }, [map, positions]);

  return null;
}

// Active journey indicator component
function ActiveJourneyHighlight({
  activeId,
  journeys,
}: {
  activeId: string | null;
  journeys: Journey[];
}) {
  const map = useMap();

  useEffect(() => {
    if (activeId) {
      const journey = journeys.find((j) => j.journey_id === activeId);
      if (journey) {
        map.setView([journey.lat, journey.lng], 10, {
          animate: true,
          duration: 1.2,
          easeLinearity: 0.25,
        });
      }
    }
  }, [activeId, journeys, map]);

  return null;
}

export default function PastJourneys() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<
    "standard" | "satellite" | "terrain"
  >("standard");
  const [activeJourney, setActiveJourney] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    async function fetchJourneys() {
      try {
        setLoading(true);
        const loadingToast = toast.loading("Loading your journey history...");
        const journeysData = await getUserJourneysHistory();

        // Ensure we have an array and sort by date
        const journeyArray = Array.isArray(journeysData) ? journeysData : [];
        setJourneys(journeyArray);

        toast.dismiss(loadingToast);
        if (journeyArray.length > 0) {
          toast.success(
            `Loaded ${journeyArray.length} past ${
              journeyArray.length === 1 ? "journey" : "journeys"
            }`
          );
        }
      } catch (err) {
        console.error("Error fetching journeys:", err);
        setError("Failed to load your past journeys. Please try again.");
        toast.error("Failed to load your journey history. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchJourneys();
  }, []);

  // Set up Leaflet when component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      setMapReady(true);

      // Custom styled marker setup
      import("leaflet").then((L) => {
        delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })
          ._getIconUrl;

        // Create custom amber-colored marker icon that matches the site theme
        const customIcon = new L.Icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
          iconSize: [30, 45], // Make it slightly larger
          iconAnchor: [15, 45],
          popupAnchor: [1, -40],
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
          shadowSize: [41, 41],
          shadowAnchor: [13, 41],
        });

        // Set as default marker
        L.Marker.prototype.options.icon = customIcon;

        // Add custom styles to the map
        const style = document.createElement("style");
        style.textContent = `
          .leaflet-popup-content-wrapper {
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
          }
          .leaflet-popup-content {
            margin: 10px 12px;
            line-height: 1.5;
          }
          .leaflet-container {
            font-family: 'Inter', sans-serif;
          }
          .leaflet-popup-tip {
            box-shadow: 0 3px 6px rgba(0,0,0,0.1);
          }
          .leaflet-control-zoom {
            border: none !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important;
          }
          .leaflet-control-zoom a {
            background-color: white !important;
            color: #92400e !important;
          }
          .leaflet-control-zoom a:hover {
            background-color: #fef3c7 !important;
            color: #78350f !important;
          }
        `;
        document.head.appendChild(style);
      });
    }
  }, []);

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    if (!dateString) return "";

    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  // Change map style
  const cycleMapStyle = () => {
    if (mapStyle === "standard") setMapStyle("satellite");
    else if (mapStyle === "satellite") setMapStyle("terrain");
    else setMapStyle("standard");
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "newest" ? "oldest" : "newest");
  };

  // Get map tile URL based on selected style
  const getMapTileUrl = () => {
    switch (mapStyle) {
      case "satellite":
        return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      case "terrain":
        return "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
      default:
        return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    }
  };

  // Get map attribution based on selected style
  const getMapAttribution = () => {
    switch (mapStyle) {
      case "satellite":
        return '&copy; <a href="https://www.arcgis.com/">Esri</a>';
      case "terrain":
        return '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>';
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    }
  };

  // Helper to sort journeys by date
  const sortedJourneys = [...journeys].sort((a, b) => {
    const dateA = new Date(a.start_date).getTime();
    const dateB = new Date(b.start_date).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  // Get marker positions for the map
  const markerPositions: [number, number][] = journeys.map((journey) => [
    journey.lat,
    journey.lng,
  ]);

  // Create journey path coordinates in chronological order for polyline
  const journeyPath = [...journeys]
    .sort(
      (a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    )
    .map((journey) => [journey.lat, journey.lng] as [number, number]);

  if (loading) {
    return (
      <div className="p-6 w-full">
        <div className="animate-pulse flex flex-col">
          <div className="h-8 bg-amber-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-amber-100 rounded w-full mb-3"></div>
          <div className="h-16 bg-amber-100 rounded w-full mb-3"></div>
          <div className="h-16 bg-amber-100 rounded w-full mb-3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 w-full">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-md w-full">
      <Toaster position="top-center" />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-amber-900">Past Journeys</h2>

        <div className="flex space-x-2">
          {mapReady && journeys.length > 0 && (
            <>
              <button
                onClick={toggleSortOrder}
                className="flex items-center space-x-1 text-amber-700 bg-amber-100 hover:bg-amber-200 transition px-3 py-2 rounded-lg"
              >
                <Calendar size={16} />
                <span className="text-sm font-medium">
                  {sortOrder === "newest" ? "Newest First" : "Oldest First"}
                </span>
              </button>

              <button
                onClick={cycleMapStyle}
                className="flex items-center space-x-1 text-amber-700 bg-amber-100 hover:bg-amber-200 transition px-3 py-2 rounded-lg"
              >
                <Layers size={16} />
                <span className="text-sm font-medium capitalize">
                  {mapStyle} View
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {journeys.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-lg text-gray-600 mb-2">
            You haven&apos;t completed any journeys yet.
          </p>
          <p className="text-gray-500">
            Mark your planned trips as completed to see them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Container - Large unified map */}
          <div className="lg:col-span-2 bg-amber-50 rounded-lg overflow-hidden border border-amber-200 shadow-md h-[600px]">
            {mapReady && (
              <MapContainer
                center={[30, 0]} // Better initial center
                zoom={2}
                style={{ height: "100%", width: "100%" }}
                className="z-0"
                zoomControl={false}
                // Add some additional map options for better appearance
                attributionControl={false} // Hide attribution by default
                minZoom={2} // Prevent zooming out too far
                maxBoundsViscosity={1.0} // Prevent dragging outside bounds
                worldCopyJump={true} // Better handling of world wrapping
              >
                <TileLayer
                  attribution={getMapAttribution()}
                  url={getMapTileUrl()}
                />

                {/* Attribution in bottom right corner */}
                <div
                  className="leaflet-control leaflet-attribution-control"
                  style={{
                    position: "absolute",
                    zIndex: 1000,
                    bottom: "0",
                    right: "0",
                    fontSize: "10px",
                    backgroundColor: "rgba(255,255,255,0.7)",
                    padding: "0 5px",
                  }}
                >
                  {getMapAttribution()}
                </div>

                {/* Connect the journeys with a line */}
                {journeyPath.length > 1 && (
                  <Polyline
                    positions={journeyPath}
                    color="#b45309" // Amber 700 - deeper color for better visibility
                    weight={3.5}
                    opacity={0.85}
                    dashArray="6, 10"
                  />
                )}

                {/* Add markers for each journey */}
                {journeys.map((journey) => (
                  <Marker
                    key={journey.journey_id}
                    position={[journey.lat, journey.lng]}
                    eventHandlers={{
                      click: () => setActiveJourney(journey.journey_id),
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1">
                        <h3 className="font-bold text-amber-800 border-b border-amber-200 pb-1 mb-2">
                          {journey.place_name}
                        </h3>
                        <p className="text-sm text-amber-700 flex items-center mb-1">
                          <Calendar size={12} className="mr-1 inline" />
                          {formatDate(journey.start_date)}
                          {journey.end_date &&
                            journey.end_date !== journey.start_date && (
                              <span className="ml-1">
                                - {formatDate(journey.end_date)}
                              </span>
                            )}
                        </p>
                        {journey.description && (
                          <p className="text-xs mt-1 max-w-xs text-gray-600 line-clamp-2 italic">
                            &quot;{journey.description}&quot;
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Update FitBoundsToMarkers to use a better algorithm */}
                <FitBoundsToMarkers positions={markerPositions} />

                {/* Component to highlight active journey */}
                <ActiveJourneyHighlight
                  activeId={activeJourney}
                  journeys={journeys}
                />

                <ZoomControl position="bottomright" />
              </MapContainer>
            )}
          </div>

          {/* Journey List Container */}
          <div className="bg-amber-50 rounded-lg border border-amber-200 shadow-md p-4 max-h-[600px] overflow-y-auto">
            <h3 className="text-lg font-semibold text-amber-800 mb-4 sticky top-0 bg-amber-50 py-2 border-b border-amber-200">
              Your Travel Timeline
            </h3>

            <div className="space-y-4">
              {sortedJourneys.map((journey) => (
                <div
                  key={journey.journey_id}
                  className={`border ${
                    activeJourney === journey.journey_id
                      ? "border-amber-500 bg-amber-100"
                      : "border-amber-200 bg-white"
                  } 
                    rounded-lg p-3 cursor-pointer transition hover:shadow-md`}
                  onClick={() => setActiveJourney(journey.journey_id)}
                >
                  <h4 className="font-medium text-amber-800">
                    {journey.place_name}
                  </h4>

                  <div className="flex items-center mt-2 text-amber-700 text-sm">
                    <Calendar size={14} className="mr-1" />
                    <span>
                      {formatDate(journey.start_date)}
                      {journey.end_date &&
                        journey.end_date !== journey.start_date &&
                        ` - ${formatDate(journey.end_date)}`}
                    </span>
                  </div>

                  {journey.description && (
                    <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                      {journey.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
