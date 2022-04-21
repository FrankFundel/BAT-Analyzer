import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import ReactDOM from "react-dom";
import Button from "@mui/material/Button";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

import { WaveSurfer, WaveForm, Region, Marker } from "wavesurfer-react";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions.min";

import FileUpload from "react-material-file-upload";

const theme = createTheme();

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const chartOptions = {
  indexAxis: "y",
  elements: {
    bar: {
      borderWidth: 2,
    },
  },
  responsive: true,
  plugins: {
    legend: {
      position: "right",
    },
    title: {
      display: true,
      text: "Predictions",
    },
  },
};

function App() {
  const [regions, setRegions] = useState([]);
  const [files, setFiles] = useState([]);
  const [model, setModel] = useState("");
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  const plugins = useMemo(() => {
    return [
      {
        plugin: RegionsPlugin,
        options: { dragSelection: true },
      },
    ].filter(Boolean);
  }, []);

  const regionsRef = useRef(regions);

  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  const regionCreatedHandler = useCallback(
    (region) => {
      console.log("region-created --> region:", region);

      if (region.data.systemRegionId) return;

      setRegions([
        ...regionsRef.current,
        { ...region, data: { ...region.data, systemRegionId: -1 } },
      ]);
    },
    [regionsRef]
  );

  const wavesurferRef = useRef();
  const handleWSMount = useCallback(
    (waveSurfer) => {
      wavesurferRef.current = waveSurfer;

      if (wavesurferRef.current) {
        wavesurferRef.current.load(require("./test.wav"));

        wavesurferRef.current.on("ready", () => {
          console.log("WaveSurfer is ready");
        });

        wavesurferRef.current.on("loading", (data) => {
          console.log("loading --> ", data);
        });

        if (window) {
          window.surferidze = wavesurferRef.current;
        }
      }
    },
    [regionCreatedHandler]
  );

  const play = useCallback(() => {
    wavesurferRef.current.playPause();
  }, []);

  const handleRegionUpdate = useCallback((region, smth) => {
    console.log("region-update-end --> region:", region);
    console.log(smth);
  }, []);

  const onFilesChange = (f) => {
    setFiles(f);
    console.log(f[0]);

    var reader = new FileReader();
    reader.onload = (evt) => {
      var blob = new window.Blob([new Uint8Array(evt.target.result)]);
      wavesurferRef.current.loadBlob(blob);
    };
    reader.onerror = function (evt) {
      console.error("An error ocurred reading the file: ", evt);
    };

    reader.readAsArrayBuffer(f[0]);
  };

  const predict = () => {
    // send file and model to server
    let formData = new FormData();
    formData.append("file", files[0]);
    formData.append("model", model);
    console.log("Using", model);

    fetch("http://pain.informatik.uni-ulm.de:8888/predict", {
      method: "POST",
      body: formData,
      mode: "cors",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("HTTP error " + response.status);
        }
        return response.json();
      })
      .then((json) => {
        console.log(json);

        setChartData({
          labels: json.classes,
          datasets: [
            {
              label: model,
              data: json.prediction,
              borderColor: "rgb(53, 162, 235)",
              backgroundColor: "rgba(53, 162, 235, 0.5)",
            },
          ],
        });
      })
      .catch((error) => {
        console.log(error);
      });
  };

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="relative">
        <Toolbar>
          <Typography variant="h6" color="inherit" noWrap>
            BAT Analyzer
          </Typography>
        </Toolbar>
      </AppBar>
      <main style={{ margin: 24 }}>
        <Stack spacing={2}>
          <FileUpload
            value={files}
            onChange={onFilesChange}
            multiple={false}
            accept=".wav"
          />

          <WaveSurfer plugins={plugins} onMount={handleWSMount}>
            <WaveForm
              id="waveform"
              hideCursor
              cursorColor="transparent"
              waveColor="#D9DCFF"
              progressColor="#4353FF"
              cursorColor="#4353FF"
              barWidth={3}
              barRadius={3}
              cursorWidth={1}
              height={200}
              barGap={3}
            >
              {regions.map((regionProps) => (
                <Region
                  onUpdateEnd={handleRegionUpdate}
                  key={regionProps.id}
                  {...regionProps}
                />
              ))}
            </WaveForm>
          </WaveSurfer>

          <Stack direction="row" spacing={2}>
            <Autocomplete
              disablePortal
              id="combo-box-demo"
              options={[{ label: "BAT-1: 18 european bats", id: 1 }]}
              sx={{ width: 300 }}
              renderInput={(params) => <TextField {...params} label="Model" />}
              onChange={(e, v) => setModel(v.label)}
            />

            <Button variant="contained" onClick={() => predict()}>
              Predict
            </Button>
            <Button variant="contained" onClick={() => play()}>
              Play / Pause
            </Button>
          </Stack>

          <Bar options={chartOptions} data={chartData} />
        </Stack>
      </main>
    </ThemeProvider>
  );
}

export default App;
