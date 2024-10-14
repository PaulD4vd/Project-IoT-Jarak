const express = require("express");
const { InfluxDB } = require("@influxdata/influxdb-client");
const app = express();
const port = 3000;

// Setup InfluxDB connection
const token =
  "Da4o1zlGGFO8sgmDhePMR4BrUOabX5n6xKVOfohoWUCpGiwN5OGEQ68vd7K4o3-YfUva-i80BlYhxVNeHKEMdA==";
const org = "e1751da18330c349";
const bucket = "sensorcoba";
const url = "http://103.210.35.189:8086"; // InfluxDB URL

const influxDB = new InfluxDB({ url, token });
const queryApi = influxDB.getQueryApi(org);

// Set view engine to ejs
app.set("view engine", "ejs");
app.use(express.static("public"));

// Function to fetch current, average, and median data
async function fetchData() {
  const currentQuery = `from(bucket: "${bucket}")
                         |> range(start: -1m)
                         |> filter(fn: (r) => r["_measurement"] == "ultrasonic")
                         |> filter(fn: (r) => r["distance_unit"] == "cm")
                         |> last()`;

  const averageQuery = `from(bucket: "${bucket}")
                         |> range(start: -10m)
                         |> filter(fn: (r) => r["_measurement"] == "ultrasonic")
                         |> filter(fn: (r) => r["distance_unit"] == "cm")
                         |> mean()`;

  const medianQuery = `from(bucket: "${bucket}")
                         |> range(start: -10m)
                         |> filter(fn: (r) => r["_measurement"] == "ultrasonic")
                         |> filter(fn: (r) => r["distance_unit"] == "cm")
                         |> median()`;

  const [currentData, averageData, medianData] = await Promise.all([
    queryApi.collectRows(currentQuery),
    queryApi.collectRows(averageQuery),
    queryApi.collectRows(medianQuery),
  ]);

  const currentValue = currentData.length > 0 ? currentData[0]._value : null;
  const averageValue =
    averageData.length > 0 ? Math.round(averageData[0]._value) : null;
  const medianValue =
    medianData.length > 0 ? Math.round(medianData[0]._value) : null;

  return {
    current: currentValue,
    average: averageValue,
    median: medianValue,
  };
}

// Route for SSE to send real-time data
app.get("/realtime-data", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  setInterval(async () => {
    try {
      const data = await fetchData();
      res.write(`data: ${JSON.stringify(data)}\n\n`); // Send data as JSON
    } catch (error) {
      console.error("Error fetching real-time data:", error);
    }
  }, 1000); // Send updates every 1 second
});

// Route to serve the main page
app.get("/", (req, res) => {
  res.send(`
<html>
  <head>
    <!-- Required meta tags -->
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <!-- Bootstrap CSS -->
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css"
      rel="stylesheet"
      integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC"
      crossorigin="anonymous"
    />

    <title>Real-Time Data Monitoring</title>
    <script>
      function startEventSource() {
        const eventSource = new EventSource("/realtime-data");
        eventSource.onmessage = function (event) {
          const data = JSON.parse(event.data);
          const currentElement = document.getElementById("current");
          const averageElement = document.getElementById("average");
          const medianElement = document.getElementById("median");

          // Display current value
          if (data.current !== null) {
            currentElement.innerText = "Data Saat Ini: " + data.current + " cm";
          } else {
            currentElement.innerText = "Tidak ada data saat ini.";
          }

          // Display average value
          if (data.average !== null) {
            averageElement.innerText = "Rata-rata Nilai: " + data.average + " cm";
          } else {
            averageElement.innerText = "Tidak ada data untuk rata-rata.";
          }

          // Display median value
          if (data.median !== null) {
            medianElement.innerText = "Median Nilai: " + data.median + " cm";
          } else {
            medianElement.innerText = "Tidak ada data untuk median.";
          }
        };

        eventSource.onerror = function () {
          console.error("Error receiving real-time data.");
          eventSource.close();
        };
      }

      window.onload = startEventSource;
    </script>
  </head>
  <body>
    <center>
      <div class="isi" style="margin:auto;">
        <h1 class="display-1">Data Ultrasonic Real-Time</h1>

        <div class="mt-5">
          <div class="display-3" id="current">Mengambil data saat ini...</div>
          <div class="display-3" id="average">Mengambil data rata-rata...</div>
          <div class="display-3" id="median">Mengambil data median...</div>
        </div>
      </div>
    </center>

    <script
      src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"
      integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM"
      crossorigin="anonymous"
    ></script>
  </body>
</html>
  `);
});

app.listen(8128, '0.0.0.0', () => {
  console.log('Server running at http://103.210.35.189:8128');
});
