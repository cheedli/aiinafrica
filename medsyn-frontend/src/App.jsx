import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Home from './pages/Home'
import Investigation from './pages/Investigation'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Patients from './pages/Patients'
import Benchmark from './pages/Benchmark'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/investigate" element={<Investigation />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/benchmark" element={<Benchmark />} />
      </Routes>
    </BrowserRouter>
  )
}
