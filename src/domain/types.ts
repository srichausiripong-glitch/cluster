export type DiseaseGroup = 'mpox' | 'gono_chlam' | 'syphilis' | 'hiv'
export type ReportSource = 'clinic_code' | 'hiv_self_test' | 'symptoms'
export type LifecycleStep = 'new' | 'followup' | 'expiring' | 'expired'
/** How long ago the last contact was. `older` also covers "not sure". */
export type ExposureBand = 'h72' | 'w2' | 'w4' | 'm3' | 'older'
export type DensityBand = 'thin' | 'medium' | 'dense'
export type AreaState = 'shown' | 'below_threshold' | 'no_data' | 'suspended'
/** What a report on the server is about: a positive result of a mapped group, or "tested" with no result (amendment 4.4). */
export type ReportKind = 'gono_chlam' | 'syphilis' | 'tested'
/** How much testing a zone reports over the last twelve weeks. Shown in the zone's sheet only. */
export type TestingLevel = 'low' | 'medium' | 'high'
export type Party = 'phone' | 'clinic' | 'operator' | 'public'

/** What a self-sent link carries. It lives only in the URL fragment. */
export interface Notice {
  v: 1
  group: DiseaseGroup | null
  tier: 1 | 2
  band: ExposureBand
  week: string
  /** Weekly fast-track code. It tells a clinic the disease group even when the page names none. */
  code: string
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
  testing: TestingLevel | null
}

/** The weekly file the server publishes and every phone reads. */
export interface PublishedFile {
  week: string
  publishedAt: string
  intakeOpen: boolean
  areas: PublishedArea[]
}

export interface Advice {
  title: string
  steps: string[]
  urgent: boolean
  /** The clinical register ids of the title and each step, in order. */
  ids: { title: string; steps: string[] }
}
