import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import { buttonClass, type ButtonLook } from './buttonClass'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonLook

export function Button({ variant, size, fullWidth, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass({ variant, size, fullWidth }, className)} {...rest} />
}

/** A navigation link that looks like a button. */
export function ButtonLink({ variant, size, fullWidth, className, ...rest }: LinkProps & ButtonLook) {
  return <Link className={buttonClass({ variant, size, fullWidth }, className)} {...rest} />
}
