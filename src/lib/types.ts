
export interface Design {
  id: number;
  name: string;
  template: string; // Path to the SVG template
  pixelStyle: 'square' | 'rounded' | 'circle' | 'diamond';
  pixelColor: string;
  backgroundColor: string; // For the QR code itself, can be 'transparent'
  foregroundColor: string;
  eyeShape: 'frame' | 'shield' | 'flower';
  eyeStyle: 'square' | 'circle';
  eyeColor: string;
  eyeRadius: number; // Corner radius for the eyes
  padding: number; // Whitespace around the QR code
  canvasShape: 'square' | 'circle';
  text?: string;
  useImage?: boolean;
  transparentBg?: boolean;
  pixelGradientStart?: string;
  pixelGradientEnd?: string;
  bgGradientStart?: string;
  bgGradientEnd?: string;
}

export interface GeneratedQr {
  designId: number;
  svg: string;
}
