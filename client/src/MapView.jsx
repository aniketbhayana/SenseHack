// MapView.jsx
import React, { useEffect, useState, useRef } from "react";
import { api } from './services/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { Navigation, Clock, ShieldAlert, Timer } from 'lucide-react';

// Fix Leaflet's default icon path issues
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// Component to handle map clicks for picking locations
function LocationPicker({ mode, onPick }) {
    useMapEvents({
        click(e) {
            onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
    });
    return null;
}

export default function MapView({
    initialCenter = { lat: 12.9716, lng: 77.5946 },
    initialZoom = 13,
    showHeatmap = true,
    onReportPick // If present, we are in "Report Mode"
}) {
    const [reports, setReports] = useState([]);
    const [heatPoints, setHeatPoints] = useState([]);

    // Infrastructure markers (police stations, hospitals)
    const [policeInfra, setPoliceInfra] = useState([]);
    const [hospitalInfra, setHospitalInfra] = useState([]);

    // Direction State
    const [points, setPoints] = useState({ start: null, end: null });
    const [pickingMode, setPickingMode] = useState(null); // kept for report mode / future map-pick use
    const [routes, setRoutes] = useState({ safest: null, shortest: null });
    const [loadingRoutes, setLoadingRoutes] = useState(false);

    // Address search state for start/end instead of only map clicks
    const [startQuery, setStartQuery] = useState("");
    const [endQuery, setEndQuery] = useState("");
    const [geocodeLoading, setGeocodeLoading] = useState({ start: false, end: false });
    const [geocodeError, setGeocodeError] = useState("");

    const mapRef = useRef(null);
    const heatLayerRef = useRef(null);

    // Load reports & Heatmap + nearby police/hospitals for map context
    useEffect(() => {
        (async function fetchInitial() {
            try {
                const bbox = [
                    initialCenter.lng - 0.05, initialCenter.lat - 0.05,
                    initialCenter.lng + 0.05, initialCenter.lat + 0.05
                ];
                const json = await api.getReports(bbox.join(','));
                const data = json.data;
                setReports(data);

                // Normalized Heatmap (0.2 to 1.0)
                const pts = data.map(r => [
                    r.location.lat,
                    r.location.lng,
                    (r.severity / 5)
                ]);
                setHeatPoints(pts);

                // Load nearby infrastructure (police + hospitals) around initial center
                const { lat, lng } = initialCenter;
                const [police, hospitals] = await Promise.all([
                    api.getNearbyInfrastructure({ lat, lng, radius: 4000, type: 'police' }),
                    api.getNearbyInfrastructure({ lat, lng, radius: 4000, type: 'hospital' })
                ]);
                setPoliceInfra(police);
                setHospitalInfra(hospitals);
            } catch (err) { console.error(err); }
        })();
    }, []);

    // Heatmap Layer Management
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (heatLayerRef.current) {
            try { map.removeLayer(heatLayerRef.current); } catch (e) { }
        }
        if (showHeatmap && heatPoints.length > 0) {
            heatLayerRef.current = L.heatLayer(heatPoints, {
                radius: 25, blur: 15, maxZoom: 17,
                gradient: { 0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
            });
            heatLayerRef.current.addTo(map);
        }
    }, [heatPoints, showHeatmap]);

    // Handle Route Calculation
    useEffect(() => {
        if (points.start && points.end && !onReportPick) {
            fetchComparativeRoutes();
        }
    }, [points.start, points.end]);

    async function fetchComparativeRoutes() {
        setLoadingRoutes(true);
        try {
            // Fetch both in parallel
            const [safeRes, shortRes] = await Promise.all([
                api.getRoute({ origin: points.start, destination: points.end, mode: 'safest' }),
                api.getRoute({ origin: points.start, destination: points.end, mode: 'shortest' })
            ]);

            setRoutes({
                safest: safeRes.route,
                shortest: shortRes.route
            });
        } catch (e) {
            console.error("Routing failed", e);
            alert("Failed to calculate routes");
        } finally {
            setLoadingRoutes(false);
        }
    }

    const handleMapPick = (loc) => {
        if (onReportPick) {
            // In report mode, clicks are used to place a report.
            onReportPick(loc);
        } else if (pickingMode === 'start') {
            // Optional: keep ability to refine start via map click.
            setPoints(p => ({ ...p, start: loc }));
            setPickingMode(null);
        } else if (pickingMode === 'end') {
            // Optional: keep ability to refine destination via map click.
            setPoints(p => ({ ...p, end: loc }));
            setPickingMode(null);
        }
    };

    // Simple geocoding using OpenStreetMap Nominatim API.
    async function geocodeAddress(query) {
        // Restrict geocoding to Bengaluru by providing a bounding box (viewbox)
        // and bounded=1 so results stay inside this area.
        const viewbox = '77.4,13.2,77.8,12.8'; // left,top,right,bottom around Bengaluru
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&viewbox=${viewbox}&bounded=1`;
        const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!resp.ok) throw new Error('Geocoding failed');
        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('No results found for that location');
        }
        const { lat, lon } = data[0];
        return { lat: parseFloat(lat), lng: parseFloat(lon) };
    }

    async function handleGeocode(which) {
        const query = which === 'start' ? startQuery : endQuery;
        if (!query.trim()) return;

        setGeocodeError("");
        setGeocodeLoading(prev => ({ ...prev, [which]: true }));

        try {
            const loc = await geocodeAddress(query);
            setPoints(p => ({ ...p, [which]: loc }));

            const map = mapRef.current;
            if (map) {
                map.setView([loc.lat, loc.lng], 15);
            }
        } catch (err) {
            console.error('Geocode error', err);
            setGeocodeError('Could not find that location. Try a more specific address.');
        } finally {
            setGeocodeLoading(prev => ({ ...prev, [which]: false }));
        }
    }

    const osmTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    // Convenience reference for safety details on the selected safest route
    const safestDetails = routes.safest?.riskDetails?.details;

    return (
        <div className="w-full h-full flex flex-col relative">

            {/* Directions UI Panel (Only show if NOT picking a report location) */}
            {!onReportPick && (
                <div className="absolute top-4 left-4 z-[1000] bg-white p-4 rounded-xl shadow-lg w-80 max-w-full">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Navigation size={18} /> Directions
                    </h3>

                    <div className="space-y-3">
                        {/* Start Input (address search) */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-xs font-medium text-slate-700">Start</span>
                            </div>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={startQuery}
                                    onChange={(e) => setStartQuery(e.target.value)}
                                    placeholder="Type start location (e.g. MG Road, Bengaluru)"
                                    className="flex-1 text-sm p-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={() => handleGeocode('start')}
                                    disabled={geocodeLoading.start}
                                    className="text-xs px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {geocodeLoading.start ? 'Locating...' : 'Set'}
                                </button>
                            </div>
                            {points.start && (
                                <div className="text-xs text-slate-500">
                                    Selected: {points.start.lat.toFixed(4)}, {points.start.lng.toFixed(4)}
                                </div>
                            )}
                        </div>

                        {/* End Input (address search) */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-xs font-medium text-slate-700">Destination</span>
                            </div>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={endQuery}
                                    onChange={(e) => setEndQuery(e.target.value)}
                                    placeholder="Type destination (e.g. Indiranagar Metro)"
                                    className="flex-1 text-sm p-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <button
                                    onClick={() => handleGeocode('end')}
                                    disabled={geocodeLoading.end}
                                    className="text-xs px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                    {geocodeLoading.end ? 'Locating...' : 'Set'}
                                </button>
                            </div>
                            {points.end && (
                                <div className="text-xs text-slate-500">
                                    Selected: {points.end.lat.toFixed(4)}, {points.end.lng.toFixed(4)}
                                </div>
                            )}
                        </div>

                        {geocodeError && (
                            <div className="text-xs text-red-500 mt-1">
                                {geocodeError}
                            </div>
                        )}
                    </div>

                    {/* Results */}
                    {loadingRoutes && <div className="mt-3 text-sm text-slate-500">Calculating best paths...</div>}

                    {routes.safest && !loadingRoutes && (
                        <div className="mt-4 space-y-3">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-green-700 text-sm flex items-center gap-1"><ShieldAlert size={14} /> Safest Path</span>
                                    <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-bold">Score: {routes.safest.safetyScore}</span>
                                </div>
                                <div className="flex justify-between text-xs text-green-800">
                                    <span className="flex items-center gap-1"><Clock size={12} /> {Math.round(routes.safest.durationSeconds / 60)} mins</span>
                                    <span>{(routes.safest.distanceMeters / 1000).toFixed(1)} km</span>
                                </div>

                                {safestDetails && (
                                    <div className="mt-2 text-[11px] text-green-900 space-y-0.5">
                                        <div>
                                            Police stations nearby: <span className="font-semibold">{safestDetails.policeStations ?? 0}</span>
                                        </div>
                                        <div>
                                            Hospitals nearby: <span className="font-semibold">{safestDetails.hospitals ?? 0}</span>
                                        </div>
                                        <div>
                                            Streetlight clusters: <span className="font-semibold">{safestDetails.streetlights ?? 0}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg opacity-80 hover:opacity-100 transition-opacity">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-slate-700 text-sm flex items-center gap-1"><Timer size={14} /> Fastest Path</span>
                                    <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Score: {routes.shortest.safetyScore}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-600">
                                    <span className="flex items-center gap-1"><Clock size={12} /> {Math.round(routes.shortest.durationSeconds / 60)} mins</span>
                                    <span>{(routes.shortest.distanceMeters / 1000).toFixed(1)} km</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-3 text-xs text-slate-400">
                        Type start and destination above to calculate safest and fastest routes.
                    </div>
                </div>
            )}

            <div className="flex-1 w-full h-full">
                <MapContainer
                    center={[initialCenter.lat, initialCenter.lng]}
                    zoom={initialZoom}
                    style={{ height: '100%', width: '100%' }}
                    ref={mapRef}
                >
                    <TileLayer url={osmTileUrl} attribution={'OpenStreetMap'} />

                    {/* Report Markers */}
                    {reports.map(r => (
                        <Marker key={r.id} position={[r.location.lat, r.location.lng]}>
                            <Popup>
                                <strong className="capitalize">{r.category}</strong><br />
                                Severity: {r.severity}
                            </Popup>
                        </Marker>
                    ))}

                    {/* Police Stations */}
                    {policeInfra.map(p => (
                        <Marker key={`police-${p.id}`} position={[p.lat, p.lng]}>
                            <Popup>
                                <strong>Police Station</strong><br />
                                {p.name || 'Unnamed'}<br />
                                {(p.distance_meters != null) && `${Math.round(p.distance_meters)} m away`}
                            </Popup>
                        </Marker>
                    ))}

                    {/* Hospitals */}
                    {hospitalInfra.map(h => (
                        <Marker key={`hospital-${h.id}`} position={[h.lat, h.lng]}>
                            <Popup>
                                <strong>Hospital</strong><br />
                                {h.name || 'Unnamed'}<br />
                                {(h.distance_meters != null) && `${Math.round(h.distance_meters)} m away`}
                            </Popup>
                        </Marker>
                    ))}

                    {/* Start/End Markers */}
                    {points.start && <Marker position={points.start}><Popup>Start</Popup></Marker>}
                    {points.end && <Marker position={points.end}><Popup>Destination</Popup></Marker>}

                    {/* Routes PolyLines */}
                    {routes.safest && routes.safest.coords && (
                        <Polyline
                            positions={routes.safest.coords.map(c => [c.lat, c.lng])}
                            pathOptions={{ color: 'green', weight: 6, opacity: 0.9 }}
                        />
                    )}
                    {routes.shortest && routes.shortest.coords && (
                        <Polyline
                            positions={routes.shortest.coords.map(c => [c.lat, c.lng])}
                            pathOptions={{ color: 'gray', weight: 4, opacity: 0.6, dashArray: '10, 10' }}
                        />
                    )}

                    <LocationPicker onPick={handleMapPick} />
                </MapContainer>
            </div>
        </div>
    );
}
