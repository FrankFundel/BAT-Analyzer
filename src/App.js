import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import BAT from "./BAT";
import GAN from "./GAN";

function App() {
  return (
    <Router>
      <Routes>
        <Route exact path="/" exact element={<BAT />} />
        <Route path="/gan" element={<GAN />} />
      </Routes>
    </Router>
  );
}

export default App;
