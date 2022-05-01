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
import Backdrop from "@mui/material/Backdrop";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
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

const axios = require("axios").default;

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

const modelOptions = [
  { label: "BAT-1: 18 european bats", id: 1 },
  { label: "ResNet-50: 18 european bats", id: 2 },
];

function BAT() {
  const [regions, setRegions] = useState([]);
  const [files, setFiles] = useState([]);
  const [model, setModel] = useState(modelOptions[0]);
  const [loading, setLoading] = useState(0);
  const [expanded, setExpanded] = useState(false);
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
        //wavesurferRef.current.load(require("./test.wav"));

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
    setChartData({
      labels: [],
      datasets: [],
    });
    setExpanded(false);
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
    if (model == "") return;

    // send file and model to server
    let formData = new FormData();
    formData.append("file", files[0]);
    formData.append("model", model.label);
    formData.append("expanded", expanded);

    console.log("Using", model.label);

    axios
      .request("http://pain.informatik.uni-ulm.de:8888/predict", {
        method: "post",
        data: formData,
        onUploadProgress: (p) => {
          console.log(p, p.loaded / p.total);
          setLoading((p.loaded / p.total) * 100);
        },
      })
      .then((response) => {
        var data = response.data;
        console.log(data);
        setLoading(0);

        setChartData({
          labels: data.classes,
          datasets: [
            {
              label: model.label,
              data: data.prediction,
              borderColor: "rgb(53, 162, 235)",
              backgroundColor: "rgba(53, 162, 235, 0.5)",
            },
          ],
        });
      })
      .catch((error) => {
        console.log(error);
        setLoading(0);
      });
  };

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="relative">
        <Toolbar>
          <img
            src={require("./logo.png")}
            width="40"
            height="40"
            style={{
              backgroundColor: "white",
              padding: 8,
              borderRadius: 28,
              margin: 8,
              marginRight: 24,
            }}
          />
          <Typography variant="h6" color="inherit" noWrap>
            BAT Analyzer
          </Typography>
          <Button
            variant="contained"
            color="info"
            style={{ marginLeft: 12 }}
            href="GAN"
          >
            BATGAN
          </Button>
        </Toolbar>
      </AppBar>
      <main style={{ margin: 24 }}>
        <Container maxWidth="md">
          <Stack spacing={2}>
            <FileUpload
              value={files}
              onChange={onFilesChange}
              multiple={false}
              title="Drag 'n' drop some files here, or click to select files."
              accept=".wav"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={expanded}
                  onChange={(event) => {
                    setExpanded(event.target.checked);
                  }}
                />
              }
              label="File is already time expanded 1:10"
            />

            {files.length > 0 && (
              <>
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
                    options={modelOptions}
                    sx={{ width: 300 }}
                    renderInput={(params) => (
                      <TextField {...params} label="Model" required />
                    )}
                    onChange={(event, value) => setModel(value)}
                  />

                  <Button variant="contained" onClick={() => predict()}>
                    Predict
                  </Button>
                  <Button variant="contained" onClick={() => play()}>
                    Play / Pause
                  </Button>
                </Stack>

                <Bar options={chartOptions} data={chartData} />
              </>
            )}
          </Stack>
        </Container>
      </main>
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
        open={loading > 0}
      >
        <CircularProgress
          variant={loading < 100 ? "determinate" : "indeterminate"}
          value={loading}
          color="inherit"
        />
      </Backdrop>
    </ThemeProvider>
  );
}

export default BAT;
