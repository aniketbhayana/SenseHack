const db = require('../config/db');
const axios = require('axios');
const polyline = require('@mapbox/polyline');

exports.getRoute = async (req, res) => {
    const { origin, destination, mode } = req.body;

    if (!origin || !destination) {
        return res.status(400).json({ error: "Origin and destination required" });
    }

    try {
        // 1. Fetch Real Routes from OSRM (Public API)
        // coordinates format: {lon},{lat};{lon},{lat}
        const coordsString = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
        // Request alternatives=true to get multiple paths (Safest vs Shortest candidates)
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&alternatives=true&geometries=polyline`;

        const response = await axios.get(osrmUrl);
        const routes = response.data.routes;

        if (!routes || routes.length === 0) {
            return res.status(404).json({ error: "No route found" });
        }

        // 2. Evaluate Each Route
        const evaluatedRoutes = await Promise.all(routes.map(async (route) => {
            const decodedCoords = polyline.decode(route.geometry).map(pt => ({ lat: pt[0], lng: pt[1] })); // [lat, lng]
            // Pass the raw OSRM route as well so we can factor in traffic density (via speed)
            const riskStats = await calculateDetailedRisk(decodedCoords, route);

            // Normalize Safety Score (0-100)
            // dangerScore is roughly 0–70 (user incidents + PDF crime stats)
            // safetyBoost is roughly 0–20 (police, hospitals, CCTV, lights)
            // We subtract danger directly and add safety so that typical routes
            // end up somewhere between 30–90 instead of collapsing to 0.
            const normalizedDanger = Math.min(100, riskStats.dangerScore || 0);
            const normalizedSafety = Math.min(30, riskStats.safetyBoost || 0);

            let rawScore = 100 - normalizedDanger + normalizedSafety;
            rawScore = Math.max(0, Math.min(100, rawScore));

            return {
                route,
                coords: decodedCoords,
                score: parseFloat(rawScore.toFixed(0)),
                stats: riskStats
            };
        }));

        // 3. Select Best Route
        // Safest: Highest Score
        // Shortest: Lowest Duration (OSRM returns index 0 as shortest usually, but we check duration)

        let bestRoute;
        if (mode === 'safest') {
            evaluatedRoutes.sort((a, b) => b.score - a.score); // Descending score
            bestRoute = evaluatedRoutes[0];
        } else {
            // Shortest logic
            evaluatedRoutes.sort((a, b) => a.route.duration - b.route.duration);
            bestRoute = evaluatedRoutes[0];
        }

        res.json({
            route: {
                coords: bestRoute.coords,
                distanceMeters: bestRoute.route.distance,
                durationSeconds: bestRoute.route.duration,
                safetyScore: bestRoute.score,
                riskDetails: bestRoute.stats
            }
        });

    } catch (err) {
        console.error('Routing Error:', err);
        res.status(500).json({ error: 'Routing service error' });
    }
};

async function calculateDetailedRisk(coords, baseRoute) {
    if (coords.length < 2) return { 
        dangerScore: 0, 
        safetyBoost: 0, 
        crimeRateScore: 0, 
        userReportScore: 0,
        infrastructureScore: 0,
        details: {}
    };

    // Simplify geometry for query performance (sample every 10th point if too long)
    const lineString = coords.map(c => `${c.lng} ${c.lat}`).join(',');
    const wkt = `LINESTRING(${lineString})`;

    try {
        // 1. Query User-Reported Incidents (30% weight)
        // Recent reports get higher weight
        const dangerQuery = `
            SELECT SUM(
                severity * 
                CASE 
                    WHEN reported_at > NOW() - INTERVAL '7 days' THEN 3.0
                    WHEN reported_at > NOW() - INTERVAL '30 days' THEN 2.0
                    WHEN reported_at > NOW() - INTERVAL '90 days' THEN 1.5
                    ELSE 1.0
                END
            ) as weighted_severity, 
            COUNT(*) as count
            FROM reports 
            WHERE ST_DWithin(
                location, 
                ST_GeographyFromText($1), 
                200 -- 200m buffer
            ) AND reported_at > NOW() - INTERVAL '6 months'
        `;

        // 2. Query Safety Infrastructure (20% weight)
        const safetyQuery = `
            SELECT type, COUNT(*) as count
            FROM infrastructure 
            WHERE ST_DWithin(
                location, 
                ST_GeographyFromText($1), 
                500 -- 500m buffer for safety infrastructure
            )
            GROUP BY type
        `;

        // 3. Query Historical Crime Statistics (40% weight)
        // Find which division(s) the route passes through
        const divisionQuery = `
            SELECT DISTINCT d.id, d.name, d.crime_rate_2023
            FROM divisions d
            WHERE ST_DWithin(
                ST_GeographyFromText('POINT(' || d.center_lng || ' ' || d.center_lat || ')'),
                ST_GeographyFromText($1),
                5000 -- 5km buffer to find nearby divisions
            )
            ORDER BY d.crime_rate_2023 DESC
            LIMIT 3
        `;

        // 4. Get aggregated crime statistics for the area
        const crimeStatsQuery = `
            SELECT 
                SUM(cs.reported * cs.severity_weight) as weighted_crimes,
                COUNT(DISTINCT cs.crime_type) as crime_types
            FROM crime_statistics cs
            INNER JOIN divisions d ON cs.division_id = d.id
            WHERE ST_DWithin(
                ST_GeographyFromText('POINT(' || d.center_lng || ' ' || d.center_lat || ')'),
                ST_GeographyFromText($1),
                5000
            ) AND cs.year = 2023
        `;

        const [dangerRes, safetyRes, divisionRes, crimeStatsRes] = await Promise.all([
            db.query(dangerQuery, [wkt]),
            db.query(safetyQuery, [wkt]),
            db.query(divisionQuery, [wkt]),
            db.query(crimeStatsQuery, [wkt])
        ]);

        // Calculate User Report Risk Score (0-30)
        const userReportScore = Math.min(30, parseInt(dangerRes.rows[0]?.weighted_severity || 0));

        // Calculate Infrastructure Safety Boost (0-20)
        let infrastructureScore = 0;
        let policeCount = 0;
        let hospitalCount = 0;
        let streetlightCount = 0;
        let cctvCount = 0;
        safetyRes.rows.forEach(row => {
            const cnt = parseInt(row.count) || 0;
            if (row.type === 'police') {
                policeCount += cnt;
                infrastructureScore += cnt * 5; // Police stations are very important
            }
            if (row.type === 'hospital') {
                hospitalCount += cnt;
                infrastructureScore += cnt * 3;
            }
            if (row.type === 'cctv') {
                cctvCount += cnt;
                infrastructureScore += cnt * 1;
            }
            if (row.type === 'streetlight') {
                streetlightCount += cnt;
                infrastructureScore += cnt * 0.5;
            }
        });
        infrastructureScore = Math.min(20, infrastructureScore); // Cap at 20

        // Calculate Historical Crime Rate Score (0-40)
        // Normalize based on typical Bengaluru crime rates (this represents "emergency hotspots")
        const weightedCrimes = parseFloat(crimeStatsRes.rows[0]?.weighted_crimes || 0);
        const crimeRateScore = Math.min(40, (weightedCrimes / 100)); // Normalize

        // 5. Approximate Traffic Density Risk (0-20) using average speed of this OSRM route
        let trafficRiskScore = 0;
        let averageSpeedKmh = null;
        if (baseRoute && baseRoute.distance && baseRoute.duration) {
            const km = baseRoute.distance / 1000; // meters -> km
            const hours = baseRoute.duration / 3600; // seconds -> hours
            if (hours > 0) {
                averageSpeedKmh = km / hours;
                // Slower average speed ⇒ heavier traffic ⇒ higher risk for travellers
                if (averageSpeedKmh < 10) {
                    trafficRiskScore = 20;
                } else if (averageSpeedKmh < 20) {
                    trafficRiskScore = 12;
                } else if (averageSpeedKmh < 30) {
                    trafficRiskScore = 6;
                } else {
                    trafficRiskScore = 2;
                }
            }
        }

        // Get division details for response
        const divisions = divisionRes.rows.map(d => ({
            id: d.id,
            name: d.name,
            crimeRate: d.crime_rate_2023
        }));

        return { 
            // Combined danger now includes:
            // - recent user incidents along the path (userReportScore)
            // - PDF-based crime hotspots around the path (crimeRateScore)
            // - traffic density derived from OSRM average speed (trafficRiskScore)
            dangerScore: userReportScore + crimeRateScore + trafficRiskScore,
            safetyBoost: infrastructureScore,
            crimeRateScore,
            userReportScore,
            infrastructureScore,
            trafficRiskScore,
            details: {
                divisions,
                userIncidents: parseInt(dangerRes.rows[0]?.count || 0),
                policeStations: policeCount,
                hospitals: hospitalCount,
                streetlights: streetlightCount,
                cctvCameras: cctvCount,
                weightedCrimes: Math.floor(weightedCrimes),
                trafficAvgSpeedKmh: averageSpeedKmh
            }
        };

    } catch (e) {
        console.error("Risk calc error:", e);
        return { 
            dangerScore: 0, 
            safetyBoost: 0, 
            crimeRateScore: 0,
            userReportScore: 0,
            infrastructureScore: 0,
            details: {}
        };
    }
}
