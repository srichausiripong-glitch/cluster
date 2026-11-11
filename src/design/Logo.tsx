import mark from './logo/mark.png'
import word from './logo/word.png'

/**
 * The founder's logo: three figures holding each other, and the word "cluster" in Latin letters.
 * Both pictures are cut from the founder's file by scripts/logo/cut.py. `size` is the text size the
 * old word mark took, so the logo sits where the word mark sat.
 */
export function Logo({ size = 18 }: { size?: number }) {
  return (
    <span role="img" aria-label="cluster" className="inline-flex shrink-0 items-center" style={{ gap: size * 0.35 }}>
      <img src={mark} alt="" style={{ height: size * 2, width: 'auto' }} />
      <img src={word} alt="" style={{ height: size * 1.4, width: 'auto', marginTop: size * 0.15 }} />
    </span>
  )
}
