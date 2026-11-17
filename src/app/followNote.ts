import { th } from '../copy/th'
import type { FollowResult } from '../push/follow'

/** Why following did not happen, in words (redesign spec 5.11). */
export const FOLLOW_NOTE: Record<Exclude<FollowResult, 'following'>, string> = {
  'home-screen': th.follow.homeScreen,
  unsupported: th.follow.unsupported,
  denied: th.follow.denied,
  failed: th.follow.failed,
}
