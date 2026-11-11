export type DiseaseGroup = 'mpox' | 'gono_chlam' | 'syphilis' | 'hiv'
export type ReportSource = 'clinic_code' | 'hiv_self_test' | 'symptoms'
export type LifecycleStep = 'new' | 'followup' | 'expiring' | 'expired'
export type ExposureBand = 'h72' | 'w2' | 'w4' | 'm3'
export type DensityBand = 'thin' | 'medium' | 'dense'
export type AreaState = 'shown' | 'below_threshold' | 'no_data' | 'no_partner'
export type Party = 'phone' | 'clinic' | 'operator' | 'public'

/** What a self-sent link carries. It lives only in the URL fragment. */
export interface Notice {
  v: 1
  group: DiseaseGroup | null
  tier: 1 | 2
  band: ExposureBand
  week: string
}

export interface SignalReport {
  group: DiseaseGroup
  week: string
}

export interface PublishedArea {
  areaId: string
  state: AreaState
  density: DensityBand | null
  step: Exclude<LifecycleStep, 'expired'> | 'mixed' | null
}

export interface PublishedFile {
  week: string
  areas: PublishedArea[]
}

export interface Advice {
  title: string
  steps: string[]
  urgent: boolean
}
