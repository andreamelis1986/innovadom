export interface Device {
  id?: number;
  name: string;
  type: 'light' | 'climate' | 'camera' | 'shutter' | 'sensor';
  status: 'on' | 'off';
  ip?: string;
  position?: number;
  top?: number;
  left?: number;
}
