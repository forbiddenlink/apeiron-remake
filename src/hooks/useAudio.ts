import { useCallback, useEffect, useRef, useState } from 'react'
import { Howl, Howler } from 'howler'

interface AudioTrack {
  id: string
  src: string | string[]
  loop?: boolean
  volume?: number
  sprite?: Record<string, [number, number]>  // [offset_ms, duration_ms]
}

export function useAudio(tracks: AudioTrack[]) {
  const sounds = useRef<Map<string, Howl>>(new Map())
  const [playing, setPlaying] = useState<Set<string>>(new Set())
  const [globalVolume, setGlobalVolume] = useState(0.7)

  useEffect(() => {
    // Initialize howl instances
    for (const track of tracks) {
      const howl = new Howl({
        src: Array.isArray(track.src) ? track.src : [track.src],
        loop: track.loop ?? false,
        volume: track.volume ?? 0.7,
        sprite: track.sprite,
        onplay: () => setPlaying(prev => new Set(prev).add(track.id)),
        onstop: () => setPlaying(prev => { const next = new Set(prev); next.delete(track.id); return next }),
        onend: () => setPlaying(prev => { const next = new Set(prev); next.delete(track.id); return next }),
      })
      sounds.current.set(track.id, howl)
    }

    return () => {
      sounds.current.forEach(howl => howl.unload())
      sounds.current.clear()
    }
  }, [tracks])

  const play = useCallback((id: string, sprite?: string) => {
    sounds.current.get(id)?.play(sprite)
  }, [])

  const stop = useCallback((id: string) => {
    sounds.current.get(id)?.stop()
  }, [])

  const pause = useCallback((id: string) => {
    sounds.current.get(id)?.pause()
  }, [])

  const setVolume = useCallback((volume: number) => {
    setGlobalVolume(volume)
    Howler.volume(volume)
  }, [])

  const stopAll = useCallback(() => {
    Howler.stop()
    setPlaying(new Set())
  }, [])

  return { play, stop, pause, setVolume, stopAll, playing, globalVolume }
}
