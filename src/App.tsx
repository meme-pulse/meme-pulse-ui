import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Pool from './Pool';
import PoolDetail from './PoolDetail';
import Swap from './Swap';
import { Header } from './components/Header';
import { CreatePool } from './CreatePool';
import { Toaster } from 'sonner';
import Portfolio from './Portfolio';
import { Footer } from './components/ui/footer';
import NotFound from './components/not-found';

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Navigate to="/pool" />} />
        <Route path="/swap" element={<Swap />} />
        <Route path="/pool" element={<Pool />} />
        <Route path="/pool/v22/:tokenAAddress/:tokenBAddress/:lbBinStep" element={<PoolDetail />} />
        <Route path="/pool/v22/create" element={<CreatePool />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <Toaster position="bottom-right" />
    </Router>
  );
}

export default App;
