import {
  FiActivity,
  FiAperture,
  FiBook,
  FiBox,
  FiBriefcase,
  FiCpu,
  FiDatabase,
  FiFeather,
  FiFileText,
  FiFlag,
  FiGlobe,
  FiGrid,
  FiHome,
  FiLayout,
  FiMonitor,
  FiPackage,
  FiPenTool,
  FiPlay,
  FiSettings,
  FiSliders,
  FiTool,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from 'react-icons/fi'
import type { IconType } from 'react-icons'

export const ICON_CATALOG: Record<string, IconType> = {
  FiActivity,
  FiAperture,
  FiBook,
  FiBox,
  FiBriefcase,
  FiCpu,
  FiDatabase,
  FiFeather,
  FiFileText,
  FiFlag,
  FiGlobe,
  FiGrid,
  FiHome,
  FiLayout,
  FiMonitor,
  FiPackage,
  FiPenTool,
  FiPlay,
  FiSettings,
  FiSliders,
  FiTool,
  FiTrendingUp,
  FiUsers,
  FiZap,
}

export const ICON_OPTIONS = Object.keys(ICON_CATALOG).map((key) => ({
  value: key,
  label: key.replace(/^Fi/, ''),
}))

export const resolveIcon = (iconKey: string, size = 18) => {
  if (iconKey && iconKey.startsWith('data:')) {
    return (
      <img
        src={iconKey}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    )
  }
  const IconComponent = ICON_CATALOG[iconKey] || FiGrid
  return <IconComponent size={size} />
}

export type IconOption = typeof ICON_OPTIONS[number]
