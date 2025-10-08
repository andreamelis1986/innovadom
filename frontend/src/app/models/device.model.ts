export interface Device {
  id?: number;
  name: string;
  type: 'light' | 'climate' | 'camera' | 'shutter' | 'sensor';
  status: 'on' | 'off';
  ip?: string;
  top: number;   // ← era string
  left: number;  // ← era string
  position?: number;
  streamUrl?: string;
  icon?: string; // ← aggiungi anche questo se manca
}
