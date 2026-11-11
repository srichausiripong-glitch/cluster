import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'lg'
}

const VARIANT = {
  primary: 'bg-care text-white hover:brightness-95',
  secondary: 'border border-line bg-surface text-ink hover:bg-bg',
  ghost: 'text-care-ink hover:bg-care-soft',
} as const

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }: Props) {
  const sizing = size === 'lg' ? 'min-h-13 px-5 text-[17px]' : 'min-h-11 px-4 text-[15px]'
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md text-center font-medium leading-snug transition active:scale-[0.98] disabled:cursor-not-allowed disabled:border disabled:border-line disabled:bg-veil disabled:text-muted disabled:hover:brightness-100 ${VARIANT[variant]} ${sizing} ${className}`}
      {...rest}
    />
  )
}
