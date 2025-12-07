const db = require('./config/db');

async function checkDivisions() {
    try {
        console.log("Checking divisions table...");
        const res = await db.query('SELECT * FROM divisions');
        console.log(`Found ${res.rows.length} divisions.`);
        console.log(res.rows);

        console.log("Checking reports table...");
        const resReports = await db.query('SELECT count(*) FROM reports');
        console.log(`Found ${resReports.rows[0].count} reports.`);

        console.log("Running risk query...");
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
                          4000
                      )
                ), 0) AS recent_reports
            FROM divisions d
        `);
        console.log("Risk Query Results:");
        console.log(divisionsRes.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

checkDivisions();
