
export interface Design {
  id: number;
  name: string;
  template: string;
  
  // Pixel Styling
  pixelStyle: 'square' | 'rounded' | 'circle' | 'diamond';
  pixelColor: string;
  pixelGradientStart?: string;
  pixelGradientEnd?: string;

  // Eye Styling
  eyeShape: 'frame' | 'shield' | 'flower';
  eyeStyle: 'square' | 'circle';
  eyeRadius: number;

  // Background & Canvas
  backgroundColor: string;
  bgGradientStart?: string;
  bgGradientEnd?: string;
  transparentBg?: boolean;
  padding: number;
  canvasShape: 'square' | 'circle';

  // Image Background Settings
  useImage?: boolean;
  imageFilter: 'none' | 'light' | 'black-and-white' | 'sketchy';
  imageOverlayColor?: string;
  imageOverlayOpacity?: number;
  imageBlur?: number;

  // SVG Template Settings
  text?: string;
  foregroundColor: string;
}

export interface GeneratedQr {
  designId: number;
  svg: string;
}
