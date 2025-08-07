export interface Design {
  id: number;
  name: string;
  template: string; // Path to the SVG template
  pixelStyle: 'square' | 'rounded' | 'dot';
  pixelColor: string;
  backgroundColor: string; // For the QR code itself, can be 'transparent'
  foregroundColor: string;
  eyeColor: string;
  text?: string;
  useImage?: boolean;
}

export interface GeneratedQr {
  designId: number;
  svg: string;
}
