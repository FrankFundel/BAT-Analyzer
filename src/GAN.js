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
import Slider from "@mui/material/Slider";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useModel, ModelProvider } from "react-tensorflow";
import * as tf from "@tensorflow/tfjs";
import Plotly from "./components/CustomPlotly";
import createPlotlyComponent from "react-plotly.js/factory";
const Plot = createPlotlyComponent(Plotly);

const theme = createTheme();

const axios = require("axios").default;

function GAN() {
  const [values, setValues] = useState(
    tf.randomNormal([1, 16, 1, 1]).dataSync()
  );
  const [model, setModel] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(0);

  const generateImage = async (input) => {
    var result = await model.predict(input);
    result = result.add(tf.ones([1, 1, 64, 128])).mul(0.5);
    setImageData([
      {
        z: tf.squeeze(result).transpose().arraySync(),
        type: "heatmap",
        colorscale: "Viridis",
        showscale: true,
      },
    ]);

    input.dispose();
    result.dispose();
  };

  useEffect(() => {
    if (values[0]) {
      var input = tf.tensor([values]).expandDims(-1).expandDims(-1);
      generateImage(input);
    }
  }, [model, values]);

  const play = () => {
    if (imageData.length == 0) return;
    setLoading(100);

    let formData = new FormData();
    formData.append("data", JSON.stringify(imageData[0].z));

    axios
      .request("https://frank-bat.herokuapp.com/play", {
        method: "post",
        data: formData,
        headers: {
          Accept: "audio/wav",
        },
        responseType: "blob",
      })
      .then((response) => {
        setLoading(0);

        var blob = new Blob([response.data], { type: "audio/wav" });
        var blobUrl = URL.createObjectURL(blob);
        var audio = new Audio(blobUrl);
        audio.play();
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
            BATGAN
          </Typography>
          <Button
            variant="contained"
            color="info"
            style={{ marginLeft: 12 }}
            href="/"
          >
            BAT
          </Button>
        </Toolbar>
      </AppBar>

      <main style={{ margin: 24 }}>
        <ModelProvider
          url={window.location.origin + "/tfmodel/batgan.json"}
          layers={true}
          onLoadCallback={(m) => {
            setModel(m);
          }}
        >
          <Container maxWidth="md">
            <Typography
              variant="h6"
              color="inherit"
              noWrap
              style={{ marginBottom: 24 }}
            >
              See just noise? Refresh the page to have a new call generated for
              you 😉
            </Typography>
            <Stack direction="row" spacing={-1}>
              <div
                style={{
                  width: 400,
                }}
              >
                {Array.from({ length: 16 }, (item, index) => (
                  <div key={index.toString()}>
                    <Typography color="inherit">#{index} (unknown)</Typography>
                    <Slider
                      min={-3}
                      max={3}
                      step={0.01}
                      valueLabelDisplay="auto"
                      value={values[index]}
                      onChange={(e) => {
                        var v = [...values];
                        v[index] = e.target.value;
                        setValues(v);
                      }}
                    />
                  </div>
                ))}
              </div>
              <div
                style={{
                  position: "sticky",
                  top: 0,
                }}
              >
                <Plot
                  data={imageData}
                  layout={{
                    title: "Fake bat call",
                    xaxis: {
                      title: {
                        text: "Time (ms)",
                      },
                      tickvals: [0.0, 12.8, 25.6, 38.4, 51.2, 63.0],
                      ticktext: [0, 5, 10, 15, 20, 25],
                    },
                    yaxis: {
                      title: {
                        text: "Frequency (kHz)",
                      },
                      tickvals: [
                        0.0, 8.533333333333333, 17.066666666666666, 25.6,
                        34.13333333333333, 42.666666666666664, 51.2,
                        59.733333333333334, 68.26666666666667, 76.8,
                        85.33333333333333, 93.86666666666666, 102.4,
                        110.93333333333334, 119.46666666666667, 127.0,
                      ],
                      ticktext: [
                        0.0, 9.4, 18.7, 28.1, 37.5, 46.8, 56.2, 65.6, 74.9,
                        84.3, 93.7, 103.0, 112.4, 121.8, 131.1, 140.5,
                      ],
                    },
                  }}
                  style={{
                    width: 400,
                    height: 700,
                  }}
                />
                <Button
                  variant="contained"
                  color="info"
                  style={{
                    width: "80%",
                    marginLeft: "10%",
                    marginRight: "10%",
                  }}
                  onClick={() => play()}
                >
                  Play
                </Button>
                <Typography
                  variant="h6"
                  color="inherit"
                  style={{
                    width: "80%",
                    marginLeft: "10%",
                    marginRight: "10%",
                    marginTop: 16,
                  }}
                >
                  You can now even play your fake calls with 1:10 time
                  expansion.
                </Typography>
              </div>
            </Stack>
          </Container>
        </ModelProvider>
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

export default GAN;
