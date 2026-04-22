"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full text-brand-cyan/50 font-mono text-sm animate-pulse">
      Initializing Global Network...
    </div>
  ),
});

export function EarthGlobe() {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1600, height: 1600 });
  const [countries, setCountries] = useState({ features: [] });

  // Fetch the Geographic Earth Map
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson",
    )
      .then((res) => res.json())
      .then((data) => setCountries(data));
  }, []);

  // Keep the globe responsive
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    // We create an interval that checks every 100ms if the 3D Engine is fully loaded
    const initInterval = setInterval(() => {
      if (globeRef.current && globeRef.current.controls()) {
        // Move the camera
        globeRef.current.pointOfView(
          { lat: 25, lng: -20, altitude: 2.2 },
          1000,
        );

        // Wait 1200ms for camera to finish, then lock in rotation forever
        setTimeout(() => {
          if (globeRef.current) {
            const controls = globeRef.current.controls();
            controls.autoRotate = true;
            controls.autoRotateSpeed = 1.2;
            controls.enableZoom = false;
          }
        }, 1200);

        // Stop checking once successfully initialized!
        clearInterval(initInterval);
      }
    }, 100);

    // Cleanup interval if the component unmounts
    return () => clearInterval(initInterval);
  }, []);

  // 20 REAL-WORLD GLOBAL NODES
  const SF = { lat: 37.7595, lng: -122.4367, name: "SF" };
  const LA = { lat: 34.0522, lng: -118.2437, name: "Los Angeles" };
  const NY = { lat: 40.7128, lng: -74.006, name: "NY" };
  const Toronto = { lat: 43.651, lng: -79.347, name: "Toronto" };
  const MexicoCity = { lat: 19.4326, lng: -99.1332, name: "Mexico City" };
  const SaoPaulo = { lat: -23.5505, lng: -46.6333, name: "Sao Paulo" };
  const London = { lat: 51.5074, lng: -0.1278, name: "London" };
  const Paris = { lat: 48.8566, lng: 2.3522, name: "Paris" };
  const Frankfurt = { lat: 50.1109, lng: 8.6821, name: "Frankfurt" };
  const CapeTown = { lat: -33.9249, lng: 18.4241, name: "Cape Town" };
  const Johannesburg = { lat: -26.2041, lng: 28.0473, name: "Johannesburg" };
  const Dubai = { lat: 25.2048, lng: 55.2708, name: "Dubai" };
  const Mumbai = { lat: 19.076, lng: 72.8777, name: "Mumbai" };
  const Bangalore = { lat: 12.9716, lng: 77.5946, name: "Bangalore" };
  const Singapore = { lat: 1.3521, lng: 103.8198, name: "Singapore" };
  const HongKong = { lat: 22.3193, lng: 114.1694, name: "Hong Kong" };
  const Tokyo = { lat: 35.6895, lng: 139.6917, name: "Tokyo" };
  const Seoul = { lat: 37.5665, lng: 126.978, name: "Seoul" };
  const Sydney = { lat: -33.8688, lng: 151.2093, name: "Sydney" };
  const Melbourne = { lat: -37.8136, lng: 144.9631, name: "Melbourne" };

  const nodes = [
    SF,
    LA,
    NY,
    Toronto,
    MexicoCity,
    SaoPaulo,
    London,
    Paris,
    Frankfurt,
    CapeTown,
    Johannesburg,
    Dubai,
    Mumbai,
    Bangalore,
    Singapore,
    HongKong,
    Tokyo,
    Seoul,
    Sydney,
    Melbourne,
  ];

  const arcsData = [
    // North & Central America
    { startLat: SF.lat, startLng: SF.lng, endLat: LA.lat, endLng: LA.lng },
    { startLat: LA.lat, startLng: LA.lng, endLat: NY.lat, endLng: NY.lng },
    {
      startLat: SF.lat,
      startLng: SF.lng,
      endLat: Toronto.lat,
      endLng: Toronto.lng,
    },
    {
      startLat: LA.lat,
      startLng: LA.lng,
      endLat: MexicoCity.lat,
      endLng: MexicoCity.lng,
    },
    {
      startLat: NY.lat,
      startLng: NY.lng,
      endLat: MexicoCity.lat,
      endLng: MexicoCity.lng,
    },
    {
      startLat: MexicoCity.lat,
      startLng: MexicoCity.lng,
      endLat: SaoPaulo.lat,
      endLng: SaoPaulo.lng,
    },

    // Trans-Atlantic
    {
      startLat: NY.lat,
      startLng: NY.lng,
      endLat: London.lat,
      endLng: London.lng,
    },
    {
      startLat: Toronto.lat,
      startLng: Toronto.lng,
      endLat: Frankfurt.lat,
      endLng: Frankfurt.lng,
    },
    {
      startLat: SaoPaulo.lat,
      startLng: SaoPaulo.lng,
      endLat: Johannesburg.lat,
      endLng: Johannesburg.lng,
    },

    // Europe & Africa
    {
      startLat: London.lat,
      startLng: London.lng,
      endLat: Paris.lat,
      endLng: Paris.lng,
    },
    {
      startLat: Paris.lat,
      startLng: Paris.lng,
      endLat: Frankfurt.lat,
      endLng: Frankfurt.lng,
    },
    {
      startLat: Frankfurt.lat,
      startLng: Frankfurt.lng,
      endLat: Dubai.lat,
      endLng: Dubai.lng,
    },
    {
      startLat: CapeTown.lat,
      startLng: CapeTown.lng,
      endLat: Johannesburg.lat,
      endLng: Johannesburg.lng,
    },
    {
      startLat: Johannesburg.lat,
      startLng: Johannesburg.lng,
      endLat: Dubai.lat,
      endLng: Dubai.lng,
    },

    // Middle East & India
    {
      startLat: Dubai.lat,
      startLng: Dubai.lng,
      endLat: Mumbai.lat,
      endLng: Mumbai.lng,
    },
    {
      startLat: Mumbai.lat,
      startLng: Mumbai.lng,
      endLat: Bangalore.lat,
      endLng: Bangalore.lng,
    },
    {
      startLat: Bangalore.lat,
      startLng: Bangalore.lng,
      endLat: Singapore.lat,
      endLng: Singapore.lng,
    },

    // Asia Internal
    {
      startLat: Singapore.lat,
      startLng: Singapore.lng,
      endLat: HongKong.lat,
      endLng: HongKong.lng,
    },
    {
      startLat: HongKong.lat,
      startLng: HongKong.lng,
      endLat: Tokyo.lat,
      endLng: Tokyo.lng,
    },
    {
      startLat: Tokyo.lat,
      startLng: Tokyo.lng,
      endLat: Seoul.lat,
      endLng: Seoul.lng,
    },
    {
      startLat: HongKong.lat,
      startLng: HongKong.lng,
      endLat: Seoul.lat,
      endLng: Seoul.lng,
    },

    // Oceania & Trans-Pacific
    {
      startLat: Singapore.lat,
      startLng: Singapore.lng,
      endLat: Sydney.lat,
      endLng: Sydney.lng,
    },
    {
      startLat: Sydney.lat,
      startLng: Sydney.lng,
      endLat: Melbourne.lat,
      endLng: Melbourne.lng,
    },
    {
      startLat: Tokyo.lat,
      startLng: Tokyo.lng,
      endLat: SF.lat,
      endLng: SF.lng,
    },
    {
      startLat: Sydney.lat,
      startLng: Sydney.lng,
      endLat: LA.lat,
      endLng: LA.lng,
    },

    // Long-haul core backbone connections
    {
      startLat: London.lat,
      startLng: London.lng,
      endLat: Mumbai.lat,
      endLng: Mumbai.lng,
    },
    {
      startLat: Frankfurt.lat,
      startLng: Frankfurt.lng,
      endLat: Singapore.lat,
      endLng: Singapore.lng,
    },
  ];

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[850px] aspect-square mx-auto relative flex items-center justify-center animate-mask-up-blur [animation-delay:2000ms] cursor-grab active:cursor-grabbing"
    >
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,transparent_55%,var(--color-brand-dark)_85%)]" />

      {/* The 3D Engine */}
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        // REAL EARTH DOTTED CONTINENTS
        hexPolygonsData={countries.features}
        hexPolygonResolution={3}
        hexPolygonMargin={0.5}
        hexPolygonColor={() => "rgba(255, 255, 255, 0.2)"}
        // ATMOSPHERIC GLOW
        showAtmosphere={true}
        atmosphereColor="#00ffd1"
        atmosphereAltitude={0.15}
        // DYNAMIC FLOWING ARCS
        arcsData={arcsData}
        arcColor={() => "#00ffd1"}
        arcDashLength={0.4}
        arcDashGap={2}
        arcDashInitialGap={() => Math.random() * 5}
        arcDashAnimateTime={2500}
        arcAltitude={0.25}
        // RADAR PING RINGS ON NODES
        ringsData={nodes}
        ringColor={() => "#00ffd1"}
        ringMaxRadius={5}
        ringPropagationSpeed={3}
        ringRepeatPeriod={800}
        // SOLID CORE POINTS ON NODES
        pointsData={nodes}
        pointColor={() => "#ffffff"}
        pointAltitude={0.01}
        pointRadius={0.5}
      />
    </div>
  );
}
