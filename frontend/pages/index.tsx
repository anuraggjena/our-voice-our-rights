// frontend/pages/index.tsx
import { useState, useEffect } from 'react';
import Head from 'next/head';
import type { GetStaticProps, NextPage } from 'next';

// --- Configuration ---
// !! PASTE YOUR PUBLIC API URL FROM THE "PORTS" TAB HERE
// !! Make sure it ends WITH the port number but WITHOUT a /
const API_BASE_URL = 'https://unearthly-corpse-4jq75ww7jq6j27pww-3001.app.github.dev'; 
// ---------------------

// --- Type Definitions ---
type HomeProps = {
  districts: string[];
};

type MetricCardProps = {
  icon: string;
  title: string;
  text: string;
};

// This is the shape of our formatted data for the UI
type FormattedData = {
  demand: string;
  completed_100: string;
  women: string;
  avg_wage: string;
  works: string;
  payments: string;
};

// This is the shape of the raw data from our API
type ApiDataResponse = {
  current: {
    demand_fulfillment_pct: number;
    completed_100_days: number;
    women_participation_pct: number;
    avg_wage_rate: string; // It's a string because we formatted it to 2 decimals
    works_completed: number;
    payments_on_time_pct: string; // Also a string
  }
};
// ------------------------

// This function runs on the server to get the district list
export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/districts`);
    const districts: string[] = await res.json();
    return {
      props: { districts },
      revalidate: 3600, // Re-fetch the list every hour
    };
  } catch (error) {
    console.error("Failed to fetch districts:", error);
    return { props: { districts: [] } };
  }
};

// This is our simple metric card component
function MetricCard({ icon, title, text }: MetricCardProps) {
  return (
    <div className="card">
      <span className="icon">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

// This is our main page
const Home: NextPage<HomeProps> = ({ districts }) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [data, setData] = useState<FormattedData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState<boolean>(false);

  // Fetch data when district changes
  useEffect(() => {
    if (!selectedDistrict) {
      setData(null);
      setError(null);
      return;
    }

    async function fetchData() {
      setLoading(true);
      setData(null);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/performance/${selectedDistrict}`);
        if (!res.ok) {
          throw new Error('Could not find data for this district.');
        }
        
        const apiData: ApiDataResponse = await res.json();
        
        // Translate complex data into simple sentences
        const formatted: FormattedData = {
          demand: `For every 100 people who asked for work, ${Math.round(apiData.current.demand_fulfillment_pct)} people got it.`,
          completed_100: `${apiData.current.completed_100_days.toLocaleString('en-IN')} families completed their full 100 days of work.`,
          women: `Out of every 10 workers, ${Math.round(apiData.current.women_participation_pct / 10)} are women.`,
          avg_wage: `The average wage paid for a day of work was ₹${apiData.current.avg_wage_rate}.`,
          works: `${apiData.current.works_completed.toLocaleString('en-IN')} projects have been completed.`,
          payments: `${apiData.current.payments_on_time_pct}% of payments were made within 15 days.`
        };
        setData(formatted);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedDistrict]);

  // NEW BONUS: Geolocation handler
    const handleLocateMeClick = () => {
        if (!navigator.geolocation) {
            setError("Your browser does not support geolocation.");
            return;
        }

        setLocating(true); // Show "Locating..." message
        setError(null);

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;

            try {
                // Call our new backend endpoint
                const res = await fetch(`${API_BASE_URL}/api/locate-district?lat=${latitude}&lon=${longitude}`);
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Could not find location.");
                }

                // SUCCESS! Set the dropdown, which will trigger the useEffect
                setSelectedDistrict(data.district_name);

            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError("An unknown location error occurred.");
                }
            } finally {
                setLocating(false); // Hide "Locating..." message
            }
        }, (err) => {
            // This runs if the user clicks "Block"
            setError("Could not get location. Please grant permission.");
            setLocating(false);
        });
    };

  // Typed event handler for the select dropdown
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDistrict(e.target.value);
  };

  return (
    <div className="container">
      <Head>
        <title>Our Voice, Our Rights</title>
        <meta name="description" content="MGNREGA Performance Dashboard" />
      </Head>

      <header>
        <h1>Our Voice, Our Rights</h1>
        <p>MGNREGA Performance for <strong>Uttar Pradesh</strong></p>
      </header>

      <main>
        <div className="selector-box gap-2">
          <label htmlFor="district-select">Select your District (अपना जिला चुनें)</label>
          <select
            id="district-select"
            value={selectedDistrict}
            onChange={handleSelectChange}
          >
            <option value="">-- Select --</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <button 
            onClick={handleLocateMeClick} 
            disabled={locating}
            style={{marginLeft: '1rem', cursor: 'pointer', fontSize: '1rem', padding: '0.5rem 1rem'}}
          >
              {locating ? 'Locating...' : '📍 Use My Location (मेरी जगह)'}
          </button>
        </div>

        <div className="results-box">
          {loading && <p className="message">Loading...</p>}

          {error && <p className="message error">{error}</p>}

          {!loading && !data && !error && (
            <div className="empty-state">
              <span className="sparkle">✨</span>
              <p>Please select your district to see the MGNREGA report.</p>
              <p>(कृपया रिपोर्ट देखने के लिए अपना जिला चुनें।)</p>
            </div>
          )}

          {data && (
            <div className="card-grid">
              <MetricCard
                icon="👷"
                title="Work Demand (काम की मांग)"
                text={data.demand}
              />
              <MetricCard
                icon="📅"
                title="100-Day Guarantee (100 दिन का काम)"
                text={data.completed_100}
              />
              <MetricCard
                icon="👩"
                title="Women's Participation (महिला भागीदारी)"
                text={data.women}
              />
              <MetricCard
                icon="💰"
                title="Average Wage (औसत मज़दूरी)"
                text={data.avg_wage}
              />
              <MetricCard
                icon="🏗️"
                title="Works Completed (काम पूरा हुआ)"
                text={data.works}
              />
              <MetricCard
                icon="✅"
                title="On-Time Payments (समय पर भुगतान)"
                text={data.payments}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;