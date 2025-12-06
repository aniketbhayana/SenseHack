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

    // Direction State
    const [points, setPoints] = useState({ start: null, end: null });
    const [pickingMode, setPickingMode] = useState(null); // 'start' | 'end'
    const [routes, setRoutes] = useState({ safest: null, shortest: null });
    const [loadingRoutes, setLoadingRoutes] = useState(false);

    const mapRef = useRef(null);
    const heatLayerRef = useRef(null);

    // Load reports & Heatmap
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
            onReportPick(loc);
        } else if (pickingMode === 'start') {
            setPoints(p => ({ ...p, start: loc }));
            setPickingMode(null);
        } else if (pickingMode === 'end') {
            setPoints(p => ({ ...p, end: loc }));
            setPickingMode(null);
        }
    };

    const osmTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    return (
        <div className="w-full h-full flex flex-col relative">

            {/* Directions UI Panel (Only show if NOT picking a report location) */}
            {!onReportPick && (
                <div className="absolute top-4 left-4 z-[1000] bg-white p-4 rounded-xl shadow-lg w-80 max-w-full">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Navigation size={18} /> Directions
                    </h3>

                    <div className="space-y-3">
                        {/* Start Input */}
                        <div className="flex gap-2 items-center">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <button
                                onClick={() => setPickingMode('start')}
                                className={`flex-1 text-left text-sm p-2 rounded border ${pickingMode === 'start' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200 hover:bg-slate-50'}`}
                            >
                                {points.start ? `Start: ${points.start.lat.toFixed(4)}, ...` : 'Click to Set Start'}
                            </button>
                        </div>

                        {/* End Input */}
                        <div className="flex gap-2 items-center">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <button
                                onClick={() => setPickingMode('end')}
                                className={`flex-1 text-left text-sm p-2 rounded border ${pickingMode === 'end' ? 'ring-2 ring-red-500 border-red-500' : 'border-slate-200 hover:bg-slate-50'}`}
                            >
                                {points.end ? `Dest: ${points.end.lat.toFixed(4)}, ...` : 'Click to Set Destination'}
                            </button>
                        </div>
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
                        {pickingMode ? 'Click on map to select location...' : 'Select start and end points.'}
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
