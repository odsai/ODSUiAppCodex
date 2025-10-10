import {
  FiActivity,
  FiAperture,
  FiBarChart2,
  FiBold,
  FiBook,
  FiBookOpen,
  FiBox,
  FiBriefcase,
  FiCalendar,
  FiClipboard,
  FiCloud,
  FiCloudLightning,
  FiCode,
  FiCodepen,
  FiCoffee,
  FiCommand,
  FiCompass,
  FiCpu,
  FiDatabase,
  FiDollarSign,
  FiDownloadCloud,
  FiDroplet,
  FiEdit,
  FiFeather,
  FiFigma,
  FiFilePlus,
  FiFileText,
  FiFilm,
  FiFilter,
  FiFlag,
  FiFramer,
  FiGitBranch,
  FiGitCommit,
  FiGitPullRequest,
  FiGitlab,
  FiGlobe,
  FiGrid,
  FiHardDrive,
  FiHash,
  FiHeadphones,
  FiHexagon,
  FiHome,
  FiImage,
  FiInbox,
  FiItalic,
  FiLayers,
  FiLayout,
  FiLifeBuoy,
  FiLink,
  FiList,
  FiLogIn,
  FiLogOut,
  FiMail,
  FiMap,
  FiMessageCircle,
  FiMonitor,
  FiNavigation,
  FiOctagon,
  FiPackage,
  FiPaperclip,
  FiPauseCircle,
  FiPenTool,
  FiPieChart,
  FiPlay,
  FiPlayCircle,
  FiPocket,
  FiPower,
  FiRefreshCcw,
  FiRss,
  FiScissors,
  FiServer,
  FiSettings,
  FiShare2,
  FiShield,
  FiSidebar,
  FiSlack,
  FiSliders,
  FiSmartphone,
  FiSmile,
  FiSquare,
  FiStar,
  FiStopCircle,
  FiSun,
  FiSunrise,
  FiSunset,
  FiTablet,
  FiTarget,
  FiTerminal,
  FiTool,
  FiTrello,
  FiTrendingUp,
  FiTv,
  FiType,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
  FiVideo,
  FiWifi,
  FiWind,
  FiXOctagon,
  FiZap,
  FiZapOff,
} from 'react-icons/fi'
import type { IconType } from 'react-icons'

export const ICON_CATALOG: Record<string, IconType> = {
  FiActivity,
  FiAperture,
  FiBarChart2,
  FiBold,
  FiBook,
  FiBookOpen,
  FiBox,
  FiBriefcase,
  FiCalendar,
  FiClipboard,
  FiCloud,
  FiCloudLightning,
  FiCode,
  FiCodepen,
  FiCoffee,
  FiCommand,
  FiCompass,
  FiCpu,
  FiDatabase,
  FiDollarSign,
  FiDownloadCloud,
  FiDroplet,
  FiEdit,
  FiFeather,
  FiFigma,
  FiFilePlus,
  FiFileText,
  FiFilm,
  FiFilter,
  FiFlag,
  FiFramer,
  FiGitBranch,
  FiGitCommit,
  FiGitPullRequest,
  FiGitlab,
  FiGlobe,
  FiGrid,
  FiHardDrive,
  FiHash,
  FiHeadphones,
  FiHexagon,
  FiHome,
  FiImage,
  FiInbox,
  FiItalic,
  FiLayers,
  FiLayout,
  FiLifeBuoy,
  FiLink,
  FiList,
  FiLogIn,
  FiLogOut,
  FiMail,
  FiMap,
  FiMessageCircle,
  FiMonitor,
  FiNavigation,
  FiOctagon,
  FiPackage,
  FiPaperclip,
  FiPauseCircle,
  FiPenTool,
  FiPieChart,
  FiPlay,
  FiPlayCircle,
  FiPocket,
  FiPower,
  FiRefreshCcw,
  FiRss,
  FiScissors,
  FiServer,
  FiSettings,
  FiShare2,
  FiShield,
  FiSidebar,
  FiSlack,
  FiSliders,
  FiSmartphone,
  FiSmile,
  FiSquare,
  FiStar,
  FiStopCircle,
  FiSun,
  FiSunrise,
  FiSunset,
  FiTablet,
  FiTarget,
  FiTerminal,
  FiTool,
  FiTrello,
  FiTrendingUp,
  FiTv,
  FiType,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
  FiVideo,
  FiWifi,
  FiWind,
  FiXOctagon,
  FiZap,
  FiZapOff,
}

