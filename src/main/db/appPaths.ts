import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'

/** Resolve files that must live outside app.asar (Prisma engines, CLI, migrations). */
export function getUnpackedResourcePath(...segments: string[]): string {
  if (!app.isPackaged) {
    return join(app.getAppPath(), ...segments)
  }

  const unpackedPath = join(process.resourcesPath, 'app.asar.unpacked', ...segments)
  if (existsSync(unpackedPath)) {
    return unpackedPath
  }

  return join(app.getAppPath(), ...segments)
}

export function getGeneratedPrismaClientDir(): string {
  return getUnpackedResourcePath('generated', 'prisma')
}
