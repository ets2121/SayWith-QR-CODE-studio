export interface Design {
  id: number;
  name: string;
  template: string; // Path to the SVG template
  pixelStyle: 'square' | 'rounded' | 'dot';
  pixelColor: string;
  backgroundColor: string; // For the QR code itself, can be 'transparent'
  foregroundColor: string;
  eyeColor: string; // Not implemented yet
  eyeRadius: number; // Corner radius for the eyes
  text?: string;
  useImage?: boolean;
  pixelGradientStart?: string;
  pixelGradientEnd?: string;
  bgGradientStart?: string;
  bgGradientEnd?: string;
}

export interface GeneratedQr {
  designId: number;
  svg: string;
}
