// Class lists shared by many screens, so that one kind of thing looks and presses the same everywhere.

/** A box that can be pressed carries a hard shadow and sinks onto it while it is pressed. For buttons and links alike. */
export const PRESS = 'shadow-pop transition-[transform,box-shadow] duration-75 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'
/** A link drawn as the main button. */
export const PRIMARY_LINK = `flex min-h-13 items-center justify-center gap-2 rounded-md border-2 border-ink bg-care px-5 text-center text-[17px] font-bold text-ink ${PRESS}`
/** A link drawn as a second button. */
export const QUIET_LINK = `box flex min-h-11 items-center justify-center gap-2 px-4 text-center font-semibold ${PRESS}`
/** A note: a flat box on the cream ground. It cannot be pressed, so it has no shadow. */
export const NOTE = 'rounded-md border-2 border-ink bg-bg'
/** The answer to something a person just did, or a choice that is on: soft pink with the black edge. */
export const SOFT = 'rounded-md border-2 border-ink bg-care-soft'
/** Something went wrong or needs a second look: yellow with the black edge. There is no red in this look. */
export const ALERT = 'rounded-md border-2 border-ink bg-yellow text-ink'
/** A link written as words. */
export const TEXT_LINK = 'font-semibold text-ink underline underline-offset-4'
