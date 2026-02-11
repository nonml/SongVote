import React from "react";
import { Link, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import ElectionNightCapture from "./components/ElectionNightCapture";
import Review from "./pages/Review";
import Report from "./pages/Report";
import Simulator from "./pages/Simulator";
import StationPage from "./pages/StationPage";
import PublicBoard from "./pages/PublicBoard";
import Methodology from "./pages/Methodology";
import LegalKit from "./pages/LegalKit";
import TrustSafetyDashboard from "./components/TrustSafetyDashboard";
import ScenarioReport from "./pages/ScenarioReport";

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
            <Link to="/public-board">Public Board</Link>
            <Link to="/methodology">Methodology</Link>
            <Link to="/legal-kit">Legal Kit</Link>
            <Link to="/trust-safety">Trust & Safety</Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ paddingTop: 16, paddingBottom: 32 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/capture" element={<ElectionNightCapture />} />
          <Route path="/report" element={<Report />} />
          <Route path="/review" element={<Review />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/simulator/report" element={<ScenarioReport />} />
          <Route path="/public-board" element={<PublicBoard />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/legal-kit" element={<LegalKit />} />
          <Route path="/trust-safety" element={<TrustSafetyDashboard />} />
          <Route path="/station/:stationId" element={<StationPage />} />
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
