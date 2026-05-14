import { useEffect } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { useMap } from "react-leaflet";

// Fix for default Leaflet marker icons not showing up for routing
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

const RoutingControl = ({ waypoints, onWaypointsChange, travelMode = 'car', onRouteFound }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    
    // Safety check: Ensure L.Routing is available (sometimes delayed in Vite)
    if (!L.Routing || !L.Routing.control) {
      console.warn("Leaflet Routing Machine not loaded yet.");
      return;
    }

    let routingControl;
    
    try {
      // Initialize icon inside effect to ensure L is ready
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41]
      });

      const normalizedWaypoints = waypoints
        .filter(wp => wp && (wp.lat !== undefined && wp.lng !== undefined))
        .map(wp => L.latLng(wp.lat, wp.lng));

      if (normalizedWaypoints.length < 2) return;

      const tomtomKey = import.meta.env.VITE_TOMTOM_API_KEY;
      
      const tomtomRouter = {
        route: function(wp, callback, context, options) {
          const locations = wp.map(p => `${p.latLng.lat},${p.latLng.lng}`).join(':');
          const url = `https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?key=${tomtomKey}&traffic=true&travelMode=${travelMode}&instructionsType=text`;

          fetch(url)
            .then(res => res.json())
            .then(data => {
              if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.legs.flatMap(leg => 
                  leg.points.map(p => L.latLng(p.latitude, p.longitude))
                );
                
                const instructions = route.guidance && route.guidance.instructions ? 
                  route.guidance.instructions.map(inst => ({
                    distance: inst.routeOffsetInMeters,
                    time: inst.travelTimeInSeconds,
                    text: inst.message
                  })) : [];

                const result = [{
                  name: "TomTom Live Traffic Route",
                  summary: {
                    totalDistance: route.summary.lengthInMeters,
                    totalTime: route.summary.travelTimeInSeconds
                  },
                  coordinates: coordinates,
                  instructions: instructions,
                  waypoints: wp
                }];
                callback.call(context, null, result);
                if (onRouteFound) {
                  onRouteFound({
                    distance: route.summary.lengthInMeters,
                    time: route.summary.travelTimeInSeconds,
                    instructions: instructions
                  });
                }
              } else {
                callback.call(context, { message: "No route found" }, null);
              }
            })
            .catch(err => callback.call(context, err, null));
        }
      };

      routingControl = L.Routing.control({
        waypoints: normalizedWaypoints,
        router: tomtomKey ? tomtomRouter : new L.Routing.OSRMv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1'
        }),
        position: 'topleft',
        lineOptions: {
          styles: [{ color: "#3b82f6", weight: 6, opacity: 0.8 }]
        },
        createMarker: (i, waypoint, n) => {
          const isStart = i === 0;
          const isEnd = i === n - 1;
          const color = isStart ? '#6366f1' : isEnd ? '#ef4444' : '#6b7280';
          
          return L.marker(waypoint.latLng, {
            draggable: true,
            zIndexOffset: 2000,
            icon: L.divIcon({
              className: 'custom-routing-marker',
              html: `
                <div style="width: 30px; height: 30px; position: relative;">
                  <svg viewBox="0 0 384 512" style="width: 30px; height: 30px; fill: ${color}; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));">
                    <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
                  </svg>
                  <div style="position: absolute; top: 7px; left: 0; width: 100%; text-align: center; color: white; font-weight: 900; font-size: 14px; font-family: Arial;">!</div>
                </div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 30]
            })
          });
        },
        show: true,
        addWaypoints: true,
        routeWhileDragging: true,
        fitSelectedRoutes: true,
        showAlternatives: false,
        containerClassName: 'routing-panel-container hidden-routing-panel'
      }).addTo(map);

      routingControl.on('routesfound', (e) => {
        const routes = e.routes;
        if (routes && routes.length > 0) {
          const summary = routes[0].summary;
          if (onRouteFound) {
            onRouteFound({
              distance: summary.totalDistance,
              time: summary.totalTime,
              instructions: routes[0].instructions || []
            });
          }
        }
      });

      // Hide the default UI
      const container = document.querySelector('.hidden-routing-panel');
      if (container) {
        container.style.display = 'none';
      }

      routingControl.on('waypointschanged', (e) => {
        if (!e.waypoints) return;
        const newWaypoints = e.waypoints
          .filter(wp => wp && wp.latLng)
          .map(wp => ({
            lat: wp.latLng.lat,
            lng: wp.latLng.lng
          }));
        onWaypointsChange(newWaypoints);
      });
    } catch (err) {
      console.error("Error initializing Routing Control:", err);
    }

    return () => {
      if (routingControl && map) {
        try {
          map.removeControl(routingControl);
        } catch (e) {
          // Ignore removal errors on unmount
        }
      }
    };
  }, [map, waypoints, travelMode]); // Add travelMode to dependency array

  return null;
};

export default RoutingControl;
