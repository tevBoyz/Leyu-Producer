import { useCallback, useEffect, useState } from 'react'
import type { MediaPickResult } from '../../../shared/media-types'
import { FormField } from '../forms/FormField'
import { displayFileName } from '../../utils/filePathDisplay'

interface Props {
  id: string
  label: string
  path: string
  error?: string
  onChange: (path: string) => void
  onPick: () => Promise<MediaPickResult>
}

export function MediaPathField({
  id,
  label,
  path,
  error,
  onChange,
  onPick
}: Props): React.ReactElement {
  const [exists, setExists] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [pickError, setPickError] = useState('')

  const checkExists = useCallback(async (filePath: string) => {
    if (!filePath.trim()) {
      setExists(null)
      return
    }
    setChecking(true)
    try {
      const result = await window.producerApi.checkFileExists(filePath)
      if (result.error) {
        setPickError(result.error)
        setExists(false)
      } else {
        setPickError('')
        setExists(result.exists)
      }
    } catch {
      setExists(false)
      setPickError('Could not verify file.')
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    void checkExists(path)
  }, [path, checkExists])

  async function browse(): Promise<void> {
    setPickError('')
    const result = await onPick()
    if (result.canceled) return
    if ('error' in result) {
      setPickError(result.error)
      return
    }
    onChange(result.path)
  }

  function clear(): void {
    setPickError('')
    onChange('')
  }

  const fileName = displayFileName(path)
  const displayError = error || pickError

  return (
    <FormField label={label} htmlFor={id} error={displayError}>
      <div className="media-path-field">
        <div className="media-path-field__actions">
          <button type="button" className="btn" onClick={() => void browse()}>
            {path ? 'Replace…' : 'Browse…'}
          </button>
          {path && (
            <button type="button" className="btn btn--danger" onClick={clear}>
              Clear
            </button>
          )}
        </div>
        {path ? (
          <>
            <p className="media-path-field__filename">{fileName}</p>
            <p className="media-path-field__fullpath muted">{path}</p>
            <p className="media-path-field__status">
              {checking && <span className="muted">Checking file…</span>}
              {!checking && exists === true && (
                <span className="media-path-field__ok">File found on disk</span>
              )}
              {!checking && exists === false && (
                <span className="media-path-field__missing">File not found</span>
              )}
            </p>
          </>
        ) : (
          <p className="muted media-path-field__empty">No file selected</p>
        )}
      </div>
    </FormField>
  )
}
