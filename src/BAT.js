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
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { createTheme, ThemeProvider } from "@mui/material/styles";

import { WaveSurfer, WaveForm, Region, Marker } from "wavesurfer-react";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions.min";

import FileUpload from "react-material-file-upload";
import Plotly from "./components/CustomPlotly";
import createPlotlyComponent from "react-plotly.js/factory";
const Plot = createPlotlyComponent(Plotly);

const axios = require("axios").default;

const theme = createTheme();

const modelOptions = [
  { label: "ResNet-50: 18 european bats", id: 1 },
  //{ label: "BAT-1: 18 european bats", id: 2 },
];

const templates = [
  {
    filename: "eptesicus_nilssonii.wav",
    duration: "00:00:19",
    size: "5.46MB",
    expanded: true,
  },
];

const patch_len = 44;

const class_colors = [
  "#e6194b",
  "#3cb44b",
  "#ffe119",
  "#4363d8",
  "#f58231",
  "#911eb4",
  "#46f0f0",
  "#f032e6",
  "#bcf60c",
  "#fabebe",
  "#008080",
  "#e6beff",
  "#9a6324",
  "#fffac8",
  "#800000",
  "#aaffc3",
  "#808000",
  "#ffd8b1",
  "#000075",
  "#808080",
  "#ffffff",
  "#000000",
];

function BAT() {
  const [regions, setRegions] = useState([]);
  const [files, setFiles] = useState([]);
  const [model, setModel] = useState(modelOptions[0]);
  const [loading, setLoading] = useState(0);
  const [loadingText, setLoadingText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [specData, setSpecData] = useState(null);
  const [chartData, setChartData] = useState(null);

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
    setChartData(null);
    setSpecData(null);

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

  function argMax(array) {
    return array
      .map((x, i) => [x, i])
      .reduce((r, a) => (a[0] > r[0] ? a : r))[1];
  }

  const predict = () => {
    if (model == "") return;
    setLoading(100);
    setLoadingText("Waiting for server...");

    // send file and model to server
    let formData = new FormData();
    formData.append("file", files[0]);
    formData.append("model", model.label);
    formData.append("expanded", expanded);

    console.log("Using", model.label);

    axios
      .request("https://frank-bat.herokuapp.com/predict", {
        method: "post",
        data: formData,
        onUploadProgress: (p) => {
          let percent = (p.loaded / p.total) * 100;
          console.log(p, percent);
          setLoading(percent);
          if (percent == 100) {
            setLoadingText("Processing...");
          } else {
            setLoadingText("Uploading " + parseInt(percent) + "%");
          }
        },
      })
      .then((response) => {
        var data = response.data;
        console.log(data);
        setLoading(0);
        setLoadingText("");

        if (data.spectrogram) {
          var bars = [];

          if (data.patch_pred) {
            let predicted_classes = {};
            for (let i in data.patch_pred[0]) {
              let index = data.patch_pred[0][i];
              let patch = data.patch_pred[1][i];

              let cls = argMax(patch);
              if (!predicted_classes[cls]) {
                predicted_classes[cls] = [];
              }
              predicted_classes[cls].push(index + patch_len);
            }

            for (let cls of Object.keys(predicted_classes)) {
              var x = predicted_classes[cls];
              bars.push({
                type: "bar",
                x: x,
                y: Array(x.length).fill(5),
                width: Array(x.length).fill(patch_len),
                marker: { color: class_colors[cls] },
                opacity: 1.0,
                name: data.classes[cls],
              });
            }
          }

          setSpecData([
            {
              type: "heatmap",
              z: data.spectrogram,
              colorscale: "Viridis",
              showscale: false,
            },
            ...bars,
          ]);
        }

        setChartData([
          {
            type: "bar",
            x: data.prediction,
            y: data.classes.map((cls) => cls + "\t"),
            marker: {
              color: "rgb(49,130,189)",
              opacity: 0.7,
            },
            orientation: "h",
          },
        ]);
      })
      .catch((error) => {
        console.log(error);
        setLoading(0);
        setLoadingText("");
      });
  };

  let x_tickvals = [];
  let x_ticktext = [];
  if (specData) {
    x_tickvals = Array(10).fill().map((_, idx) => idx * (specData[0].z[0].length / 10));
    x_ticktext = Array(10).fill().map((_, idx) => (idx * (specData[0].z[0].length / 1760)).toFixed(2));
  }

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
            <Stack direction="row" spacing={2}>
              <div style={{ flex: 2 }}>
                <FileUpload
                  value={files}
                  onChange={onFilesChange}
                  multiple={false}
                  title="Drag 'n' drop some files here, or click to select files."
                  accept=".wav"
                />
              </div>

              <div
                style={{
                  border: "1px solid",
                  borderRadius: 4,
                  borderColor: "rgba(0, 0, 0, 0.23)",
                  textAlign: "center",
                  paddingTop: 8,
                }}
              >
                <Typography
                  variant="text"
                  color="inherit"
                  style={{
                    fontWeight: "400",
                    fontSize: "0.75rem",
                  }}
                >
                  Or try some example files
                </Typography>
                <List
                  dense={true}
                  style={{
                    width: 200,
                    borderTop: "0.5px solid #d3d3d3",
                    marginTop: 12,
                  }}
                >
                  {templates.map((file) => (
                    <ListItemButton
                      key={file.filename}
                      onClick={async () => {
                        var path = require("./files/" + file.filename);
                        let response = await fetch(path);
                        let data = await response.blob();
                        var f = new File([data], file.filename, {
                          lastModified: new Date().getTime(),
                          type: data.type,
                        });
                        onFilesChange([f]);
                        setExpanded(file.expanded);
                      }}
                    >
                      <ListItemText
                        primary={file.filename}
                        secondary={file.duration + " ~ " + file.size}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </div>
            </Stack>

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
              </>
            )}

            {specData != null && (
              <Plot
                data={specData}
                layout={{
                  title: "Spectrogram",
                  xaxis: {
                    title: {
                      text: "Time (s)",
                    },
                    tickvals: x_tickvals,
                    ticktext: x_ticktext,
                  },
                  yaxis: {
                    title: {
                      text: "Frequency (kHz)",
                    },
                    tickvals: [
                      0.0, 17.133333333333333, 34.266666666666666, 51.4,
                      68.53333333333333, 85.66666666666666, 102.8,
                      119.93333333333334, 137.06666666666666, 154.2,
                      171.33333333333331, 188.46666666666667, 205.6,
                      222.73333333333332, 239.86666666666667, 256.0,
                    ],
                    ticktext: [
                      0.0, 9.4, 18.7, 28.1, 37.5, 46.8, 56.2, 65.6, 74.9, 84.3,
                      93.7, 103.0, 112.4, 121.8, 131.1, 140.5,
                    ],
                  },
                }}
              />
            )}

            {chartData != null && (
              <>
                <Plot
                  data={chartData}
                  layout={{
                    title: "Predictions",
                    xaxis: {
                      domain: [0.15, 1],
                    },
                    height: 600,
                  }}
                />
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
        <Stack spacing={2} alignItems="center">
          <CircularProgress
            variant={loading < 100 ? "determinate" : "indeterminate"}
            value={loading}
            color="inherit"
          />
          <Typography variant="text" color="inherit">
            {loadingText}
          </Typography>
        </Stack>
      </Backdrop>
    </ThemeProvider>
  );
}

export default BAT;
