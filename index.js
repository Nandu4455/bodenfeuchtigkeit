const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// CORS aktivieren
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const THINGSPEAK_CHANNEL_ID = '2907360';
const THINGSPEAK_API_KEY = '87GFHEI5QZ0CIGII';
const THINGSPEAK_PUBLIC_URL = `https://thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}`;

const SENSOR_MAX = 1023;
const SENSOR_MIN = 460;

function getMoistureColor(percent) {
  if (percent <= 20) return '#F44336';      // rot
  if (percent <= 60) return '#FF9800';      // orange
  return '#4CAF50';                         // grün
}

app.get('/', async (req, res) => {
  try {
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_API_KEY}&results=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("ThingSpeak API Fehler");
    const data = await response.json();

    if (!data || !data.feeds || data.feeds.length === 0) throw new Error("Keine Daten erhalten");

    const rawMoisture = parseFloat(data.feeds[0].field1);
    const temperature = parseFloat(data.feeds[0].field2);

    const moisturePercent = Math.min(100, Math.max(0, Math.round(((SENSOR_MAX - rawMoisture) / (SENSOR_MAX - SENSOR_MIN)) * 100)));
    const moistureColor = getMoistureColor(moisturePercent);

    const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Bodenfeuchtigkeit & Temperatur</title>
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
          color: #2c3e50;
        }
        .container {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.15);
          width: 400px;
          max-width: 90vw;
          height: 280px;
          margin: 15px 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .container:hover {
          transform: translateY(-8px);
          box-shadow: 0 16px 32px rgba(0,0,0,0.25);
        }
        h1 {
          margin-bottom: 15px;
          font-size: 2rem;
          font-weight: 600;
        }
        .value {
          font-size: 4rem;
          font-weight: 700;
          margin: 10px 0 20px;
          text-shadow: 2px 2px 5px rgba(0,0,0,0.1);
          user-select: none;
        }
        .progress-container {
          width: 100%;
          height: 30px;
          background: #e0e0e0;
          border-radius: 15px;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.1);
          overflow: hidden;
          margin-bottom: 10px;
        }
        .progress-bar {
          height: 100%;
          border-radius: 15px;
          width: ${moisturePercent}%;
          background-color: ${moistureColor};
          transition: width 0.5s ease, background-color 0.5s ease;
        }
        .labels {
          width: 100%;
          max-width: 100%;
          display: flex;
          justify-content: space-between;
          font-weight: 600;
          color: #7f8c8d;
          margin-bottom: 10px;
          user-select: none;
        }
        .thingspeak-link {
          background-color: #2196F3;
          color: white;
          text-decoration: none;
          border-radius: 25px;
          padding: 10px 25px;
          font-weight: 600;
          transition: background-color 0.3s ease, transform 0.3s ease;
          display: inline-block;
        }
        .thingspeak-link:hover {
          background-color: #1976D2;
          transform: scale(1.05);
        }
        @media (max-width: 450px) {
          .container {
            width: 90vw;
            height: auto;
            padding: 20px 10px;
          }
          .value {
            font-size: 3rem;
          }
          h1 {
            font-size: 1.6rem;
          }
        }
        .iframe-container {
          width: 400px;
          max-width: 90vw;
          height: 300px;
          margin: 15px auto;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          transition: transform 0.3s ease-in-out;
        }
        .iframe-container:hover {
          transform: scale(1.02);
        }
        .iframe-container iframe {
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🌱 Bodenfeuchtigkeit</h1>
        <div class="value" id="moistureValue" style="color: ${moistureColor}">${moisturePercent}%</div>
        <div class="progress-container">
          <div class="progress-bar" id="progressBar" style="width: ${moisturePercent}%; background-color: ${moistureColor};"></div>
        </div>
        <div class="labels">
          <span>Trocken (0%)</span>
          <span>Nass (100%)</span>
        </div>
        <a href="${THINGSPEAK_PUBLIC_URL}" target="_blank" class="thingspeak-link" rel="noopener noreferrer">DATEN 📊</a>
      </div>

      <div class="container">
        <h1>🌡️ Temperatur</h1>
        <div class="value" id="temperatureValue">${temperature.toFixed(1)} °C</div>
      </div>

      <div class="iframe-container">
        <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/614988" loading="lazy"></iframe>
      </div>
      <div class="iframe-container">
        <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/615027" loading="lazy"></iframe>
      </div>
      <div class="iframe-container">
        <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/614865" loading="lazy"></iframe>
      </div>
      <div class="iframe-container">
        <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/615591" loading="lazy"></iframe>
      </div>

      <script>
        const SENSOR_MAX = 1023;
        const SENSOR_MIN = 460;

        function getMoistureColor(percent) {
          if (percent <= 20) return '#F44336';
          if (percent <= 60) return '#FF9800';
          return '#4CAF50';
        }

        const progressBar = document.getElementById('progressBar');
        const moistureValue = document.getElementById('moistureValue');
        const temperatureValue = document.getElementById('temperatureValue');

        async function updateData() {
          try {
            const moistureResp = await fetch('/moisture?nocache=' + Date.now());
            const moistureRaw = parseFloat(await moistureResp.text());
            let moisturePercent = Math.round(((SENSOR_MAX - moistureRaw) / (SENSOR_MAX - SENSOR_MIN)) * 100);
            moisturePercent = Math.min(100, Math.max(0, moisturePercent));
            const color = getMoistureColor(moisturePercent);
            progressBar.style.width = moisturePercent + '%';
            progressBar.style.backgroundColor = color;
            moistureValue.style.color = color;
            moistureValue.textContent = moisturePercent + '%';

            const tempResp = await fetch('/temperature?nocache=' + Date.now());
            const tempRaw = parseFloat(await tempResp.text());
            temperatureValue.textContent = tempRaw.toFixed(1) + ' °C';
          } catch (e) {
            console.error('Fehler beim Update:', e);
          }
        }

        // Update alle 15 Sekunden
        setInterval(updateData, 15000);
      </script>
    </body>
    </html>
    `;

    res.send(html);

  } catch (error) {
    console.error("Fehler beim Abrufen von ThingSpeak:", error.message);
    res.status(500).send(`Fehler: ${error.message}`);
  }
});

app.get('/moisture', async (req, res) => {
  try {
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_API_KEY}&results=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('ThingSpeak API Fehler');
    const data = await response.json();
    const lastMoisture = data.feeds[0].field1;
    res.set('Cache-Control', 'no-store');
    res.send(lastMoisture.toString());
  } catch (error) {
    console.error('Fehler beim Abrufen von ThingSpeak:', error.message);
    res.status(500).send(`Fehler: ${error.message}`);
  }
});

app.get('/temperature', async (req, res) => {
  try {
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_API_KEY}&results=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('ThingSpeak API Fehler');
    const data = await response.json();
    const lastTemp = data.feeds[0].field2;
    res.set('Cache-Control', 'no-store');
    res.send(lastTemp.toString());
  } catch (error) {
    console.error('Fehler beim Abrufen der Temperatur:', error.message);
    res.status(500).send(`Fehler: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});






