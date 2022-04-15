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

import { WaveSurfer, WaveForm, Region, Marker } from "wavesurfer-react";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions.min";

const theme = createTheme();

function App() {
  const [regions, setRegions] = useState([]);

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
              options={[
                { label: "ResNet-50", id: 1 },
                { label: "BAT-1", id: 2 },
                { label: "BAT-2", id: 3 },
                { label: "BAT-3", id: 4 },
              ]}
              sx={{ width: 300 }}
              renderInput={(params) => <TextField {...params} label="Model" />}
            />

            <Button variant="contained">Predict</Button>
            <Button variant="contained" onClick={() => play()}>
              Play / Pause
            </Button>
          </Stack>
        </Stack>
      </main>
    </ThemeProvider>
  );
}

export default App;
