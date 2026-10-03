import { ICONS, type IconName } from './iconPaths'

interface IconProps {
  name: IconName
  size?: number
  className?: string
  /** Accessible label; without one the icon is decorative. */
  label?: string
}

export function Icon({ name, size = 24, className, label }: IconProps) {
  const icon = ICONS[name]
  return (
    <svg
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill="none"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ display: 'block', flexShrink: 0 }}
      // Static markup from the design-system icon set — never user input.
      dangerouslySetInnerHTML={{ __html: icon.markup }}
    />
  )
}
