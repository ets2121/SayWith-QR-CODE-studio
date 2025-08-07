export interface Design {
  id: number;
  name: string;
  pixelStyle: 'square' | 'rounded' | 'dot';
  pixelColor: string;
  backgroundColor: string;
  eyeColor: string;
  logo?: string;
  logoSize: number;
  logoPadding: number;
}

export interface GeneratedQr {
  designId: number;
  svg: string;
}
