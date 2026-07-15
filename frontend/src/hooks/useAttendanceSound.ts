import { useCallback, useRef } from 'react';

export function useAttendanceSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((frequency: number, startTime: number, duration: number, gainValue: number = 0.3) => {
    const ctx = getCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(gainValue, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }, [getCtx]);

  const playSuccessSound = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      playTone(523.25, now, 0.15, 0.25);
      playTone(659.25, now + 0.12, 0.2, 0.25);
    } catch { /* AudioContext not available */ }
  }, [getCtx, playTone]);

  const playLateSound = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      playTone(392, now, 0.1, 0.25);
      playTone(349.23, now + 0.1, 0.15, 0.2);
      playTone(392, now + 0.25, 0.15, 0.2);
    } catch { /* AudioContext not available */ }
  }, [getCtx, playTone]);

  const playFailedSound = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      playTone(220, now, 0.12, 0.3);
      playTone(165, now + 0.12, 0.2, 0.25);
    } catch { /* AudioContext not available */ }
  }, [getCtx, playTone]);

  const playAttendanceSound = useCallback((isSuccess: boolean, message: string) => {
    if (!isSuccess) {
      playFailedSound();
      return;
    }

    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('terlambat')) {
      playLateSound();
    } else {
      playSuccessSound();
    }
  }, [playSuccessSound, playLateSound, playFailedSound]);

  return { playSuccessSound, playLateSound, playFailedSound, playAttendanceSound };
}
