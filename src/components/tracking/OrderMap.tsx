
import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import DeliveryBikeSvg from './DeliveryBikeSvg';

// Configure Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiMDA3am9jaCIsImEiOiJjbTk5ejE1eHMwYWY5MmlxNHpqM2YwdzY2In0.NIWCLXm9mhaIaTCMvbusNQ';

// Default locations
const DEFAULT_STORE_ADDRESS = {
  lat: -14.7952,
  lng: -39.2763, // Coordenadas para R. Nova, 325 - Califórnia, Itabuna - BA
  address: "R. Nova, 325 - Califórnia, Itabuna - BA, 45603-652"
};

const DEFAULT_CUSTOMER_ADDRESS = {
  lat: -14.8042,
  lng: -39.2697, // Coordenadas para Shopping Jequitibá, Itabuna - BA
  address: "Shopping Jequitibá, Av. Aziz Maron, s/n - Góes Calmon, Itabuna - BA, 45605-412"
};

interface OrderMapProps {
  isTracking?: boolean;
  onRouteComplete?: () => void;
  testMode?: boolean;
}

const OrderMap: React.FC<OrderMapProps> = ({ isTracking = false, onRouteComplete = () => {}, testMode = false }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const destinationMarker = useRef<mapboxgl.Marker | null>(null);
  const [loadingMap, setLoadingMap] = useState(true);
  const [route, setRoute] = useState([
    { ...DEFAULT_STORE_ADDRESS },  // Posição inicial (loja)
    { ...DEFAULT_CUSTOMER_ADDRESS } // Destino (cliente)
  ]);
  const [direction, setDirection] = useState(0);

  // Initialize the map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Create map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [DEFAULT_STORE_ADDRESS.lng, DEFAULT_STORE_ADDRESS.lat],
      zoom: 15,
      pitch: 45,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Create custom element for bike marker
    const bikeElement = document.createElement('div');
    bikeElement.className = 'delivery-bike-marker';
    bikeElement.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="13" rx="10" ry="7" fill="rgba(0,0,0,0.1)" />
      <circle cx="12" cy="12" r="7" fill="#333333" />
      <rect x="9" y="7" width="6" height="6" fill="#E53935" rx="1" />
      <circle cx="7" cy="12" r="3" fill="#666666" />
      <circle cx="17" cy="12" r="3" fill="#666666" />
      <circle cx="12" cy="9" r="3" fill="#444444" />
      <rect x="10" y="8" width="4" height="1" fill="white" />
      <rect x="10" y="10" width="4" height="1" fill="white" />
    </svg>`;

    // Create destination marker
    const destElement = document.createElement('div');
    destElement.className = 'destination-marker';
    destElement.innerHTML = `<div class="pulse"></div>
      <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.382 0 0 5.382 0 12C0 20 12 36 12 36C12 36 24 20 24 12C24 5.382 18.618 0 12 0ZM12 16C9.791 16 8 14.209 8 12C8 9.791 9.791 8 12 8C14.209 8 16 9.791 16 12C16 14.209 14.209 16 12 16Z" fill="#E53935"/>
      </svg>`;

    // Add style for pulse animation
    const style = document.createElement('style');
    style.innerHTML = `
      .pulse {
        display: block;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: rgba(229, 57, 53, 0.4);
        position: absolute;
        top: 0;
        left: 1px;
        animation: pulse 1.5s ease-out infinite;
        transform-origin: center center;
      }

      @keyframes pulse {
        0% {
          transform: scale(0.1);
          opacity: 0;
        }
        50% {
          opacity: 1;
        }
        100% {
          transform: scale(1.2);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    // Add markers
    marker.current = new mapboxgl.Marker({ element: bikeElement })
      .setLngLat([route[0].lng, route[0].lat])
      .addTo(map.current);

    destinationMarker.current = new mapboxgl.Marker({ element: destElement })
      .setLngLat([route[1].lng, route[1].lat])
      .addTo(map.current);

    // Add store popup
    const storePopup = new mapboxgl.Popup({ closeButton: false, offset: 25 })
      .setHTML('<div class="p-2 bg-white rounded"><strong>Restaurante</strong><br>Origem do pedido</div>');

    const storeMarker = new mapboxgl.Marker({ color: '#3FB1CE' })
      .setLngLat([route[0].lng, route[0].lat])
      .setPopup(storePopup)
      .addTo(map.current);

    // Add destination popup
    const destPopup = new mapboxgl.Popup({ closeButton: false, offset: 25 })
      .setHTML('<div class="p-2 bg-white rounded"><strong>Seu endereço</strong><br>Destino da entrega</div>');
      
    destinationMarker.current.setPopup(destPopup);

    // Get route from Mapbox Directions API
    const getRoute = async () => {
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${route[0].lng},${route[0].lat};${route[1].lng},${route[1].lat}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const json = await query.json();
      const data = json.routes[0];
      const routeGeoJSON = {
        type: 'Feature',
        properties: {},
        geometry: data.geometry
      };
      
      // Add route to map
      if (map.current?.getSource('route')) {
        // Update existing source
        (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData(routeGeoJSON as any);
      } else {
        // Add new source and layer
        map.current?.addSource('route', {
          type: 'geojson',
          data: routeGeoJSON as any
        });
        
        map.current?.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#4285F4',
            'line-width': 5,
            'line-opacity': 0.75
          }
        });
      }
    };

    // When map is loaded
    map.current.on('load', () => {
      setLoadingMap(false);
      getRoute();
      
      // Fit map to show both markers
      const bounds = new mapboxgl.LngLatBounds()
        .extend([route[0].lng, route[0].lat])
        .extend([route[1].lng, route[1].lat]);
        
      map.current?.fitBounds(bounds, {
        padding: 50
      });
    });

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Animation effect for tracking
  useEffect(() => {
    if (!isTracking || !map.current || !marker.current) return;

    let animationFrame: number;
    let step = 0;
    const totalSteps = 200; // More steps for smoother animation
    
    // Function to get route coordinates from Mapbox Directions API
    const fetchRouteCoordinates = async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${route[0].lng},${route[0].lat};${route[1].lng},${route[1].lat}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
        );
        
        const data = await response.json();
        if (!data.routes || data.routes.length === 0) {
          console.error('No route found');
          return null;
        }
        
        return data.routes[0].geometry.coordinates;
      } catch (error) {
        console.error('Error fetching route:', error);
        return null;
      }
    };
    
    // Animate along route
    const animateMarker = async () => {
      const coordinates = await fetchRouteCoordinates();
      if (!coordinates) return;
      
      let currentStep = 0;
      const routeAnimation = () => {
        if (currentStep >= coordinates.length - 1) {
          if (testMode) {
            onRouteComplete();
          }
          return;
        }
        
        // Get current point and next point
        const currentPoint = coordinates[currentStep];
        const nextPoint = coordinates[currentStep + 1];
        
        // Update marker position
        if (marker.current) {
          marker.current.setLngLat([currentPoint[0], currentPoint[1]]);
          
          // Calculate direction
          const dx = nextPoint[0] - currentPoint[0];
          const dy = nextPoint[1] - currentPoint[1];
          const rotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
          setDirection(rotation);
          
          // Update the bike marker's rotation
          const markerEl = marker.current.getElement();
          const svgEl = markerEl.querySelector('svg');
          if (svgEl) {
            svgEl.style.transform = `rotate(${rotation}deg)`;
          }
        }
        
        // Center map on current position
        map.current?.panTo([currentPoint[0], currentPoint[1]], { duration: 1000 });
        
        currentStep++;
        animationFrame = requestAnimationFrame(routeAnimation);
      };
      
      routeAnimation();
    };
    
    animateMarker();
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isTracking, testMode, onRouteComplete]);

  return (
    <div className="w-full h-[300px] bg-gray-100 rounded-lg overflow-hidden">
      <div className="w-full h-full relative">
        <div 
          ref={mapContainer} 
          className="absolute inset-0"
        />
        {loadingMap && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <Loader2 className="h-8 w-8 animate-spin text-menu-primary" />
          </div>
        )}
      </div>
      <div className="p-2 bg-yellow-50 text-center">
        <p className="text-xs">{isTracking 
          ? "Acompanhando em tempo real a localização do entregador." 
          : "Essa é uma versão demonstrativa do mapa. Na versão final, a localização em tempo real do entregador será mostrada."}</p>
      </div>
    </div>
  );
};

export default OrderMap;
