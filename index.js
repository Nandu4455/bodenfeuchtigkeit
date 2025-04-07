const express = require('express');
const fetch = require('node-fetch');

// Punycode-Warnung beheben
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

// Hauptseite mit Chart.js-Diagramm
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
    const color = moisturePercent > 70 ? '#4CAF50' : moisturePercent > 30 ? '#FFC107' : '#F44336';

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
          }
          .container {
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 100%;
            margin: 0 auto 30px;
            transition: transform 0.3s;
          }
          .container:hover {
            transform: scale(1.02);
          }
          .value {
            font-size: 4rem;
            color: ${color};
            margin: 20px 0;
          }
          .chart-container {
            width: 100%;
            max-width: 800px;
            height: 600px;
            margin: 0 auto 30px;
            border-radius: 10px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          }
          @media (max-width: 768px) {
            .chart-container {
              height: 400px;
            }
          }
        </style>
      </head>
      <body>
        <!-- Bodenfeuchtigkeitsanzeige -->
        <div class="container">
          <h1>🌱 Bodenfeuchtigkeit</h1>
          <div class="value" id="moistureValue">${moisturePercent}%</div>
          <div class="progress-container">
            <div class="progress-bar" style="width: ${moisturePercent}%; background: ${color}"></div>
          </div>
          <div class="labels">
            <span>Trocken (0%)</span>
            <span>Nass (100%)</span>
          </div>
          <a href="${THINGSPEAK_PUBLIC_URL}" target="_blank" class="thingspeak-link">DATEN 📊</a>
        </div>

        <!-- Neues Diagramm mit Chart.js -->
        <div class="chart-container">
          <canvas id="moistureChart" width="800" height="600"></canvas>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script>
          // Fortlaufendes Diagramm aktualisieren
          const ctx = document.getElementById('moistureChart').getContext('2d');
          const moistureChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: [],
              datasets: [{
                label: 'Bodenfeuchtigkeit (%)',
                data: [],
                borderColor: '#2196F3',
                fill: false
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                  title: { display: true, text: 'Feuchtigkeit (%)' }
                },
                x: {
                  title: { display: true, text: 'Zeit' }
                }
              }
            }
          });

          // Daten alle 15 Sekunden holen
          async function updateData() {
            try {
              const response = await fetch('/moisture');
              const rawValue = await response.text();
              const percent = Math.round(100 - (rawValue / 1023 * 100));

              // Daten für Diagramm und Progress-Bar aktualisieren
              moistureChart.data.datasets[0].data.push(percent);
              moistureChart.data.labels.push(new Date().toLocaleTimeString());
              moistureChart.update();

              // Alte Daten löschen, wenn zu viele sind
              if (moistureChart.data.datasets[0].data.length > 20) {
                moistureChart.data.datasets[0].data.shift();
                moistureChart.data.labels.shift();
              }

              // Progress-Bar aktualisieren
              const progressBar = document.querySelector('.progress-bar');
              progressBar.style.width = percent + '%';
              progressBar.style.background = percent > 70 ? '#4CAF50' : percent > 30 ? '#FFC107' : '#F44336';
              document.getElementById('moistureValue').innerText = percent + '%';
            } catch (error) {
              console.error("Fehler:", error);
            }
          }

          // Starten und intervallbasiert aktualisieren
          updateData();
          setInterval(updateData, 15000);
        </script>
      </body>
      </html>
    `;
    res.send(html);
  } catch (error) {
    console.error("Fehler:", error);
    res.status(500).send(`Fehler: ${error.message}`);
  }
});

// Endpoint für Feuchtigkeitswerte
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
    console.error("Fehler:", error);
    res.status(500).send(`Fehler: ${error.message}`);
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
