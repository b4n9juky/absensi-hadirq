export async function getVideoDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(d => d.kind === 'videoinput');
}

export function getDefaultDeviceId(devices: MediaDeviceInfo[]): string | undefined {
  if (devices.length === 0) return undefined;
  if (devices.length === 1) return devices[0].deviceId;
  const external = devices.find(d => /usb|external|logitech|creative|rapoo/i.test(d.label));
  return external?.deviceId ?? devices[0].deviceId;
}

export function getCameraConstraints(deviceId?: string): MediaTrackConstraints {
  const base = { width: { ideal: 1280 }, height: { ideal: 720 } };
  if (deviceId) return { ...base, deviceId: { exact: deviceId } };
  return { ...base, facingMode: 'user' };
}
