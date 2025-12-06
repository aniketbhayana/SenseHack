const db = require('../config/db');

const seedCrimeStatistics = async () => {
    const client = await db.pool.connect();
    try {
        console.log('Seeding Crime Statistics Data...');

        // Check if already seeded
        const count = await client.query('SELECT COUNT(*) FROM crime_statistics');
        if (parseInt(count.rows[0].count) > 0) {
            console.log('Crime statistics already seeded, skipping.');
            return;
        }

        // Crime data from Bengaluru City Police 2023
        // Division-wise cyber crime data from PDF
        const crimeData2023 = [
            // Central Division
            { division_id: 'central', crime_type: 'Cyber Crime', year: 2023, reported: 1126, detected: 69, severity_weight: 2.0 },
            { division_id: 'central', crime_type: 'Murder', year: 2023, reported: 26, detected: 25, severity_weight: 10.0 },
            { division_id: 'central', crime_type: 'Robbery', year: 2023, reported: 84, detected: 55, severity_weight: 7.0 },
            { division_id: 'central', crime_type: 'Chain Snatching', year: 2023, reported: 19, detected: 14, severity_weight: 6.0 },
            { division_id: 'central', crime_type: 'House Burglary Day', year: 2023, reported: 33, detected: 15, severity_weight: 5.0 },
            { division_id: 'central', crime_type: 'House Burglary Night', year: 2023, reported: 110, detected: 33, severity_weight: 7.0 },
            
            // West Division
            { division_id: 'west', crime_type: 'Cyber Crime', year: 2023, reported: 1941, detected: 47, severity_weight: 2.0 },
            { division_id: 'west', crime_type: 'Murder', year: 2023, reported: 26, detected: 25, severity_weight: 10.0 },
            { division_id: 'west', crime_type: 'Robbery', year: 2023, reported: 84, detected: 55, severity_weight: 7.0 },
            { division_id: 'west', crime_type: 'Chain Snatching', year: 2023, reported: 19, detected: 14, severity_weight: 6.0 },
            { division_id: 'west', crime_type: 'House Burglary Day', year: 2023, reported: 33, detected: 15, severity_weight: 5.0 },
            
            // North Division
            { division_id: 'north', crime_type: 'Cyber Crime', year: 2023, reported: 3260, detected: 238, severity_weight: 2.0 },
            { division_id: 'north', crime_type: 'Murder', year: 2023, reported: 26, detected: 25, severity_weight: 10.0 },
            { division_id: 'north', crime_type: 'Robbery', year: 2023, reported: 84, detected: 55, severity_weight: 7.0 },
            { division_id: 'north', crime_type: 'Chain Snatching', year: 2023, reported: 19, detected: 14, severity_weight: 6.0 },
            
            // South Division
            { division_id: 'south', crime_type: 'Cyber Crime', year: 2023, reported: 2094, detected: 224, severity_weight: 2.0 },
            { division_id: 'south', crime_type: 'Murder', year: 2023, reported: 26, detected: 25, severity_weight: 10.0 },
            { division_id: 'south', crime_type: 'Robbery', year: 2023, reported: 84, detected: 55, severity_weight: 7.0 },
            { division_id: 'south', crime_type: 'Chain Snatching', year: 2023, reported: 19, detected: 14, severity_weight: 6.0 },
            { division_id: 'south', crime_type: 'House Burglary Day', year: 2023, reported: 33, detected: 15, severity_weight: 5.0 },
            
            // East Division
            { division_id: 'east', crime_type: 'Cyber Crime', year: 2023, reported: 1994, detected: 129, severity_weight: 2.0 },
            { division_id: 'east', crime_type: 'Murder', year: 2023, reported: 26, detected: 25, severity_weight: 10.0 },
            { division_id: 'east', crime_type: 'Robbery', year: 2023, reported: 84, detected: 55, severity_weight: 7.0 },
            { division_id: 'east', crime_type: 'Chain Snatching', year: 2023, reported: 19, detected: 14, severity_weight: 6.0 },
            
            // North East Division
            { division_id: 'northeast', crime_type: 'Cyber Crime', year: 2023, reported: 1917, detected: 201, severity_weight: 2.0 },
            { division_id: 'northeast', crime_type: 'Murder', year: 2023, reported: 26, detected: 25, severity_weight: 10.0 },
            { division_id: 'northeast', crime_type: 'Robbery', year: 2023, reported: 84, detected: 55, severity_weight: 7.0 },
            { division_id: 'northeast', crime_type: 'Chain Snatching', year: 2023, reported: 19, detected: 14, severity_weight: 6.0 },
            
            // South East Division
            { division_id: 'southeast', crime_type: 'Cyber Crime', year: 2023, reported: 2674, detected: 298, severity_weight: 2.0 },
            { division_id: 'southeast', crime_type: 'Murder', year: 2023, reported: 26, detected: 25, severity_weight: 10.0 },
            { division_id: 'southeast', crime_type: 'Robbery', year: 2023, reported: 84, detected: 55, severity_weight: 7.0 },
            { division_id: 'southeast', crime_type: 'Chain Snatching', year: 2023, reported: 19, detected: 14, severity_weight: 6.0 },
            
            // Whitefield Division
            { division_id: 'whitefield', crime_type: 'Cyber Crime', year: 2023, reported: 2562, detected: 55, severity_weight: 2.0 },
            { division_id: 'whitefield', crime_type: 'Murder', year: 2023, reported: 26, detected: 25, severity_weight: 10.0 },
            { division_id: 'whitefield', crime_type: 'Robbery', year: 2023, reported: 84, detected: 55, severity_weight: 7.0 },
            { division_id: 'whitefield', crime_type: 'Chain Snatching', year: 2023, reported: 19, detected: 14, severity_weight: 6.0 }
        ];

        // Aggregated city-wide crimes from PDF - 2023 totals
        const cityWideCrimes2023 = [
            { crime_type: 'Murder', reported: 205, detected: 200, severity_weight: 10.0 },
            { crime_type: 'Dacoity', reported: 36, detected: 34, severity_weight: 9.0 },
            { crime_type: 'Robbery', reported: 673, detected: 437, severity_weight: 7.0 },
            { crime_type: 'Chain Snatching', reported: 153, detected: 114, severity_weight: 6.0 },
            { crime_type: 'House Burglary Day', reported: 265, detected: 118, severity_weight: 5.0 },
            { crime_type: 'House Burglary Night', reported: 879, detected: 264, severity_weight: 7.0 },
            { crime_type: 'House Theft', reported: 1692, detected: 376, severity_weight: 4.0 },
            { crime_type: 'Vehicle Theft', reported: 5909, detected: 1437, severity_weight: 3.0 },
            { crime_type: 'Ordinary Theft', reported: 2493, detected: 480, severity_weight: 2.0 }
        ];

        // Insert division-specific data
        for (const stat of crimeData2023) {
            await client.query(
                `INSERT INTO crime_statistics (division_id, crime_type, year, reported, detected, severity_weight) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [stat.division_id, stat.crime_type, stat.year, stat.reported, stat.detected, stat.severity_weight]
            );
        }

        // Distribute city-wide crimes proportionally across divisions
        const divisions = ['central', 'west', 'north', 'south', 'east', 'northeast', 'southeast', 'whitefield'];
        const divisionWeights = {
            'central': 0.10,
            'west': 0.15,
            'north': 0.18,
            'south': 0.14,
            'east': 0.13,
            'northeast': 0.12,
            'southeast': 0.15,
            'whitefield': 0.13
        };

        for (const crime of cityWideCrimes2023) {
            for (const div of divisions) {
                const weight = divisionWeights[div];
                await client.query(
                    `INSERT INTO crime_statistics (division_id, crime_type, year, reported, detected, severity_weight) 
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        div,
                        crime.crime_type,
                        2023,
                        Math.floor(crime.reported * weight),
                        Math.floor(crime.detected * weight),
                        crime.severity_weight
                    ]
                );
            }
        }

        console.log('Seeded crime statistics for 2023 ✅');
    } catch (err) {
        console.error('Error seeding crime statistics:', err);
    } finally {
        client.release();
    }
};

module.exports = seedCrimeStatistics;
