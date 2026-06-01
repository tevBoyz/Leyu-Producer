-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "producerName" TEXT,
    "appVersion" TEXT NOT NULL,
    "exportVersion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StageConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "stageNo" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "StageConfig_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "stageNo" INTEGER NOT NULL,
    "questionNo" INTEGER NOT NULL,
    "choiceOne" TEXT NOT NULL DEFAULT '',
    "choiceTwo" TEXT NOT NULL DEFAULT '',
    "choiceThree" TEXT NOT NULL DEFAULT '',
    "choiceFour" TEXT NOT NULL DEFAULT '',
    "actualAnswer" TEXT NOT NULL DEFAULT '',
    "point" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "questionType" TEXT NOT NULL DEFAULT 'normal',
    "questionMusicPath" TEXT,
    "answerMusicPath" TEXT,
    "imagePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Question_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Episode_slug_key" ON "Episode"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StageConfig_episodeId_stageNo_key" ON "StageConfig"("episodeId", "stageNo");

-- CreateIndex
CREATE UNIQUE INDEX "Question_episodeId_stageNo_questionNo_key" ON "Question"("episodeId", "stageNo", "questionNo");
