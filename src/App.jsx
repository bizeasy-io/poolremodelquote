import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import RepApp from './rep/RepApp'
import SelfBooking from './pages/SelfBooking'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/rep/*" element={<RepApp />} />
        <Route path="/book/:token" element={<SelfBooking />} />
      </Routes>
    </BrowserRouter>
  )
}
