// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HealthCheckupForm from "./pages/HealthCheckupForm"; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HealthCheckupForm />} />
        <Route
          path="/corporates/fiserv"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
