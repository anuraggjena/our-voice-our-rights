// server.js
require('dotenv').config(); // Load environment variables
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
// Codespaces exposes port 3001, so we'll use that.
const port = 3001; 

// Enable CORS for all routes
app.use(cors());

// Connect to our local database
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mgnrega_db',
    password: 'mysecretpassword',
    port: 5432,
});

// API endpoint to get all districts
app.get('/api/districts', async (req, res) => {
    try {
        const data = await pool.query('SELECT district_name FROM districts ORDER BY district_name ASC');
        const districtNames = data.rows.map(row => row.district_name);
        res.json(districtNames);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// API endpoint to get data for a specific district
app.get('/api/performance/:districtName', async (req, res) => {
    const { districtName } = req.params;
    
    try {
        // Get the latest data for the district
        const dataRes = await pool.query(
            `SELECT * FROM performance_data pd
             JOIN districts d ON pd.district_id = d.id
             WHERE d.district_name = $1
             ORDER BY pd.financial_year DESC, pd.month_name DESC
             LIMIT 1;`, // Get just the latest month's data
            [districtName]
        );

        if (dataRes.rows.length === 0) {
            return res.status(404).json({ error: 'No data found for this district.' });
        }
        
        const latest = dataRes.rows[0];
        
        // Helper to avoid divide-by-zero
        const calculate_pct = (numerator, denominator) => {
            if (!denominator || Number(denominator) === 0) return 0;
            return (Number(numerator) / Number(denominator)) * 100;
        };

        const formattedData = {
            district: latest.district_name,
            latest_month: `${latest.month_name} ${latest.financial_year}`,
            current: {
                demand_fulfillment_pct: calculate_pct(latest.households_provided_work, latest.households_demanded_work),
                completed_100_days: latest.households_completed_100_days,
                women_participation_pct: calculate_pct(latest.women_persondays, latest.total_persondays),
                avg_wage_rate: Number(latest.avg_wage_rate).toFixed(2), // Format to 2 decimal places
                works_completed: latest.works_completed,
                payments_on_time_pct: Number(latest.payments_on_time_pct).toFixed(2) // Format to 2 decimal places
            }
        };
        
        res.json(formattedData);

    } catch (error) {
        console.error('API error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// NEW BONUS: Geolocation endpoint
app.get('/api/locate-district', async (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({ error: 'Missing lat or lon parameters.' });
    }

    try {
        // 1. Call Nominatim (a free, open reverse geocoder)
        // We MUST send a custom User-Agent, as per their policy.
        const userAgent = 'OurVoiceOurRights/1.0 (anurag.jena@example.com)'; // Change to your email
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

        // We already installed axios, so we can re-use it.
        // We need to 'require' it at the top of the file.
        // (This is a bit of a hack, but works for this single file)
        const axios = require('axios'); 

        const nominatimRes = await axios.get(nominatimUrl, {
            headers: { 'User-Agent': userAgent }
        });

        // 2. Find the district name from the response
        // In Uttar Pradesh, Nominatim often calls the district 'county' or 'state_district'
        const address = nominatimRes.data.address;
        const districtFromGeo = address.county || address.state_district;

        if (!districtFromGeo) {
            return res.status(404).json({ error: 'Could not determine district from this location.' });
        }

        // 3. Find the *matching* district in our database
        // This cleans up names like "Agra District" to "Agra"
        const dbRes = await pool.query(
            `SELECT district_name FROM districts WHERE district_name ILIKE $1`,
            [`%${districtFromGeo.replace(' District', '')}%`]
        );

        if (dbRes.rows.length === 0) {
            return res.status(404).json({ error: `Found location ${districtFromGeo}, but it's not in our UP database.` });
        }

        // 4. Send back our official district name
        res.json({ district_name: dbRes.rows[0].district_name });

    } catch (error) {
        console.error('Geolocation API error:', error.message);
        res.status(500).json({ error: 'Error in geolocation service.' });
    }
});

app.listen(port, () => {
    console.log(`Backend API server listening on port ${port}`);
});