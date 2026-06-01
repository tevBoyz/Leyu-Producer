/** IPC channel constants — shared by main, preload, and renderer. */
export const IPC_CHANNELS = {
  app: {
    getVersion: 'app:getVersion',
    ping: 'app:ping',
    isPackaged: 'app:isPackaged',
    getLogFilePath: 'app:getLogFilePath',
    openLogsFolder: 'app:openLogsFolder'
  },
  episodes: {
    create: 'episodes:create',
    list: 'episodes:list',
    get: 'episodes:get',
    update: 'episodes:update',
    delete: 'episodes:delete',
    upsertStageConfigs: 'episodes:upsertStageConfigs'
  },
  questions: {
    list: 'questions:list',
    upsert: 'questions:upsert',
    delete: 'questions:delete'
  },
  media: {
    pickQuestionMusic: 'media:pickQuestionMusic',
    pickAnswerMusic: 'media:pickAnswerMusic',
    pickImage: 'media:pickImage',
    checkFileExists: 'media:checkFileExists',
    readAudioPreview: 'media:readAudioPreview'
  },
  validation: {
    validateEpisode: 'validation:validateEpisode'
  },
  compatibility: {
    getPreview: 'compatibility:getPreview',
    copyPreviewJson: 'compatibility:copyPreviewJson',
    savePreviewJson: 'compatibility:savePreviewJson'
  },
  developer: {
    createDemoEpisode: 'developer:createDemoEpisode'
  },
  settings: {
    get: 'settings:get',
    update: 'settings:update',
    reset: 'settings:reset'
  },
  export: {
    chooseDestination: 'export:chooseDestination',
    exportEpisode: 'export:exportEpisode'
  }
} as const
