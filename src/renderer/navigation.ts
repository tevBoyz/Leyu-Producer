export type ScreenId =
  | 'episodes'
  | 'episode-editor'
  | 'questions'
  | 'validation'
  | 'compatibility-preview'
  | 'export'
  | 'settings'

export interface NavItem {
  id: ScreenId
  label: string
  /** Shown in sidebar; episode workflow screens need a selected episode. */
  requiresEpisode?: boolean
  description?: string
}

export interface NavSection {
  label: string
  items: NavItem[]
}

/** Sidebar navigation — episode editor is opened from Episodes, not the sidebar. */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Library',
    items: [
      {
        id: 'episodes',
        label: 'Episodes',
        description: 'Create and manage local show episodes'
      }
    ]
  },
  {
    label: 'Episode workflow',
    items: [
      {
        id: 'questions',
        label: 'Questions',
        requiresEpisode: true,
        description: 'Author choices, media, and points'
      },
      {
        id: 'validation',
        label: 'Validate',
        requiresEpisode: true,
        description: 'Check before export'
      },
      {
        id: 'export',
        label: 'Export',
        requiresEpisode: true,
        description: 'Build ZIP for the show PC'
      },
      {
        id: 'compatibility-preview',
        label: 'Import preview',
        requiresEpisode: true,
        description: 'Preview legacy MySQL row shape'
      }
    ]
  },
  {
    label: 'App',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        description: 'Export defaults and preferences'
      }
    ]
  }
]

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items)

export function getNavLabel(screen: ScreenId): string {
  return NAV_ITEMS.find((item) => item.id === screen)?.label ?? 'Workspace'
}
