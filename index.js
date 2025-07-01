const express = require('express');

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

app.get('/', async (req, res) => {
  try {
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_API_KEY}&results=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Fehler bei ThingSpeak API');

    const data = await response.json();
    if (!data || !data.feeds || data.feeds.length === 0) {
      throw new Error("Keine Daten von ThingSpeak empfangen.");
    }

    const rawMoisture = parseFloat(data.feeds[0].field1);
    const temperature = parseFloat(data.feeds[0].field2);

    // Funktion für Farbauswahl Bodenfeuchtigkeit
    function getMoistureColor(percent) {
      if (percent <= 20) return '#F44336';    // Rot
      else if (percent <= 60) return '#FF9800'; // Orange
      else return '#4CAF50';                   // Grün
    }

    const moisturePercent = Math.min(100, Math.max(0, Math.round(((SENSOR_MAX - rawMoisture) / (SENSOR_MAX - SENSOR_MIN)) * 100)));
    const moistureColor = getMoistureColor(moisturePercent);

    const html = `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Bodenfeuchtigkeit & Temperatur</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
        <style>
          body {
            background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%);
            font-family: 'Poppins', Arial, sans-serif;
            color: #2c3e50;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            background: #fff;
            border-radius: 20px;
            padding: 30px;
            max-width: 500px;
            margin: 20px auto;
            box-shadow: 0 8px 16px rgba(0,0,0,0.15);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            width: 100%;
            height: 280px; /* Gleiche Höhe für alle Boxen */
            display: flex;
            flex-direction: column;
            justify-content: center; /* Vertikale Zentrierung */
            align-items: center;     /* Horizontale Zentrierung */
            text-align: center;
          }
          .container:hover {
            transform: translateY(-8px);
            box-shadow: 0 16px 32px rgba(0,0,0,0.25);
          }
          h1 {
            font-weight: 600;
            font-size: 2.2rem;
            margin-bottom: 20px;
          }
          .value {
            font-weight: 600;
            font-size: 4rem;
            margin: 20px 0;
            text-shadow: 2px 2px 5px rgba(0,0,0,0.1);
          }
          .progress-container {
            background: #e0e0e0;
            border-radius: 15px;
            height: 30px;
            width: 100%;
            max-width: 400px;
            margin: 20px 0 10px;
            overflow: hidden;
            box-shadow: inset 0 2px 5px rgba(0,0,0,0.1);
          }
          .progress-bar {
            height: 100%;
            border-radius: 15px;
            width: ${moisturePercent}%;
            background-color: ${moistureColor};
            transition: width 0.5s ease, background-color 0.5s ease;
          }
          .labels {
            display: flex;
            justify-content: space-between;
            color: #7f8c8d;
            margin-top: 0;
            font-weight: 500;
            max-width: 400px;
            width: 100%;
          }
          .thingspeak-link {
            display: inline-block;
            padding: 10px 25px;
            background-color: #2196F3;
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            font-size: 1rem;
            transition: background-color 0.3s ease, transform 0.3s ease;
            margin-top: 10px;
          }
          .thingspeak-link:hover {
            background-color: #1976D2;
            transform: scale(1.1);
          }
          @media (max-width: 600px) {
            .value {
              font-size: 3rem;
            }
            h1 {
              font-size: 1.8rem;
            }
            .thingspeak-link {
              padding: 8px 20px;
              font-size: 0.9rem;
            }
            .container {
              height: auto; /* Für kleine Bildschirme Höhe anpassen */
              padding: 20px;
            }
          }
          .iframe-container {
            width: 100%;
            max-width: 500px;
            height: 300px;
            margin: 0 auto 20px;
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
          <div class="value" id="moistureValue" style="color:${moistureColor}">${moisturePercent}%</div>
          <div class="progress-container">
            <div class="progress-bar"></div>
          </div>
          <div class="labels">
            <span>Trocken (0%)</span>
            <span>Nass (100%)</span>
          </div>
          <a href="${THINGSPEAK_PUBLIC_URL}" target="_blank" class="thingspeak-link">DATEN 📊</a>
        </div>

        <div class="container">
          <h1>🌡️ Temperatur</h1>
          <div class="value" id="temperatureValue">${temperature.toFixed(1)} °C</div>
        </div>

        <div class="iframe-container">
          <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/614988"></iframe>
        </div>
        
        <div class="iframe-container">
          <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/615027"></iframe>
        </div>
        
        <div class="iframe-container">
          <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/614865"></iframe>
        </div>

        <div class="iframe-container">
          <iframe src="https://thingspeak.mathworks.com/apps/matlab_visualizations/615591"></iframe>
        </div>

        <script>
          const SENSOR_MAX = 1023;
          const SENSOR_MIN = 460;

          function getMoistureColor(percent) {
            if (percent <= 20) return '#F44336';    // Rot
            else if (percent <= 60) return '#FF9800'; // Orange
            else return '#4CAF50';                   // Grün
          }

          const progressBar = document.querySelector('.progress-bar');

          setInterval(() => {
            fetch('/moisture?nocache=' + Date.now())
              .then(res => res.text())
              .then(raw => {
                const value = parseFloat(raw);
                const percent = Math.min(100, Math.max(0, Math.round(((SENSOR_MAX - value) / (SENSOR_MAX - SENSOR_MIN)) * 100)));
                const color = getMoistureColor(percent);

                progressBar.style.width = percent + '%';
                progressBar.style.backgroundColor = color;

                const valElem = document.getElementById('moistureValue');
                valElem.style.color = color;
                valElem.innerText = percent + '%';
              })
              .catch(e => console.error("Feuchtigkeit-Update Fehler:", e));

            fetch('/temperature?nocache=' + Date.now())
              .then(res => res.text())
              .then(temp => {
                const t = parseFloat(temp).toFixed(1);
                document.getElementById('temperatureValue').innerText = t + ' °C';
              })
              .catch(e => console.error("Temperatur-Update Fehler:", e));
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

app.get('/moisture', async (req, res) => {
  try {
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_API_KEY}&results=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Fehler bei ThingSpeak API');
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
    if (!response.ok) throw new Error('Fehler bei ThingSpeak API');
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




