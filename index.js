const express = require('express');
const fetch = require('node-fetch');

// Punycode-Deprecation-Warnung beheben
globalThis.punycode = require('punycode');

const app = express();
const PORT = 3000;

// CORS aktivieren
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// ThingSpeak-Einstellungen
const THINGSPEAK_CHANNEL_ID = '2907360';
const THINGSPEAK_API_KEY = '87GFHEI5QZ0CIGII';
const THINGSPEAK_PUBLIC_URL = `https://thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}`;

// Hauptseite
app.get('/', async (req, res) => {
  try {
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_API_KEY}&results=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.feeds || data.feeds.length === 0) {
      throw new Error("Keine Daten von ThingSpeak empfangen.");
    }

    const rawValue = parseFloat(data.feeds[0].field1);
    const moisturePercent = Math.round(100 - (rawValue / 1023 * 100));
    // Änderung 1: Grenzwert von 70 auf 50 setzen
    const color = moisturePercent > 50 ? '#4CAF50' : moisturePercent > 30 ? '#FFC107' : '#F44336';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bodenfeuchtigkeit</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            background: #e0f7fa;
            margin: 0;
            padding: 20px;
            display: block;
          }
          .container {
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            width: 100%;
            margin: 0 auto 20px;
            transition: transform 0.3s ease-in-out;
          }
          .container:hover {
            transform: scale(1.02);
          }
          h1 {
            color: #2c3e50;
            font-size: 2rem;
            margin-bottom: 20px;
          }
          .value {
            font-size: 4rem;
            font-weight: bold;
            margin: 20px 0;
            color: ${color};
            text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
          }
          .progress-container {
            background: #e0e0e0;
            border-radius: 15px;
            height: 30px;
            margin: 20px 0;
            overflow: hidden;
            box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.1);
          }
          .progress-bar {
            height: 100%;
            width: ${moisturePercent}%;
            background: ${color};
            transition: width 0.5s, background 0.5s;
            border-radius: 15px;
          }
          .labels {
            display: flex;
            justify-content: space-between;
            color: #7f8c8d;
            margin-bottom: 20px;
          }
          .thingspeak-link {
            display: inline-block;
            padding: 10px 20px;
            background-color: #2196F3;
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-size: 1rem;
            transition: background-color 0.3s, transform 0.3s;
          }
          .thingspeak-link:hover {
            background-color: #1976D2;
            transform: scale(1.1);
          }
          @media (max-width: 600px) {
            .value {
              font-size: 3rem;
            }
          }
          .iframe-container {
            width: 100%;
            max-width: 500px;
            height: 300px;
            margin: 0 auto 20px;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
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
          <div class="value" id="moistureValue">${moisturePercent}%</div>
          <div class="progress-container">
            <div class="progress-bar"></div>
          </div>
          <div class="labels">
            <span>Trocken (0%)</span>
            <span>Nass (100%)</span>
          </div>
          <a href="${THINGSPEAK_PUBLIC_URL}" target="_blank" class="thingspeak-link">DATEN 📊</a>
        </div>

        <div class="iframe-container">
          <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/614988"></iframe>
        </div>
        
        <div class="iframe-container">
          <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/615027"></iframe>
        </div>

        <script>
          setInterval(function () {
            fetch('/moisture?nocache=' + Date.now())
              .then(response => response.text())
              .then(data => {
                const rawValue = parseFloat(data);
                const percent = Math.round(100 - (rawValue / 1023 * 100));
                document.querySelector('.progress-bar').style.width = percent + '%';
                // Änderung 2: Konsistente Farblogik mit Server
                const color = percent > 50 ? '#4CAF50' : percent > 30 ? '#FFC107' : '#F44336';
                document.querySelector('.progress-bar').style.background = color;
                document.getElementById('moistureValue').style.color = color;
                document.getElementById('moistureValue').innerText = percent + '%';
              })
              .catch(error => console.error("Fehler beim Aktualisieren:", error));
          }, 15000);
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

// Endpoint für aktuelle Feuchtigkeitswerte
app.get('/moisture', async (req, res) => {
  try {
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_API_KEY}&results=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.feeds || data.feeds.length === 0) {
      throw new Error("Keine Daten von ThingSpeak empfangen.");
    }

    const lastMoisture = data.feeds[0].field1;
    res.set('Cache-Control', 'no-store');
    res.send(lastMoisture.toString());
  } catch (error) {
    console.error("Fehler beim Abrufen von ThingSpeak:", error.message);
    res.status(500).send(`Fehler: ${error.message}`);
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
