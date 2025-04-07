
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
            color: #FFC107;
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
          <div class="value" id="moistureValue">50%</div>
          <div class="progress-container">
            <div class="progress-bar" style="width: 50%; background: #FFC107"></div>
          </div>
          <div class="labels">
            <span>Trocken (0%)</span>
            <span>Nass (100%)</span>
          </div>
          <a href="https://thingspeak.com/channels/2907360" target="_blank" class="thingspeak-link">DATEN 📊</a>
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
    
