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
        const total = await db.query('SELECT count(*) FROM reports');
        const byCat = await db.query('SELECT category, count(*) FROM reports GROUP BY category');

        // Mock hotspots/recent for MVP to avoid complex query right now
        const stats = {
            totalReports: parseInt(total.rows[0].count),
            recentReports: 0,
            hotspots: [],
            byCategory: byCat.rows.reduce((acc, r) => ({ ...acc, [r.category]: parseInt(r.count) }), {})
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
