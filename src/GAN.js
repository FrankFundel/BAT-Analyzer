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

const theme = createTheme();

function GAN() {
  const [values, setValues] = useState(
    tf.randomNormal([1, 16, 1, 1]).dataSync()
  );
  const [model, setModel] = useState(null);
  const canvasRef = useRef(null);

  const generateImage = async (input) => {
    var result = await model.predict(input);
    result = result.add(tf.ones([1, 1, 64, 128])).mul(0.5);
    await tf.browser.toPixels(tf.squeeze(result), canvasRef.current);
    input.dispose();
    result.dispose();
  };

  useEffect(() => {
    if (values[0]) {
      var input = tf.tensor([values]).expandDims(-1).expandDims(-1);
      generateImage(input);
    }
  }, [model, values]);

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
            <Stack direction="row" spacing={-1}>
              <Stack
                spacing={0}
                style={{
                  width: "100%",
                }}
              >
                {Array.from({ length: 16 }, (item, index) => (
                  <div key={index.toString()}>
                    <Typography color="inherit">#{index} (nan)</Typography>
                    <Slider
                      min={-5}
                      max={5}
                      step={0.01}
                      value={values[index]}
                      onChange={(e) => {
                        var v = [...values];
                        v[index] = e.target.value;
                        setValues(v);
                      }}
                    />
                  </div>
                ))}
              </Stack>

              <canvas
                ref={canvasRef}
                width={128}
                height={64}
                style={{
                  transform: "rotate(270deg)",
                  width: "100%",
                  height: "50%",
                  maxWidth: 400,
                  maxHeight: 200,
                  position: "sticky",
                  right: 0,
                  top: 200,
                }}
              />
            </Stack>
          </Container>
        </ModelProvider>
      </main>
    </ThemeProvider>
  );
}

export default GAN;
