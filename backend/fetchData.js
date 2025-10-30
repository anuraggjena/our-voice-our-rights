// fetchData.js
require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const cron = require('node-cron');

// --- CONFIGURATION ---
const API_URL = process.env.DATA_GOV_API_URL;
const API_KEY = process.env.DATA_GOV_API_KEY;
const STATE_NAME = 'UTTAR PRADESH';

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mgnrega_db',
    password: 'mysecretpassword',
    port: 5432,
});
// ---------------------

async function fetchDataAndStore() {
    console.log('Starting data fetch...');
    if (!API_URL || !API_KEY) {
        console.error('Missing API_URL or API_KEY in .env file. Skipping fetch.');
        return;
    }

    try {
        // 1. Fetch data from the government API
        const response = await axios.get(API_URL, {
            params: {
                'api-key': API_KEY,
                'format': 'json',
                'filters[state_name]': STATE_NAME,
                'limit': 1000 // Get many records
            }
        });

        const records = response.data.records;
        if (!records) {
            console.log('No records found in API response.');
            return;
        }

        console.log(`Fetched ${records.length} records from the API.`);
        const client = await pool.connect();
        
        for (const record of records) {
            const distRes = await client.query('SELECT id FROM districts WHERE district_name ILIKE $1', [record.district_name]);
            
            if (distRes.rows.length === 0) {
                console.warn(`Skipping district not in our DB: ${record.district_name}`);
                continue;
            }
            
            const districtId = distRes.rows[0].id;

            // 3. Insert or Update the data (UPSERT)
            // THESE ARE NOW MAPPED TO YOUR REAL JSON FIELDS
            await client.query(
                `INSERT INTO performance_data (
                    district_id, financial_year, month_name, 
                    households_demanded_work, households_provided_work, 
                    households_completed_100_days, women_persondays, total_persondays,
                    avg_wage_rate, works_completed, payments_on_time_pct
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (district_id, financial_year, month_name) DO UPDATE SET
                    households_demanded_work = EXCLUDED.households_demanded_work,
                    households_provided_work = EXCLUDED.households_provided_work,
                    households_completed_100_days = EXCLUDED.households_completed_100_days,
                    women_persondays = EXCLUDED.women_persondays,
                    total_persondays = EXCLUDED.total_persondays,
                    avg_wage_rate = EXCLUDED.avg_wage_rate,
                    works_completed = EXCLUDED.works_completed,
                    payments_on_time_pct = EXCLUDED.payments_on_time_pct;`,
                [
                    districtId,
                    record.fin_year,
                    record.month,
                    Number(record.Total_No_of_Active_Job_Cards) || 0,
                    Number(record.Total_Households_Worked) || 0,
                    Number(record.Total_No_of_HHs_completed_100_Days_of_Wage_Employment) || 0,
                    Number(record.Women_Persondays) || 0,
                    Number(record.Persondays_of_Central_Liability_so_far) || 0,
                    Number(record.Average_Wage_rate_per_day_per_person) || 0,
                    Number(record.Number_of_Completed_Works) || 0,
                    Number(record.percentage_payments_gererated_within_15_days) || 0
                ]
            );
        }
        
        client.release();
        console.log('Data fetch and update complete.');

    } catch (error) {
        console.error('Error in data fetch job:', error);
    }
}

// Run the job every day at 2 AM
cron.schedule('0 2 * * *', () => {
    console.log('Running scheduled data fetch...');
    fetchDataAndStore();
});

// Run it once right now to get data for the first time
fetchDataAndStore();