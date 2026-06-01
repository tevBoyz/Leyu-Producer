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
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'episodes', label: 'Episodes' },
  { id: 'episode-editor', label: 'Edit Episode' },
  { id: 'questions', label: 'Questions' },
  { id: 'validation', label: 'Validate' },
  { id: 'export', label: 'Export' },
  { id: 'compatibility-preview', label: 'Compatibility Preview' },
  { id: 'settings', label: 'Settings' }
]
