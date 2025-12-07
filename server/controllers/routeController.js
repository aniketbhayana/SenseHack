const db = require('../config/db');
const axios = require('axios');
const polyline = require('@mapbox/polyline');

exports.getRoute = async (req, res) => {
    const { origin, destination, mode } = req.body;

    if (!origin || !destination) {
        return res.status(400).json({ error: "Origin and destination required" });
    }

    // Restrict routing to a Bengaluru city bounding box to avoid far-away paths.
    // Approx bounds: lat 12.8–13.2, lng 77.4–77.8
    const isInsideBangalore = (pt) => {
        return (
            pt.lat >= 12.8 && pt.lat <= 13.2 &&
            pt.lng >= 77.4 && pt.lng <= 77.8
        );
    };

    if (!isInsideBangalore(origin) || !isInsideBangalore(destination)) {
        return res.status(400).json({ error: "Routing is currently supported only within Bengaluru city bounds." });
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
        const evaluatedRoutes = await Promise.all(routes.map(async (route, idx) => {
            const decodedCoords = polyline.decode(route.geometry).map(pt => ({ lat: pt[0], lng: pt[1] })); // [lat, lng]
            // Pass the raw OSRM route as well so we can factor in traffic density (via speed)
            const riskStats = await calculateDetailedRisk(decodedCoords, route);

            // --- Weighted safety score (0–100) ---
            // Explicitly combine:
            //  - crimeRateScore (from crime_statistics in DB)
            //  - userReportScore (from recent user reports table)
            //  - infrastructureScore (streetlights, police, hospitals, CCTV)
            // into a single 0–100 safety score.
            const CRIME_MAX = 40; // cap used when computing crimeRateScore
            const USER_MAX = 30;  // cap used when computing userReportScore
            const INFRA_MAX = 20; // cap used when computing infrastructureScore

            const crimeRisk = Math.min(1, (riskStats.crimeRateScore || 0) / CRIME_MAX);        // 0 = no crime, 1 = very high
            const userRisk = Math.min(1, (riskStats.userReportScore || 0) / USER_MAX);         // 0 = no incidents, 1 = many recent incidents
            const infraSafety = Math.min(1, (riskStats.infrastructureScore || 0) / INFRA_MAX); // 0 = no infra, 1 = dense infra

            // Convert to components where higher is better
            const crimeComponent = 1 - crimeRisk; // more crime ⇒ lower value
            const userComponent = 1 - userRisk;   // more incidents ⇒ lower value
            const infraComponent = infraSafety;   // more infra ⇒ higher value

            // Final score: weighted average in [0, 100]
            //  - 50% weight: infrastructure density (streetlights, police, hospitals, CCTV)
            //  - 30% weight: official crime statistics from DB
            //  - 20% weight: user-reported incidents along the route
            let rawScore = 100 * (
                0.5 * infraComponent +
                0.3 * crimeComponent +
                0.2 * userComponent
            );

            rawScore = Math.max(0, Math.min(100, rawScore));
            const score = parseFloat(rawScore.toFixed(0));

            // Debug log to see how OSRM routes differ and how safety reacts to DB data
            console.log('[RouteCandidate]', {
                idx,
                distanceKm: (route.distance / 1000).toFixed(2),
                durationMin: (route.duration / 60).toFixed(1),
                safetyScore: score,
                crimeRateScore: riskStats.crimeRateScore,
                userReportScore: riskStats.userReportScore,
                infrastructureScore: riskStats.infrastructureScore,
                trafficRiskScore: riskStats.trafficRiskScore,
                userIncidents: riskStats.details?.userIncidents,
                policeStations: riskStats.details?.policeStations,
                hospitals: riskStats.details?.hospitals,
                streetlights: riskStats.details?.streetlights,
                cctvCameras: riskStats.details?.cctvCameras
            });

            return {
                route,
                coords: decodedCoords,
                score,
                stats: riskStats
            };
        }));

        // 3. Select Best Route
        // Safest: Highest Score
        // Shortest: Lowest Duration (OSRM returns index 0 as shortest usually, but we check duration)

        let bestRoute;
        if (mode === 'safest') {
            // Primary: sort by safetyScore (higher is safer)
            evaluatedRoutes.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;

                // Tie-breaker 1: lower traffic risk is safer
                const aTraffic = a.stats?.trafficRiskScore ?? 0;
                const bTraffic = b.stats?.trafficRiskScore ?? 0;
                if (aTraffic !== bTraffic) return aTraffic - bTraffic;

                // Tie-breaker 2: if everything else is identical, slightly prefer
                // the route with more distance (often more detour / away from main roads)
                // as a weak proxy for safety when data is flat.
                return b.route.distance - a.route.distance;
            });
            bestRoute = evaluatedRoutes[0];
        } else {
            // Fastest: strictly lowest duration (time)
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
                2000 -- 2km buffer around the route for safety infrastructure (police, hospitals, lights, CCTV)
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
