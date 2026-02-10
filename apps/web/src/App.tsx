import React from "react";
import { Link, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Capture from "./pages/Capture";
import Review from "./pages/Review";
import Report from "./pages/Report";
import Simulator from "./pages/Simulator";

export default function App() {
  return (
    <>
      <header style={{ borderBottom: "1px solid #22252e", background: "#0b0c10" }}>
        <div className="container" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap: 14, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background:"#2ea043" }} />
            <strong>Evidence Layer</strong>
            <span className="badge">MVP</span>
          </div>
          <nav style={{ display:"flex", gap: 12, flexWrap:"wrap" }}>
            <Link to="/">Home</Link>
            <Link to="/capture">Capture</Link>
            <Link to="/report">Report</Link>
            <Link to="/review">Review</Link>
            <Link to="/simulator">Simulator</Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ paddingTop: 16, paddingBottom: 32 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/report" element={<Report />} />
          <Route path="/review" element={<Review />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer style={{ borderTop: "1px solid #22252e" }}>
        <div className="container" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <small>Unofficial citizen transparency tool · Evidence-first · Do not interfere with polling operations.</small>
        </div>
      </footer>
    </>
  );
}
