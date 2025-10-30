# Our Voice, Our Rights ✊🇮🇳

## Description

This project aims to make the performance data of the **Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA)** program accessible and understandable for the common citizens of India, particularly targeting a low-literacy rural population.

Instead of complex reports, users can select their district (specifically within **Uttar Pradesh** for this version) and see key performance indicators presented in a simple, visual format with clear, jargon-free explanations. The application also includes a bonus geolocation feature to automatically detect the user's district.

This project was built as a take-home assignment.

## Key Features ✨

* **District Selection:** Users can choose their district from a dropdown list.
* **Geolocation:** Automatically detect the user's district using browser location (bonus feature).
* **Simple Data Visualization:** Displays 6 key MGNREGA performance metrics in easy-to-understand cards:
    * Work Demand Fulfillment
    * 100-Day Guarantee Completion
    * Women's Participation Rate
    * Average Wage Rate
    * Number of Works Completed
    * Percentage of Payments Made On Time
* **Accessible Language:** Uses simple sentences and avoids technical jargon.
* **Decoupled Architecture:** A background job fetches data from the `data.gov.in` API nightly and stores it in a private PostgreSQL database. The live website interacts only with this fast, reliable database, ensuring uptime even if the government API is down.

## Tech Stack 🛠️

* **Virtual Machine (VM):** GitHub Codespaces (providing a full Linux environment)
* **Database:** PostgreSQL
* **Backend API:** Node.js with Express
* **Frontend:** Next.js with React (TypeScript)
* **Data Fetching/Cron Job:** Node.js (`node-cron`, `axios`)
* **Process Management:** PM2

## Running the Project (in GitHub Codespaces)

1.  **Launch Codespace:** Open the repository on GitHub and launch a new Codespace.
2.  **Install Dependencies & Setup DB:**
    * Run the installation script for `postgresql`, `nginx`, `nvm`, `node`, `pm2`.
    * Start the PostgreSQL service: `sudo service postgresql start`
    * Create the database and tables: `sudo su - postgres`, then `psql`, then paste the contents of `database/schema.sql`, then `\q`, then `exit`.
    * Set a password for the `postgres` user and update `pg_hba.conf` to use `md5` authentication. Restart PostgreSQL: `sudo service postgresql restart`.
3.  **Configure Backend:**
    * Navigate to the `backend` directory: `cd backend`
    * Install dependencies: `npm install`
    * Create a `.env` file with your `DATA_GOV_API_KEY` and `DATA_GOV_API_URL`.
    * Update database connection details (user, password, host, port) in `server.js` and `fetchData.js`.
    * Run the initial data fetch: `node fetchData.js`
    * Start the backend server: `pm2 start server.js --name "backend-api"`
4.  **Configure Frontend:**
    * Navigate to the `frontend` directory: `cd ../frontend`
    * Install dependencies: `npm install`
    * Update the `API_BASE_URL` in `pages/index.tsx` to point to the public URL of Port 3001 provided by Codespaces.
    * Start the frontend dev server: `npm run dev`
5.  **Expose Ports:** In the "PORTS" tab, set the visibility of both Port 3000 (Frontend) and Port 3001 (Backend) to "Public".

## Hosted URL 🌐

The live application is hosted on a GitHub Codespace VM:

[Your Public Codespace URL for Port 3000]

**Note:** As this is a 100% free VM, it will automatically go to sleep after 30 minutes of inactivity. If the link shows an error, the VM may be asleep. Please contact the project author to restart it.