const express = require('express');
const fetch = require('node-fetch');
const punycode = require('punycode/'); // Userland-Alternative verwenden

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
    const moisturePercent = Math.round(100 - (rawValue / 1023 * 100)); // Umwandlung in % (100% = nass, 0% = trocken)
    const color = moisturePercent > 70 ? '#4CAF50' : moisturePercent > 30 ? '#FFC107' : '#F44336';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bodenfeuchtigkeit</title>
        <style>
          /* Ihr CSS bleibt unverändert */
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
        <script>
          setInterval(function () {
            fetch('/moisture?nocache=' + Date.now())
              .then(response => response.text())
              .then(data => {
                const rawValue = parseFloat(data);
                const percent = Math.round(100 - (rawValue / 1023 * 100));
                document.querySelector('.progress-bar').style.width = percent + '%';
                const color = percent > 70 ? '#4CAF50' : percent > 30 ? '#FFC107' : '#F44336';
                document.querySelector('.progress-bar').style.background = color;
                document.getElementById('moistureValue').style.color = color;
                document.getElementById('moistureValue').innerText = percent + '%';
              })
              .catch(error => console.error("Fehler beim Aktualisieren:", error));
          }, 15000); // Aktualisierung alle 15 Sekunden
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
    res.set('Cache-Control', 'no-store'); // Kein Caching erlauben
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
