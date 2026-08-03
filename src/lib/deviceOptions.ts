/** A media device as shown in the operator's device picker. */
export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

/**
 * Browsers only expose device labels once media permission has been
 * granted, so before Start the list may be unlabelled placeholders.
 */
export function toDeviceOptions(devices: MediaDeviceInfo[], labelPrefix = 'Device'): MediaDeviceOption[] {
  return devices.map((device, index) => ({
    deviceId: device.deviceId,
    label: device.label || `${labelPrefix} ${index + 1}`,
  }));
}
