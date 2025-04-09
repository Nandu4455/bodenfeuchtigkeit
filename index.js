const express = require('express');
const fetch = require('node-fetch');

globalThis.punycode = require('punycode');

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
    const color = moisturePercent > 50 ? '#4CAF50' : moisturePercent > 30 ? '#FFC107' : '#F44336';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bodenfeuchtigkeit</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; background: #e0f7fa; margin: 0; padding: 20px; display: block; }
          .container { background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1); max-width: 600px; width: 100%; margin: 0 auto 20px; }
          h1 { color: #2c3e50; font-size: 2rem; margin-bottom: 20px; }
          .value { font-size: 4rem; font-weight: bold; margin: 20px 0; color: ${color}; }
          .progress-container { background: #e0e0e0; border-radius: 15px; height: 30px; margin: 20px 0; overflow: hidden; }
          .progress-bar { height: 100%; width: ${moisturePercent}%; background: ${color}; transition: 0.5s; border-radius: 15px; }
          .labels { display: flex; justify-content: space-between; color: #7f8c8d; margin-bottom: 20px; }
          .thingspeak-link { display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 25px; }
          select { margin-bottom: 20px; padding: 10px; border-radius: 10px; border: 1px solid #ccc; }
          canvas { max-width: 100%; }
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
            <span>Trocken (0%)</span><span>Nass (100%)</span>
          </div>
          <a href="${THINGSPEAK_PUBLIC_URL}" target="_blank" class="thingspeak-link">DATEN 📊</a>
        </div>

        <div class="container">
          <label for="rangeSelect">Zeitraum auswählen:</label>
          <select id="rangeSelect">
            <option value="1h">Letzte Stunde</option>
            <option value="24h">Letzte 24 Stunden</option>
            <option value="2d">Letzte 2 Tage</option>
            <option value="7d">Letzte Woche</option>
          </select>
          <canvas id="rangeChart" height="200"></canvas>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script>
          setInterval(function () {
            fetch('/moisture?nocache=' + Date.now())
              .then(response => response.text())
              .then(data => {
                const rawValue = parseFloat(data);
                const percent = Math.round(100 - (rawValue / 1023 * 100));
                document.querySelector('.progress-bar').style.width = percent + '%';
                const color = percent > 50 ? '#4CAF50' : percent > 30 ? '#FFC107' : '#F44336';
                document.querySelector('.progress-bar').style.background = color;
                document.getElementById('moistureValue').style.color = color;
                document.getElementById('moistureValue').innerText = percent + '%';
              });
          }, 15000);

          const ctx = document.getElementById('rangeChart').getContext('2d');
          let rangeChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Feuchtigkeit', data: [], borderColor: '#2196F3', fill: false }] },
            options: {
              scales: {
                x: {
                  type: 'time',
                  time: { tooltipFormat: 'dd.MM.yyyy HH:mm', displayFormats: { hour: 'HH:mm' } },
                  ticks: {
                    callback: (val, index, ticks) => {
                      return new Date(val).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                    }
                  },
                  title: { display: true, text: 'Zeit' }
                },
                y: { min: 0, max: 100, title: { display: true, text: 'Feuchtigkeit (%)' } }
              }
            }
          });

          async function loadData(range) {
            const res = await fetch('/range?range=' + range);
            const raw = await res.json();
            const labels = raw.map(p => new Date(p.created_at));
            const data = raw.map(p => Math.round(100 - (parseFloat(p.field1) / 1023 * 100)));
            rangeChart.data.labels = labels;
            rangeChart.data.datasets[0].data = data;
            rangeChart.update();
          }

          document.getElementById('rangeSelect').addEventListener('change', e => {
            loadData(e.target.value);
          });

          loadData('1h');
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

// Neuer Endpunkt für Zeitbereichsauswahl
app.get('/range', async (req, res) => {
  try {
    const range = req.query.range || '1h';
    const now = new Date();
    let start;

    switch (range) {
      case '1h': start = new Date(now.getTime() - 60 * 60 * 1000); break;
      case '24h': start = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case '2d': start = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); break;
      case '7d': start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      default: start = new Date(now.getTime() - 60 * 60 * 1000);
    }

    const startISO = start.toISOString();
    const endISO = now.toISOString();
    const url = \`https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/fields/1.json?api_key=${THINGSPEAK_API_KEY}&start=${startISO}&end=${endISO}\`;
    const response = await fetch(url);
    const data = await response.json();

    res.set('Cache-Control', 'no-store');
    res.json(data.feeds);
  } catch (error) {
    console.error("Fehler bei /range:", error.message);
    res.status(500).send(\`Fehler: \${error.message}\`);
  }
});

app.listen(PORT, () => {
  console.log(\`Server läuft auf Port \${PORT}\`);
});

