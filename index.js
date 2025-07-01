const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

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
  if (percent <= 20) return '#F44336';
  if (percent <= 60) return '#FF9800';
  return '#4CAF50';
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
        /* Hintergrund Farbverlauf Animation */
        @keyframes backgroundGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        body {
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
          background: linear-gradient(270deg, #89f7fe, #66a6ff, #a18cd1, #fbc1cc);
          background-size: 800% 800%;
          animation: backgroundGradient 30s ease infinite;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
          color: #2c3e50;
        }

        /* Sanfte Einblendung + Slide-up */
        .container {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.15);
          width: 550px;
          max-width: 90vw;
          height: 420px;
          margin: 15px 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeSlideIn 0.6s forwards;
          animation-delay: var(--delay);
          user-select: none;
          position: relative;
          overflow: hidden;
        }
        @keyframes fadeSlideIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Hover-Effekt mit Schatten & Skalierung */
        .container:hover {
          transform: scale(1.05);
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          cursor: default;
        }

        h1 {
          margin-bottom: 15px;
          font-size: 2.5rem;
          font-weight: 600;
          user-select: none;
        }

        /* Pulsierendes Glow um Werte */
        .value {
          font-size: 5rem;
          font-weight: 700;
          margin: 10px 0 20px;
          text-shadow: 2px 2px 5px rgba(0,0,0,0.1);
          animation: glowPulse 3s ease-in-out infinite;
          user-select: none;
        }
        @keyframes glowPulse {
          0%, 100% {
            text-shadow:
              0 0 8px rgba(255, 255, 255, 0.7),
              0 0 20px rgba(255, 255, 255, 0.4);
          }
          50% {
            text-shadow:
              0 0 20px rgba(255, 255, 255, 1),
              0 0 30px rgba(255, 255, 255, 0.6);
          }
        }

        .progress-container {
          width: 90%;
          height: 40px;
          background: #e0e0e0;
          border-radius: 20px;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.1);
          overflow: hidden;
          margin-bottom: 15px;
          position: relative;
        }
        /* Wellen-Animation auf Progressbar */
        .progress-bar {
          height: 100%;
          border-radius: 20px;
          width: ${moisturePercent}%;
          background-color: ${moistureColor};
          transition: width 0.5s ease, background-color 0.5s ease;
          position: relative;
          overflow: hidden;
          background-image:
            radial-gradient(circle 10px, rgba(255,255,255,0.3) 20%, transparent 25%),
            radial-gradient(circle 10px, rgba(255,255,255,0.3) 20%, transparent 25%);
          background-size: 40px 40px;
          background-position: 0 0, 20px 20px;
          animation: wave 4s linear infinite;
        }
        @keyframes wave {
          0% {
            background-position: 0 0, 20px 20px;
          }
          100% {
            background-position: 40px 0, 60px 20px;
          }
        }

        .labels {
          width: 90%;
          max-width: 100%;
          display: flex;
          justify-content: space-between;
          font-weight: 600;
          color: #7f8c8d;
          margin-bottom: 15px;
          user-select: none;
        }

        /* Animierte Buttons */
        .thingspeak-link {
          background-color: #2196F3;
          color: white;
          text-decoration: none;
          border-radius: 25px;
          padding: 12px 30px;
          font-weight: 600;
          transition: background-color 0.3s ease, box-shadow 0.3s ease, transform 0.15s ease;
          display: inline-block;
          box-shadow: 0 5px 10px rgba(33, 150, 243, 0.5);
          user-select: none;
        }
        .thingspeak-link:hover {
          background-color: #1976D2;
          box-shadow: 0 8px 20px rgba(25, 118, 210, 0.7);
          transform: scale(1.1);
        }
        .thingspeak-link:active {
          transform: scale(0.95);
          box-shadow: 0 3px 6px rgba(25, 118, 210, 0.9);
        }

        @media (max-width: 600px) {
          .container {
            width: 90vw;
            height: auto;
            padding: 25px 10px;
          }
          .value {
            font-size: 3.5rem;
          }
          h1 {
            font-size: 2rem;
          }
          .progress-container {
            height: 30px;
          }
          .iframe-container {
            width: 90vw !important;
          }
        }

        /* Iframe Container mit Parallax-Effekt */
        .iframe-container {
          width: 550px;
          max-width: 90vw;
          height: 300px;
          margin: 15px auto;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          transition: transform 0.3s ease-in-out;
          position: relative;
          perspective: 1000px;
        }
        .iframe-container:hover {
          transform: scale(1.02);
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
        }
        .iframe-container iframe {
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 20px;
          transform-style: preserve-3d;
          transition: transform 0.5s ease;
        }
      </style>
    </head>
    <body>
      <div class="container" style="--delay: 0.1s;">
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

      <div class="container" style="--delay: 0.3s;">
        <h1>🌡️ Temperatur</h1>
        <div class="value" id="temperatureValue">${temperature.toFixed(1)} °C</div>
      </div>

      <div class="iframe-container">
        <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/614988" loading="eager" allow="autoplay"></iframe>
      </div>
      <div class="iframe-container">
        <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/615027" loading="eager" allow="autoplay"></iframe>
      </div>
      <div class="iframe-container">
        <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/614865" loading="eager" allow="autoplay"></iframe>
      </div>
      <div class="iframe-container">
        <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/615591" loading="eager" allow="autoplay"></iframe>
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

        setInterval(updateData, 15000);

        // Parallax Effekt für iframes beim Scrollen
        window.addEventListener('scroll', () => {
          document.querySelectorAll('.iframe-container').forEach(container => {
            const rect = container.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const centerY = rect.top + rect.height / 2;
            const offset = (windowHeight / 2 - centerY) / 20; // Effektstärke anpassen
            container.style.transform = `perspective(1000px) translateZ(0) rotateX(${offset}deg) scale(1)`;
          });
        });
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
    if (!response.ok) throw new Error("ThingSpeak API Fehler");
    const data = await response.json();
    const lastMoisture = data.feeds[0].field1;
    res.set('Cache-Control', 'no-store');
    res.send(lastMoisture.toString());
  } catch (error) {
    console.error("Fehler beim Abrufen von ThingSpeak:", error.message);
    res.status(500).send(`Fehler: ${error.message}`);
  }
});

app.get('/temperature', async (req, res) => {
  try {
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_API_KEY}&results=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("ThingSpeak API Fehler");
    const data = await response.json();
    const lastTemp = data.feeds[0].field2;
    res.set('Cache-Control', 'no-store');
    res.send(lastTemp.toString());
  } catch (error) {
    console.error("Fehler beim Abrufen der Temperatur:", error.message);
    res.status(500).send(`Fehler: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});










