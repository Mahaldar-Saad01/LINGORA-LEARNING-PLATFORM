import AppRoutes from './routes/AppRoutes'
import { EnergyProvider } from './context/EnergyContext'

function App() {
  return (
    <EnergyProvider>
      <AppRoutes />
    </EnergyProvider>
  )
}

export default App
