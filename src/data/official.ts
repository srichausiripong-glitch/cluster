/** Official figures shown under "ตัวเลขทางการ", each copied from its source on the day read. Empty until a source is found (v1 plan, Task 4). */
export interface OfficialFigure {
  label: string
  period: string
  value: string
  source: string
  read: string
}
export const OFFICIAL: OfficialFigure[] = []
