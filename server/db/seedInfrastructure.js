const db = require('../config/db');

const seedInfrastructure = async () => {
    const client = await db.pool.connect();
    try {
        console.log('Seeding Infrastructure Data...');

        // Check what infrastructure already exists so we can add new types (streetlights)
        const baseCountRes = await client.query("SELECT COUNT(*) FROM infrastructure WHERE type IN ('police','hospital')");
        const streetlightCountRes = await client.query("SELECT COUNT(*) FROM infrastructure WHERE type = 'streetlight'");
        const hasBaseInfra = parseInt(baseCountRes.rows[0].count, 10) > 0;
        const hasStreetlights = parseInt(streetlightCountRes.rows[0].count, 10) > 0;

        // Police Stations across Bengaluru divisions
        const policeStations = [
            // Central Division
            { name: 'Cubbon Park Police Station', type: 'police', division_id: 'central', lat: 12.9760, lng: 77.5925 },
            { name: 'Halasuru Police Station', type: 'police', division_id: 'central', lat: 12.9761, lng: 77.6140 },
            { name: 'High Grounds Police Station', type: 'police', division_id: 'central', lat: 12.9906, lng: 77.5846 },
            
            // West Division
            { name: 'Rajajinagar Police Station', type: 'police', division_id: 'west', lat: 12.9906, lng: 77.5522 },
            { name: 'Vijayanagar Police Station', type: 'police', division_id: 'west', lat: 12.9698, lng: 77.5350 },
            { name: 'Mahalakshmi Layout Police Station', type: 'police', division_id: 'west', lat: 12.9779, lng: 77.5163 },
            
            // North Division
            { name: 'Yelahanka Police Station', type: 'police', division_id: 'north', lat: 13.1007, lng: 77.5963 },
            { name: 'Hebbal Police Station', type: 'police', division_id: 'north', lat: 13.0358, lng: 77.5970 },
            { name: 'Jalahalli Police Station', type: 'police', division_id: 'north', lat: 13.0385, lng: 77.5404 },
            
            // South Division
            { name: 'Jayanagar Police Station', type: 'police', division_id: 'south', lat: 12.9250, lng: 77.5838 },
            { name: 'Banashankari Police Station', type: 'police', division_id: 'south', lat: 12.9141, lng: 77.5738 },
            { name: 'JP Nagar Police Station', type: 'police', division_id: 'south', lat: 12.9057, lng: 77.5854 },
            
            // East Division
            { name: 'CV Raman Nagar Police Station', type: 'police', division_id: 'east', lat: 12.9888, lng: 77.6554 },
            { name: 'Marathahalli Police Station', type: 'police', division_id: 'east', lat: 12.9591, lng: 77.6975 },
            { name: 'Varthur Police Station', type: 'police', division_id: 'east', lat: 12.9352, lng: 77.7496 },
            
            // North East Division
            { name: 'Banaswadi Police Station', type: 'police', division_id: 'northeast', lat: 13.0118, lng: 77.6503 },
            { name: 'RT Nagar Police Station', type: 'police', division_id: 'northeast', lat: 13.0247, lng: 77.6024 },
            { name: 'KR Puram Police Station', type: 'police', division_id: 'northeast', lat: 13.0117, lng: 77.6956 },
            
            // South East Division
            { name: 'Koramangala Police Station', type: 'police', division_id: 'southeast', lat: 12.9352, lng: 77.6245 },
            { name: 'HSR Layout Police Station', type: 'police', division_id: 'southeast', lat: 12.9116, lng: 77.6397 },
            { name: 'Electronic City Police Station', type: 'police', division_id: 'southeast', lat: 12.8456, lng: 77.6603 },
            
            // Whitefield Division
            { name: 'Whitefield Police Station', type: 'police', division_id: 'whitefield', lat: 12.9698, lng: 77.7499 },
            { name: 'Kadugodi Police Station', type: 'police', division_id: 'whitefield', lat: 12.9989, lng: 77.7517 },
            { name: 'Varthur Police Station', type: 'police', division_id: 'whitefield', lat: 12.9352, lng: 77.7496 }
        ];

        // Major Hospitals
        const hospitals = [
            // Central
            { name: 'Bowring and Lady Curzon Hospital', type: 'hospital', division_id: 'central', lat: 12.9844, lng: 77.6067 },
            { name: 'Mallya Hospital', type: 'hospital', division_id: 'central', lat: 12.9849, lng: 77.6001 },
            
            // West
            { name: 'MS Ramaiah Hospital', type: 'hospital', division_id: 'west', lat: 13.0291, lng: 77.5656 },
            { name: 'Columbia Asia Hospital Yeshwanthpur', type: 'hospital', division_id: 'west', lat: 13.0202, lng: 77.5381 },
            
            // North
            { name: 'Columbia Asia Hospital Hebbal', type: 'hospital', division_id: 'north', lat: 13.0358, lng: 77.5970 },
            { name: 'Sanjay Gandhi Hospital', type: 'hospital', division_id: 'north', lat: 13.0865, lng: 77.5904 },
            
            // South
            { name: 'Manipal Hospital Jayanagar', type: 'hospital', division_id: 'south', lat: 12.9250, lng: 77.5838 },
            { name: 'Fortis Hospital Bannerghatta', type: 'hospital', division_id: 'south', lat: 12.8878, lng: 77.5937 },
            { name: 'Apollo Hospital Bannerghatta', type: 'hospital', division_id: 'south', lat: 12.8878, lng: 77.5937 },
            
            // East
            { name: 'Manipal Hospital Whitefield', type: 'hospital', division_id: 'east', lat: 12.9698, lng: 77.7499 },
            { name: 'Columbia Asia Hospital Sarjapur', type: 'hospital', division_id: 'east', lat: 12.9091, lng: 77.7373 },
            
            // North East
            { name: 'Columbia Asia Hospital Hebbal', type: 'hospital', division_id: 'northeast', lat: 13.0475, lng: 77.6404 },
            { name: 'Aster CMI Hospital', type: 'hospital', division_id: 'northeast', lat: 13.0141, lng: 77.6398 },
            
            // South East
            { name: 'St Johns Medical College Hospital', type: 'hospital', division_id: 'southeast', lat: 12.9352, lng: 77.6245 },
            { name: 'Narayana Multispeciality Hospital', type: 'hospital', division_id: 'southeast', lat: 12.9116, lng: 77.6397 },
            
            // Whitefield
            { name: 'Manipal Hospital Whitefield', type: 'hospital', division_id: 'whitefield', lat: 12.9698, lng: 77.7499 },
            { name: 'Vydehi Institute of Medical Sciences', type: 'hospital', division_id: 'whitefield', lat: 13.0669, lng: 77.7564 }
        ];

        // Streetlights along key corridors (for density)
        const streetlights = [
            // Central business district
            { name: 'MG Road Streetlights', type: 'streetlight', division_id: 'central', lat: 12.9755, lng: 77.6050 },
            { name: 'Brigade Road Streetlights', type: 'streetlight', division_id: 'central', lat: 12.9733, lng: 77.6086 },
            { name: 'Church Street Streetlights', type: 'streetlight', division_id: 'central', lat: 12.9752, lng: 77.6033 },
            // South East
            { name: 'Koramangala 100ft Road Lights', type: 'streetlight', division_id: 'southeast', lat: 12.9350, lng: 77.6240 },
            { name: 'HSR BDA Complex Lights', type: 'streetlight', division_id: 'southeast', lat: 12.9108, lng: 77.6385 },
            // South
            { name: 'Jayanagar Main Road Lights', type: 'streetlight', division_id: 'south', lat: 12.9255, lng: 77.5835 },
            // East / Whitefield
            { name: 'Outer Ring Road Bellandur Lights', type: 'streetlight', division_id: 'east', lat: 12.9358, lng: 77.6890 },
            { name: 'Whitefield Main Road Lights', type: 'streetlight', division_id: 'whitefield', lat: 12.9695, lng: 77.7505 },
            // North
            { name: 'Hebbal Flyover Lights', type: 'streetlight', division_id: 'north', lat: 13.0350, lng: 77.5975 },
            { name: 'Yeshwanthpur Tumkur Road Lights', type: 'streetlight', division_id: 'west', lat: 13.0185, lng: 77.5500 }
        ];

        if (!hasBaseInfra) {
            // Insert Police Stations
            for (const ps of policeStations) {
                await client.query(
                    `INSERT INTO infrastructure (name, type, division_id, location, metadata) 
                     VALUES ($1, $2, $3, ST_GeographyFromText($4), $5)`,
                    [ps.name, ps.type, ps.division_id, `POINT(${ps.lng} ${ps.lat})`, JSON.stringify({ operational: true })]
                );
            }

            // Insert Hospitals
            for (const hospital of hospitals) {
                await client.query(
                    `INSERT INTO infrastructure (name, type, division_id, location, metadata) 
                     VALUES ($1, $2, $3, ST_GeographyFromText($4), $5)`,
                    [hospital.name, hospital.type, hospital.division_id, `POINT(${hospital.lng} ${hospital.lat})`, JSON.stringify({ emergency: true })]
                );
            }

            console.log(`Seeded ${policeStations.length} police stations and ${hospitals.length} hospitals ✅`);
        } else {
            console.log('Police stations and hospitals already present, skipping base infra seed.');
        }

        if (!hasStreetlights) {
            for (const light of streetlights) {
                await client.query(
                    `INSERT INTO infrastructure (name, type, division_id, location, metadata) 
                     VALUES ($1, $2, $3, ST_GeographyFromText($4), $5)`,
                    [light.name, light.type, light.division_id, `POINT(${light.lng} ${light.lat})`, JSON.stringify({})]
                );
            }
            console.log(`Seeded ${streetlights.length} streetlight clusters ✅`);
        } else {
            console.log('Streetlights already present, skipping streetlight seed.');
        }
    } catch (err) {
        console.error('Error seeding infrastructure:', err);
    } finally {
        client.release();
    }
};

module.exports = seedInfrastructure;
