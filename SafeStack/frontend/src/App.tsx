import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ScanResults from './pages/ScanResults';
import VulnerabilityDetail from './pages/VulnerabilityDetail';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scan/:scanId/results" element={<ScanResults />} />
          <Route path="/vulnerability/:id" element={<VulnerabilityDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;
