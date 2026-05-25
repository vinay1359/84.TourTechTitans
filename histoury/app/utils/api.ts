export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5000";

export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
) {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      let errorMessage = "API request failed";

      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // Fallback to response text if JSON parsing fails
        try {
          await response.text();
        } catch {
          // Ignore error - can't get text error details
        }
      }

      throw new Error(`${errorMessage} (Status: ${response.status})`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error("Network error - Is the backend server running?", error);
      throw new Error(
        "Cannot connect to server. Please make sure the backend is running."
      );
    }
    throw error;
  }
}

// Example function to fetch user journeys
export async function getUserJourneys() {
  return fetchWithAuth("/journeys");
}

// Example function to upload a photo
export async function uploadPhoto(formData: FormData) {
  return fetchWithAuth("/photos/upload", {
    method: "POST",
    headers: {
      // Don't set Content-Type when using FormData
    },
    body: formData,
  });
}

// Create a new journey
export async function createJourney(name: string) {
  return fetchWithAuth("/journeys/", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

// Add a landmark to a journey
export async function addLandmarkToJourney(
  journeyId: string,
  landmark: {
    name: string;
    latitude: string | number;
    longitude: string | number;
    summary?: string;
    image_url?: string;
  }
) {
  return fetchWithAuth(`/journeys/${journeyId}/landmarks`, {
    method: "POST",
    body: JSON.stringify(landmark),
  });
}

// Create a new trip
export async function createTrip(tripData: {
  lat: number | string;
  lng: number | string;
  description: string;
  start_date?: string;
  end_date?: string;
  place_name: string;
}) {
  return fetchWithAuth("/trips", {
    method: "POST",
    body: JSON.stringify(tripData),
  });
}

// Get all user trips
export async function getUserTrips() {
  return fetchWithAuth("/trips");
}

// Get a specific trip
export async function getTrip(tripId: string) {
  return fetchWithAuth(`/trips/${tripId}`);
}

// Update a trip
export async function updateTrip(
  tripId: string,
  tripData: Partial<{
    description: string;
    start_date: string;
    end_date: string;
    place_name: string;
  }>
) {
  return fetchWithAuth(`/trips/${tripId}`, {
    method: "PUT",
    body: JSON.stringify(tripData),
  });
}

// Delete a trip
export async function deleteTrip(tripId: string) {
  return fetchWithAuth(`/trips/${tripId}`, {
    method: "DELETE",
  });
}

// Mark a trip as completed (move to journeys table)
export async function markTripAsCompleted(tripId: string) {
  return fetchWithAuth(`/trips/${tripId}/complete`, {
    method: "POST",
  });
}

// Get all user journeys (completed trips)
export async function getUserJourneysHistory() {
  return fetchWithAuth("/journeys/history");
}
