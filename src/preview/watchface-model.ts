/**
 * Declarative WatchFace Schema / Model for Garmin Fenix 7
 * Resolution: 260x260 Circular Viewport (Center: 130, 130)
 */

export type ThemeStyle = 'pilot' | 'tactical' | 'sport' | 'minimal' | 'custom'
export type ClockType = 'analog' | 'digital' | 'hybrid'
export type ComplicationType = 'heart_rate' | 'battery' | 'steps' | 'calories' | 'date' | 'altitude' | 'floors'
export type ComplicationStyle = 'arc_progress' | 'icon_value' | 'bar_progress' | 'badge'

export interface DialConfig {
  showTicks: boolean
  tickColor: string
  subTicks: boolean // 60-second vs 12-hour ticks
  showNumbers: boolean
  numberColor: string
  radius: number // defaults to 120
}

export interface DigitalClockConfig {
  x: number
  y: number
  font: 'NUMBER_HOT' | 'NUMBER_MILD' | 'LARGE' | 'MEDIUM'
  color: string
  showSeconds: boolean
  showAmPm: boolean
}

export interface AnalogHandsConfig {
  hourColor: string
  minuteColor: string
  secondColor: string
  hourLength: number  // e.g. 55
  minuteLength: number // e.g. 85
  secondLength: number // e.g. 100
  hourWidth: number   // e.g. 4
  minuteWidth: number // e.g. 3
  secondWidth: number // e.g. 1
  accentTail: boolean
}

export interface ComplicationItem {
  id: string
  type: ComplicationType
  label?: string
  position: { x: number; y: number }
  style: ComplicationStyle
  color: string
  size?: number
}

export interface WatchFaceSpec {
  name: string
  theme: ThemeStyle
  targetDevice: 'fenix7'
  backgroundColor: string
  dial?: DialConfig
  clockType: ClockType
  digitalClock?: DigitalClockConfig
  analogHands?: AnalogHandsConfig
  complications: ComplicationItem[]
}

/**
 * Mock Hardware & Sensor Runtime State for Live Simulation
 */
export interface SimulationState {
  hours: number
  minutes: number
  seconds: number
  heartRate: number
  batteryPercent: number
  steps: number
  stepGoal: number
  calories: number
  altitudeMeters: number
  dateString: string
  dayOfWeek: string
  isSleepMode: boolean
}

export const DEFAULT_SIMULATION_STATE: SimulationState = {
  hours: 10,
  minutes: 8,
  seconds: 42,
  heartRate: 78,
  batteryPercent: 86,
  steps: 7420,
  stepGoal: 10000,
  calories: 480,
  altitudeMeters: 350,
  dateString: '10-24',
  dayOfWeek: 'WED',
  isSleepMode: false
}
