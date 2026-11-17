import { th } from '../copy/th'
import { Emoji } from '../design/Emoji'
import type { EmojiName } from '../design/emojiCodes'
import { PRESS } from '../design/look'
import type { MapLayer } from '../domain/types'
import { MAP_LAYERS } from '../store/actions'

const EMOJI: Record<MapLayer, EmojiName> = { confirmed: 'confirmed', symptoms: 'feverish', sti: 'testTube', health_centre: 'stethoscope', hospital: 'hospital', pharmacy: 'pill' }
/** A switch that is on takes the colour of its mark on the map: violet dots, the black hatch, pink pins. */
const ON: Record<MapLayer, string> = {
  confirmed: 'bg-signal text-white',
  symptoms: 'bg-ink text-white',
  sti: 'bg-care text-ink',
  health_centre: 'bg-care text-ink',
  hospital: 'bg-care text-ink',
  pharmacy: 'bg-care text-ink',
}

/**
 * The six layers of the map as switches in one row (redesign spec 5.1). The row scrolls on its own,
 * so a narrow screen never scrolls sideways.
 */
export function LayerChips({ on, onToggle }: { on: Record<MapLayer, boolean>; onToggle: (layer: MapLayer) => void }) {
  return (
    <div role="group" aria-label={th.home.layers} className="flex flex-nowrap gap-2 overflow-x-auto px-3 pb-1.5">
      {MAP_LAYERS.map((layer) => (
        <button
          key={layer}
          type="button"
          aria-pressed={on[layer]}
          onClick={() => onToggle(layer)}
          className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-ink px-3 text-[13px] font-bold ${PRESS} ${on[layer] ? ON[layer] : 'bg-surface text-muted'}`}
        >
          <Emoji name={EMOJI[layer]} size={18} />
          {th.layers[layer]}
        </button>
      ))}
    </div>
  )
}
