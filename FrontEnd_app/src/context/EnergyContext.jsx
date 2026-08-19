import { createContext, useContext, useEffect, useState } from 'react'
import { getEnergyStatus } from '../services/energyApi'
import UpgradePremiumModal from '../components/energy/UpgradePremiumModal'
import InsufficientEnergyModal from '../components/energy/InsufficientEnergyModal'

const EnergyContext = createContext(null)

export function EnergyProvider({ children }) {
  const [energy, setEnergy] = useState(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showInsufficientModal, setShowInsufficientModal] = useState(false)
  const [insufficientModalData, setInsufficientModalData] = useState(null)

  const refreshEnergy = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setEnergy(null)
      return null
    }
    try {
      const data = await getEnergyStatus()
      setEnergy(data)
      return data
    } catch {
      return null
    }
  }

  const updateEnergy = (newEnergy) => {
    if (newEnergy) {
      setEnergy(newEnergy)
    }
  }

  const openUpgradeModal = () => setShowUpgradeModal(true)
  const closeUpgradeModal = () => setShowUpgradeModal(false)

  const openInsufficientModal = (customData = null) => {
    if (customData) setInsufficientModalData(customData)
    setShowInsufficientModal(true)
  }
  const closeInsufficientModal = () => {
    setShowInsufficientModal(false)
    setInsufficientModalData(null)
  }

  useEffect(() => {
    refreshEnergy()
  }, [])

  return (
    <EnergyContext.Provider
      value={{
        energy,
        refreshEnergy,
        updateEnergy,
        openUpgradeModal,
        closeUpgradeModal,
        openInsufficientModal,
        closeInsufficientModal,
      }}
    >
      {children}
      <UpgradePremiumModal
        isOpen={showUpgradeModal}
        onClose={closeUpgradeModal}
        energy={energy}
        onEnergyUpdated={updateEnergy}
      />
      <InsufficientEnergyModal
        isOpen={showInsufficientModal}
        onClose={closeInsufficientModal}
        energy={insufficientModalData || energy}
        onOpenUpgrade={() => {
          closeInsufficientModal()
          openUpgradeModal()
        }}
      />
    </EnergyContext.Provider>
  )
}

export function useEnergy() {
  const context = useContext(EnergyContext)
  if (!context) {
    return {
      energy: null,
      refreshEnergy: async () => null,
      updateEnergy: () => {},
      openUpgradeModal: () => {},
      closeUpgradeModal: () => {},
      openInsufficientModal: () => {},
      closeInsufficientModal: () => {},
    }
  }
  return context
}
