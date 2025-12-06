const db = require('../config/db');
const seedInfrastructure = require('./seedInfrastructure');
const seedCrimeStatistics = require('./seedCrimeStats');

const initSchema = async () => {
    const client = await db.pool.connect();
    try {
        console.log('Initializing Database Schema...');

        // 1. Enable PostGIS
        await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');

        // 2. Categories Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS categories (
                key TEXT PRIMARY KEY,
                label TEXT NOT NULL
            );
        `);

        // Seed Categories if empty
        const catCount = await client.query('SELECT count(*) FROM categories');
        if (catCount.rows[0].count === '0') {
            await client.query(`
                INSERT INTO categories (key, label) VALUES 
                ('pothole', 'Pothole'),
                ('accident', 'Accident'),
                ('robbery', 'Robbery'),
                ('harassment', 'Harassment'),
                ('lighting', 'Poor Lighting'),
                ('theft', 'Theft');
            `);
            console.log('Seeded categories.');
        }

        // 3. Reports Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                category TEXT NOT NULL REFERENCES categories(key),
                severity SMALLINT NOT NULL CHECK (severity >=1 AND severity <=5),
                description TEXT,
                reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                user_id TEXT, 
                location geography(Point, 4326),
                verified BOOLEAN DEFAULT FALSE
            );
        `);

        // 4. Spatial Index
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_reports_location ON reports USING GIST (location);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_reports_reported_at ON reports (reported_at);
        `);

        // 5. Divisions Table (Bengaluru Police Divisions)
        await client.query(`
            CREATE TABLE IF NOT EXISTS divisions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                center_lat DOUBLE PRECISION,
                center_lng DOUBLE PRECISION,
                crime_rate_2023 INTEGER DEFAULT 0,
                population_estimate INTEGER
            );
        `);

        // Seed Divisions
        const divCount = await client.query('SELECT count(*) FROM divisions');
        if (divCount.rows[0].count === '0') {
            await client.query(`
                INSERT INTO divisions (id, name, center_lat, center_lng, crime_rate_2023, population_estimate) VALUES 
                ('central', 'Central Division', 12.9716, 77.5946, 1126, 800000),
                ('west', 'West Division', 12.9698, 77.5350, 1941, 900000),
                ('north', 'North Division', 13.0358, 77.5970, 3260, 950000),
                ('south', 'South Division', 12.9141, 77.6064, 2094, 850000),
                ('east', 'East Division', 12.9719, 77.6412, 1994, 800000),
                ('northeast', 'North East Division', 13.0475, 77.6404, 1917, 750000),
                ('southeast', 'South East Division', 12.8988, 77.6382, 2674, 850000),
                ('whitefield', 'Whitefield Division', 12.9698, 77.7499, 2562, 700000);
            `);
            console.log('Seeded divisions.');
        }

        // 6. Infrastructure Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS infrastructure (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('police', 'hospital', 'cctv', 'streetlight')),
                division_id TEXT REFERENCES divisions(id),
                location geography(Point, 4326),
                metadata JSONB
            );
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_infrastructure_location ON infrastructure USING GIST (location);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_infrastructure_type ON infrastructure (type);
        `);

        // 7. Crime Statistics Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS crime_statistics (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                division_id TEXT REFERENCES divisions(id),
                crime_type TEXT NOT NULL,
                year INTEGER NOT NULL,
                reported INTEGER DEFAULT 0,
                detected INTEGER DEFAULT 0,
                severity_weight DOUBLE PRECISION DEFAULT 1.0
            );
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_crime_stats_division_year ON crime_statistics (division_id, year);
        `);

        console.log('Schema Initialization Complete ✅');

        // Seed data
        await seedInfrastructure();
        await seedCrimeStatistics();

    } catch (err) {
        console.error('Error initializing schema:', err);
    } finally {
        client.release();
    }
};

module.exports = initSchema;