export type IconCategory =
  | 'Navigation & Layout'
  | 'Communication'
  | 'Media & Playback'
  | 'Productivity & Docs'
  | 'Design & Development'
  | 'Data & Analytics'
  | 'Commerce & Logistics'
  | 'Status & Alerts'
  | 'User & Access'
  | 'System & Devices'
  | 'Lifestyle & Misc'

const ICON_GROUP_DEFS: Array<{ group: IconCategory; icons: string[] }> = [
  {
    group: 'Navigation & Layout',
    icons: ['FiCompass', 'FiNavigation', 'FiMap', 'FiGlobe', 'FiGrid', 'FiLayout', 'FiSidebar', 'FiList', 'FiPackage', 'FiBox', 'FiHome'],
  },
  {
    group: 'Communication',
    icons: ['FiMail', 'FiMessageCircle', 'FiSlack', 'FiShare2', 'FiPaperclip', 'FiLink', 'FiWifi', 'FiRss', 'FiInbox'],
  },
  {
    group: 'Media & Playback',
    icons: ['FiPlay', 'FiPlayCircle', 'FiPauseCircle', 'FiVideo', 'FiFilm', 'FiTv', 'FiHeadphones', 'FiImage', 'FiStopCircle'],
  },
  {
    group: 'Productivity & Docs',
    icons: ['FiCalendar', 'FiClipboard', 'FiBook', 'FiBookOpen', 'FiFileText', 'FiFilePlus', 'FiEdit', 'FiFeather', 'FiPenTool', 'FiBold', 'FiItalic', 'FiType'],
  },
  {
    group: 'Design & Development',
    icons: ['FiFigma', 'FiFramer', 'FiCode', 'FiCodepen', 'FiCommand', 'FiTerminal', 'FiTool', 'FiSettings', 'FiCpu', 'FiMonitor', 'FiGitBranch', 'FiGitCommit', 'FiGitPullRequest', 'FiGitlab', 'FiLayers', 'FiHash', 'FiScissors'],
  },
  {
    group: 'Data & Analytics',
    icons: ['FiBarChart2', 'FiPieChart', 'FiTrendingUp', 'FiDatabase', 'FiServer', 'FiDownloadCloud', 'FiRefreshCcw', 'FiActivity', 'FiFilter'],
  },
  {
    group: 'Commerce & Logistics',
    icons: ['FiDollarSign', 'FiPocket', 'FiBriefcase', 'FiHardDrive'],
  },
  {
    group: 'Status & Alerts',
    icons: ['FiFlag', 'FiTarget', 'FiSun', 'FiSunrise', 'FiSunset', 'FiCloudLightning', 'FiDroplet', 'FiWind', 'FiZap', 'FiZapOff', 'FiXOctagon'],
  },
  {
    group: 'User & Access',
    icons: ['FiUsers', 'FiUserPlus', 'FiUserCheck', 'FiLogIn', 'FiLogOut', 'FiShield', 'FiLifeBuoy'],
  },
  {
    group: 'System & Devices',
    icons: ['FiSmartphone', 'FiTablet', 'FiPower'],
  },
]

const assignedIcons = new Set<string>()
ICON_GROUP_DEFS.forEach(({ icons }) => icons.forEach((icon) => assignedIcons.add(icon)))

const remainingIcons = Object.keys(ICON_CATALOG)
  .filter((icon) => !assignedIcons.has(icon))
  .sort((a, b) => a.localeCompare(b))
if (remainingIcons.length) {
  ICON_GROUP_DEFS.push({ group: 'Lifestyle & Misc', icons: remainingIcons })
}

export type IconOption = { value: string; label: string; group: IconCategory }

export const ICON_OPTIONS: IconOption[] = ICON_GROUP_DEFS.flatMap(({ group, icons }) =>
  icons
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .filter((icon) => ICON_CATALOG[icon])
    .map((icon) => ({
      value: icon,
      label: icon.replace(/^Fi/, ''),
      group,
    })),
)

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
