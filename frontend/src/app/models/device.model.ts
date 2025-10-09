export interface Device {
  id?: number;
  name: string;
  type: 'light' | 'climate' | 'camera' | 'shutter' | 'sensor' | string;
  ip?: string;
  room?: string;

// 🔹 Stato generico
status?: 'on' | 'off' | 'active' | 'inactive' | 'open' | 'closed' | 'loading';

  // 🔹 Coordinate (dal DB)
  pos_top?: number;
  pos_left?: number;

  // 🔹 Alias interni per Angular (usati nel CSS)
  top?: number;
  left?: number;

  // 🔹 Altri campi opzionali
  position?: number;
  is_active?: boolean;
  icon?: string;
  rtsp_url?: string;
  ws_port?: number;

  // 🔹 Campi specifici per serrande
  shutter_position?: number; // 0 = chiusa, 100 = aperta

  // 🔹 Alias frontend per il flusso video
  streamUrl?: string; // ✅ aggiungi questa
}
