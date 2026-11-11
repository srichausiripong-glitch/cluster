import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'lg'
}

/** A pressable thing is a flat shape with a black outline and a hard shadow; pressing sinks it onto the shadow. */
const RAISED = 'border-2 border-ink shadow-pop enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-none'
const VARIANT = {
  primary: `bg-care text-ink ${RAISED}`,
  secondary: `bg-surface text-ink ${RAISED}`,
  ghost: 'text-ink underline underline-offset-4 hover:bg-care-soft',
} as const

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }: Props) {
  const sizing = size === 'lg' ? 'min-h-13 px-5 text-[17px]' : 'min-h-11 px-4 text-[15px]'
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md text-center font-semibold leading-snug transition-[transform,box-shadow] duration-75 disabled:cursor-not-allowed disabled:border-ink/40 disabled:bg-veil disabled:text-muted disabled:shadow-none ${VARIANT[variant]} ${sizing} ${className}`}
      {...rest}
    />
  )
}
