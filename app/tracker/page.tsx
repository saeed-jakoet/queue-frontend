'use client';

import React, { useState, useEffect } from 'react';

// Define the Coordinates interface
interface Coordinates {
  latitude: number;
  longitude: number;
}

// Define the Home component
const Home: React.FC = () => {
  // Set the target location and radius
  const targetLocation: Coordinates = {
    latitude: -33.9308056,
    longitude: 18.4406944,
  };
  const radius: number = 100; // Set a radius around the target coordinates

  // State variables to track if the user is within the radius and form input values
  const [isWithinRadius, setIsWithinRadius] = useState<boolean>(false);
  const [driverName, setDriverName] = useState<string>('');
  const [vehicleRegistration, setVehicleRegistration] = useState<string>('');

  // Function to get the current position using the geolocation API
  const getCurrentPosition = (): Promise<GeolocationPosition | null> => {
    return new Promise<GeolocationPosition | null>(async (resolve) => {
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve(position);
          },
          (error: GeolocationPositionError) => {
            console.error('Error getting user location:', error.message);
            resolve(null); // Return null when there's an error
          },
          {
            enableHighAccuracy: true,
          }
        );
      } catch (error) {
        console.error('Unexpected error:', (error as Error).message);
        resolve(null); // Return null on unexpected errors
      }
    });
  };

  // Function to send payload to WebSocket server
  const sendWebSocketPayload = (payload: object, distance: number) => {
    const websocket = new WebSocket('ws://localhost:8080');
    websocket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      console.log('Payload sent to WebSocket server:', payload);
      console.log('Site coordinates:', targetLocation);
      console.log('Distance to target coordinates:', distance, 'km');
      websocket.send(JSON.stringify(payload));
    });
  };

  // Function to calculate distance between two sets of coordinates
  const calculateDistance = (
    coords1: Coordinates,
    coords2: Coordinates
  ): number => {
    const R: number = 6371; // Earth's radius in kilometers
    const dLat: number =
      (coords2.latitude - coords1.latitude) * (Math.PI / 180);
    const dLon: number =
      (coords2.longitude - coords1.longitude) * (Math.PI / 180);
    const a: number =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coords1.latitude * (Math.PI / 180)) *
        Math.cos(coords2.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c: number = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance: number = R * c; // Distance in kilometers
    return distance;
  };

  // Function to handle form submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const position = await getCurrentPosition();

      if (position === null) {
        console.log('User coordinates not found.');
        return;
      }

      const userCoords: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const distance = calculateDistance(userCoords, targetLocation);

      if (distance <= radius) {
        // User is within the specified radius around the target location
        const payload = {
          vehicle_registration: vehicleRegistration,
          driver_name: driverName,
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
        };

        // Send payload to WebSocket server with distance logged
        sendWebSocketPayload(payload, distance);
      } else {
        console.log('User is outside the specified radius.');
      }
    } catch (error: any) {
      console.error('Error getting user location:', error.message);
    }
  };

  useEffect(() => {
    const watchUserLocation = () => {
      navigator.geolocation.watchPosition(
        (position) => {
          const userCoords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          const distance = calculateDistance(userCoords, targetLocation);
          const isWithin = distance <= radius;

          // Update the state only when the user crosses the radius boundary
          if (isWithin !== isWithinRadius) {
            setIsWithinRadius(isWithin);
          }
        },
        (error) => {
          console.error('Error getting user location:', error.message);
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    };

    watchUserLocation();
  }, [radius, targetLocation, isWithinRadius]);

  // Render the component with JSX
  return (
    <div>
      <h1>Location Tracker</h1>
      {/* <p>
        {isWithinRadius
          ? 'User is within the specified radius.'
          : 'User is outside the specified radius.'}
      </p> */}
      <form onSubmit={handleSubmit}>
        <label>
          Driver Name:
          <input
            type="text"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
          />
        </label>
        <br />
        <label>
          Vehicle Registration:
          <input
            type="text"
            value={vehicleRegistration}
            onChange={(e) => setVehicleRegistration(e.target.value)}
          />
        </label>
        <br />
        <button type="submit">Send Payload</button>
      </form>
    </div>
  );
};

// Export the Home component
export default Home;
