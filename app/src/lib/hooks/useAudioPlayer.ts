import { useRef, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<File | null>(null);
  const { toast } = useToast();

  const release = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
    fileRef.current = null;
  };

  const showPlaybackError = (err?: unknown) => {
    setIsPlaying(false);
    toast({
      title: 'Playback error',
      description:
        err instanceof Error && err.message
          ? `Failed to play audio file: ${err.message}`
          : 'Failed to play audio file',
      variant: 'destructive',
    });
  };

  // play() returns a promise that rejects when the browser refuses playback
  // (autoplay policy, unsupported format, no output device). Without handling
  // it the button flips to "pause" while nothing is audible.
  const startPlayback = (audio: HTMLAudioElement) => {
    setIsPlaying(true);
    audio.play().catch((err) => {
      if (audioRef.current !== audio) return; // superseded by a newer file
      release();
      showPlaybackError(err);
    });
  };

  const playPause = (file: File | null | undefined) => {
    if (!file) return;

    // A new recording/upload replaced the previous one — don't keep
    // replaying the stale audio element.
    if (audioRef.current && fileRef.current !== file) {
      release();
      setIsPlaying(false);
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        startPlayback(audioRef.current);
      }
    } else {
      const audio = new Audio(URL.createObjectURL(file));
      audioRef.current = audio;
      fileRef.current = file;

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        if (audioRef.current === audio) release();
      });

      audio.addEventListener('error', () => {
        if (audioRef.current !== audio) return;
        release();
        showPlaybackError();
      });

      startPlayback(audio);
    }
  };

  const cleanup = () => {
    release();
    setIsPlaying(false);
  };

  return {
    isPlaying,
    playPause,
    cleanup,
  };
}
