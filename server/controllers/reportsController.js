const db = require('../config/db');

exports.getReports = async (req, res) => {
    try {
        const { bbox, limit = 500 } = req.query;
        let query = `
            SELECT 
                id, 
                category, 
                severity, 
                description, 
                reported_at, 
                ST_X(location::geometry) as lng, 
                ST_Y(location::geometry) as lat 
            FROM reports
        `;
        const params = [];

        if (bbox) {
            const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
            query += ` WHERE location && ST_MakeEnvelope($1, $2, $3, $4, 4326)`;
            params.push(minLng, minLat, maxLng, maxLat);
        }

        query += ` ORDER BY reported_at DESC LIMIT $${params.length + 1}`;
        params.push(Number(limit));

        const result = await db.query(query, params);

        // Format for frontend
        const reports = result.rows.map(row => ({
            id: row.id,
            category: row.category,
            severity: row.severity,
            description: row.description,
            reportedAt: row.reported_at,
            location: { lat: row.lat, lng: row.lng }
        }));

        res.json({ data: reports });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createReport = async (req, res) => {
    try {
        const { location, category, severity, description, userId } = req.body;

        // Basic validation
        if (!location || !location.lat || !location.lng || !category || !severity) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const query = `
            INSERT INTO reports (category, severity, description, user_id, location)
            VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography)
            RETURNING id, reported_at
        `;

        const result = await db.query(query, [
            category,
            severity,
            description || '',
            userId || null,
            location.lng,
            location.lat
        ]);

        const newReport = result.rows[0];
        res.status(201).json({
            id: newReport.id,
            reportedAt: newReport.reported_at,
            status: 'success'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.getStats = async (req, res) => {
    try {
        // Total incidents
        const totalRes = await db.query('SELECT count(*) FROM reports');

        // Incidents in the last 24 hours
        const recentRes = await db.query(
            "SELECT count(*) FROM reports WHERE reported_at > NOW() - INTERVAL '24 hours'"
        );

        // Incidents by category
        const byCatRes = await db.query('SELECT category, count(*) FROM reports GROUP BY category');

        // Top risk zones based on crime statistics and recent incidents around each division center.
        // This uses the seeded `divisions` table plus reports within ~4km in the last 30 days.
        const divisionsRes = await db.query(`
            SELECT
                d.id,
                d.name,
                d.center_lat,
                d.center_lng,
                d.crime_rate_2023,
                COALESCE((
                    SELECT COUNT(*)
                    FROM reports r
                    WHERE r.reported_at > NOW() - INTERVAL '30 days'
                      AND ST_DWithin(
                          r.location,
                          ST_GeographyFromText('POINT(' || d.center_lng || ' ' || d.center_lat || ')'),
                          4000 -- 4km radius around division center
                      )
                ), 0) AS recent_reports
            FROM divisions d
        `);

        const totalReports = parseInt(totalRes.rows[0].count, 10) || 0;
        const recentReports = parseInt(recentRes.rows[0].count, 10) || 0;

        const byCategory = byCatRes.rows.reduce((acc, r) => {
            acc[r.category] = parseInt(r.count, 10) || 0;
            return acc;
        }, {});

        const divisions = divisionsRes.rows.map(d => ({
            id: d.id,
            name: d.name,
            center_lat: parseFloat(d.center_lat),
            center_lng: parseFloat(d.center_lng),
            crimeRate: parseInt(d.crime_rate_2023, 10) || 0,
            recentReports: parseInt(d.recent_reports, 10) || 0
        }));

        const maxCrime = divisions.reduce((m, d) => Math.max(m, d.crimeRate), 0) || 1;
        const maxRecentDiv = divisions.reduce((m, d) => Math.max(m, d.recentReports), 0) || 1;

        const hotspots = divisions
            .map(d => {
                const crimeNorm = d.crimeRate / maxCrime;           // 0..1
                const recentNorm = d.recentReports / maxRecentDiv;  // 0..1
                // Weighted risk index scaled to 0–10
                const rawRisk = 10 * (0.7 * crimeNorm + 0.3 * recentNorm);
                return {
                    id: d.id,
                    name: d.name,
                    score: Number(rawRisk.toFixed(1)),
                    crimeRate: d.crimeRate,
                    recentReports: d.recentReports,
                    center: { lat: d.center_lat, lng: d.center_lng }
                };
            })
            // Filter out divisions with effectively zero risk
            .filter(h => h.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        const stats = {
            totalReports,
            recentReports,
            hotspots,
            byCategory
        };

        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const result = await db.query('SELECT key, label FROM categories');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
