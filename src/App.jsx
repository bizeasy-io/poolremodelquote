import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import RepApp from './rep/RepApp'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/rep/*" element={<RepApp />} />
      </Routes>
    </BrowserRouter>
  )
}
