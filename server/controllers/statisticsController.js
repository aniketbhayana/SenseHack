const db = require('../config/db');

// Get crime statistics for a specific division
exports.getDivisionStats = async (req, res) => {
    const { division } = req.params;
    
    try {
        // Get division info
        const divisionQuery = `
            SELECT id, name, center_lat, center_lng, crime_rate_2023, population_estimate
            FROM divisions
            WHERE id = $1
        `;
        const divisionRes = await db.query(divisionQuery, [division]);
        
        if (divisionRes.rows.length === 0) {
            return res.status(404).json({ error: 'Division not found' });
        }
        
        // Get crime statistics
        const crimeQuery = `
            SELECT crime_type, SUM(reported) as total_reported, SUM(detected) as total_detected, 
                   AVG(severity_weight) as avg_severity
            FROM crime_statistics
            WHERE division_id = $1 AND year = 2023
            GROUP BY crime_type
            ORDER BY total_reported DESC
        `;
        const crimeRes = await db.query(crimeQuery, [division]);
        
        // Get infrastructure count
        const infraQuery = `
            SELECT type, COUNT(*) as count
            FROM infrastructure
            WHERE division_id = $1
            GROUP BY type
        `;
        const infraRes = await db.query(infraQuery, [division]);
        
        res.json({
            division: divisionRes.rows[0],
            crimeStats: crimeRes.rows,
            infrastructure: infraRes.rows
        });
    } catch (err) {
        console.error('Error fetching division stats:', err);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
};

// Get all divisions with summary
exports.getAllDivisions = async (req, res) => {
    try {
        const query = `
            SELECT 
                d.id, 
                d.name, 
                d.center_lat, 
                d.center_lng, 
                d.crime_rate_2023, 
                d.population_estimate,
                COUNT(DISTINCT cs.crime_type) as crime_types,
                SUM(cs.reported) as total_crimes_2023
            FROM divisions d
            LEFT JOIN crime_statistics cs ON d.id = cs.division_id AND cs.year = 2023
            GROUP BY d.id, d.name, d.center_lat, d.center_lng, d.crime_rate_2023, d.population_estimate
            ORDER BY d.crime_rate_2023 DESC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching divisions:', err);
        res.status(500).json({ error: 'Failed to fetch divisions' });
    }
};

// Find nearby infrastructure (police stations, hospitals)
exports.getNearbyInfrastructure = async (req, res) => {
    const { lat, lng, type, radius = 2000 } = req.query;
    
    if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude required' });
    }
    
    try {
        const point = `POINT(${lng} ${lat})`;
        let query = `
            SELECT 
                id, 
                name, 
                type, 
                division_id,
                ST_Y(location::geometry) as lat,
                ST_X(location::geometry) as lng,
                ST_Distance(location, ST_GeographyFromText($1)) as distance_meters,
                metadata
            FROM infrastructure
            WHERE ST_DWithin(location, ST_GeographyFromText($1), $2)
        `;
        
        const params = [point, radius];
        
        if (type) {
            query += ` AND type = $3`;
            params.push(type);
        }
        
        query += ` ORDER BY distance_meters LIMIT 20`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error finding nearby infrastructure:', err);
        res.status(500).json({ error: 'Failed to find infrastructure' });
    }
};

// Generate heatmap data for crime intensity
exports.getHeatmapData = async (req, res) => {
    const { bounds } = req.query; // Expected: "minLat,minLng,maxLat,maxLng"
    
    try {
        // If bounds provided, filter by bounding box
        let query = `
            SELECT 
                ST_Y(location::geometry) as lat,
                ST_X(location::geometry) as lng,
                severity as intensity
            FROM reports
            WHERE reported_at > NOW() - INTERVAL '6 months'
        `;
        
        if (bounds) {
            const [minLat, minLng, maxLat, maxLng] = bounds.split(',').map(parseFloat);
            query += ` AND ST_Y(location::geometry) BETWEEN ${minLat} AND ${maxLat}`;
            query += ` AND ST_X(location::geometry) BETWEEN ${minLng} AND ${maxLng}`;
        }
        
        query += ` LIMIT 1000`; // Limit for performance
        
        const result = await db.query(query);
        
        // Add crime statistics hotspots (division centers weighted by crime rate)
        const divQuery = `
            SELECT center_lat as lat, center_lng as lng, 
                   (crime_rate_2023 / 500.0) as intensity
            FROM divisions
        `;
        const divResult = await db.query(divQuery);
        
        res.json({
            userReports: result.rows,
            crimeHotspots: divResult.rows
        });
    } catch (err) {
        console.error('Error generating heatmap:', err);
        res.status(500).json({ error: 'Failed to generate heatmap' });
    }
};

// Get city-wide crime trends
exports.getCityTrends = async (req, res) => {
    try {
        const query = `
            SELECT 
                crime_type,
                SUM(CASE WHEN year = 2021 THEN reported ELSE 0 END) as reported_2021,
                SUM(CASE WHEN year = 2022 THEN reported ELSE 0 END) as reported_2022,
                SUM(CASE WHEN year = 2023 THEN reported ELSE 0 END) as reported_2023,
                AVG(severity_weight) as avg_severity
            FROM crime_statistics
            WHERE year IN (2021, 2022, 2023)
            GROUP BY crime_type
            ORDER BY reported_2023 DESC
            LIMIT 15
        `;
        
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching city trends:', err);
        res.status(500).json({ error: 'Failed to fetch trends' });
    }
};
