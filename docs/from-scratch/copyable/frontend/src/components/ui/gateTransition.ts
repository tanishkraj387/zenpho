import { createContext, useContext } from 'react'
import type { Location } from 'react-router-dom'

export type GateTransition = (action: () => void, title?: string) => void
export const GateContext = createContext<GateTransition>((action) => action())
export const GateLocationContext = createContext<Location | null>(null)
export const GateReadinessContext = createContext<(ready: boolean) => void>(() => {})
export const useGateTransition = () => useContext(GateContext)
export const useGateLocation = () => useContext(GateLocationContext)
export const useGateReadiness = () => useContext(GateReadinessContext)
