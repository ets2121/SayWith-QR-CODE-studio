
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Design, GeneratedQr } from '@/lib/types';
import QRCode from 'qrcode';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { QrCode, Palette, Download, Trash2, Plus, Settings, Loader2, Image as ImageIcon, X, Upload, Clipboard } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Slider } from './ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

const QR_IMG_SIZE = 512;

const aiPromptText = `
### **AI Prompt for Generating the QR Art Studio Application**

**Project Name**: QR Art Studio

**Core Objective**: Develop a highly interactive, single-page web application using Next.js, React, and TypeScript for generating artistic and scannable QR codes. The application must allow users to embed these QR codes into SVG templates and provide extensive customization options for the QR code's appearance.

**Tech Stack**:
*   **Framework**: Next.js with the App Router
*   **UI Library**: React with TypeScript
*   **Styling**: Tailwind CSS with ShadCN UI components (pre-installed).
*   **Icons**: \`lucide-react\`
*   **QR Code Generation**: \`qrcode\` library
*   **File Downloads**: \`file-saver\` and \`jszip\` libraries

---

### **Application Structure & UI Flow**

1.  **Main Layout**:
    *   A central, two-tab interface using the ShadCN \`Tabs\` component.
    *   **Tab 1: "Generator"**: This is the primary tab for content input and final QR code generation.
    *   **Tab 2: "Designs"**: This tab is for creating and managing reusable design presets.
    *   An elegant header with the title "QR Art Studio" using the 'Space Grotesk' font and a sub-description.

2.  **Generator Tab (\`/\` or \`page.tsx\`)**:
    *   **Content Input**: A text input field for the user to enter the data for the QR code (e.g., a URL or text).
    *   **Background Image Upload**: A file input that allows users to upload an image (PNG/JPEG). When an image is uploaded, display a small thumbnail preview and a button to remove it. This image can be used as the QR code background if specified in a design.
    *   **Generate Button**: A primary button labeled "Generate QR Codes". When clicked, it should generate a QR code for *each* design preset defined in the "Designs" tab and display the results in the preview section. Show a loading state on this button during generation.
    *   **Preview Section**: Below the tabs, create a dedicated section that appears after generation. It should display all the final rendered SVG artworks in a responsive grid. Each artwork should have the design name displayed beneath it. Show skeleton loaders in this section while generating.
    *   **Download Button**: A "Download All (.zip)" button in the preview section header. This button should package all the generated SVG files into a single zip archive for download.

3.  **Designs Tab (Design Manager)**:
    *   **Preset Management**: Use a ShadCN \`Accordion\` to list all design presets. Each \`AccordionItem\` represents one design.
        *   The \`AccordionTrigger\` should display an editable input field for the design's \`name\`.
    *   **Controls**: Inside each \`AccordionContent\`, provide a comprehensive set of controls to customize the QR code's appearance. Organize these controls logically with labels and sub-headings.
    *   **Live Preview**: Crucially, each accordion panel must contain a small \`DesignPreview\` component that renders a live, real-time preview of the QR code as the user adjusts its settings.
    *   **Management Buttons**: Include "Add Design", "Remove Design", and "Save designs.json" buttons. The save button must package all current design settings into a downloadable \`designs.json\` file.

---

### **Core QR Code Rendering Logic (\`drawCustomQr\` function)**

This is the most critical part of the application. Create a function that draws a QR code onto an HTML5 canvas with the following detailed requirements:

1.  **Function Signature**: It should accept the QR data, the \`design\` object, an optional background image data URL, and the canvas size.

2.  **Rendering Order & Logic**:
    *   **Background First**:
        *   If \`design.transparentBg\` is true, do nothing (leave it transparent).
        *   If \`design.useImage\` is true and a background image is provided, draw the image onto the canvas. It must be centered and scaled to fit. Before drawing, apply the specified \`imageFilter\` (e.g., 'grayscale(1)', 'brightness(1.5)') and \`imageBlur\`. Then, draw a semi-transparent \`imageOverlayColor\` on top to ensure contrast.
        *   Otherwise, fill the background with \`design.backgroundColor\` or a gradient if \`bgGradientStart\` and \`bgGradientEnd\` are defined.
    *   **Data Pixels (Modules)**:
        *   Iterate through the QR code's data modules.
        *   For each "dark" module *that is not part of a finder pattern (eye)*, draw the specified \`pixelStyle\` ('square', 'rounded', 'circle', 'diamond').
        *   The color should be \`pixelColor\` or a gradient if \`pixelGradientStart\` and \`pixelGradientEnd\` are provided.
    *   **Finder Patterns (Eyes)**: Implement a dedicated \`drawEye\` function with a robust, layered drawing approach:
        1.  **Draw Solid Frame**: Draw the outer \`eyeShape\` ('frame', 'shield', 'flower') and fill it completely with \`pixelColor\`.
        2.  **Carve out Pupil Background**: Draw the \`eyeStyle\` shape ('square' or 'circle') in the center, but use \`ctx.clearRect()\` if \`transparentBg\` is true, or fill with \`backgroundColor\` if it's false. This correctly "punches out" the middle part.
        3.  **Draw Inner Pupil**: Draw the \`eyeStyle\` shape one last time, centered, and fill it with \`pixelColor\`.
    *   **Final Canvas Clipping**: After *all* drawing is complete, check \`design.canvasShape\`. If it is 'circle', apply a circular clipping mask to the entire canvas to ensure the final output is perfectly circular.

---

### **Type Definitions (\`types.ts\`)**

\`\`\`typescript
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
\`\`\`

---

### **SVG Injection Logic**

When the main "Generate" button is clicked, after generating the custom QR code as a PNG data URL, fetch the SVG template specified in the design. Use a robust string replacement method (e.g., a regex that handles \`href\` and \`xlink:href\` with single or double quotes) to replace the \`href\` attribute of the *first* \`<image>\` tag in the SVG content with the generated QR code's data URL. Also replace placeholder text with \`design.text\` and update its fill color.
`;


const drawCustomQr = (qrData: QRCode.QRCode | null, design: Design, bgImage: string | null, size: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!qrData) return resolve('');
      const canvas = document.createElement('canvas');
      const canvasSize = size;
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Could not get canvas context');
  
      const modules = qrData.modules.data;
      const moduleCount = qrData.modules.size;
      const padding = design.padding || 0;
      const qrRegionSize = canvasSize - padding * 2;
      const moduleSize = qrRegionSize / moduleCount;
  
      const drawBackground = () => {
        return new Promise<void>((bgResolve) => {
          ctx.clearRect(0, 0, canvasSize, canvasSize);
          
          // Fill quiet zone first
          ctx.fillStyle = design.backgroundColor;
          ctx.fillRect(0, 0, canvasSize, canvasSize);

          if (design.transparentBg && !design.useImage) {
              ctx.clearRect(0, 0, canvasSize, canvasSize);
              bgResolve();
              return;
          }

          if (design.useImage && bgImage) {
            const img = new Image();
            img.onload = () => {
              ctx.save();
              // Clip the region where the image will be drawn (inside the padding)
              ctx.beginPath();
              ctx.rect(padding, padding, qrRegionSize, qrRegionSize);
              ctx.clip();
              
              const imgAspectRatio = img.width / img.height;
              const canvasAspectRatio = qrRegionSize / qrRegionSize;
              let renderWidth = qrRegionSize;
              let renderHeight = qrRegionSize;
              let x = padding;
              let y = padding;

              if (imgAspectRatio > canvasAspectRatio) {
                renderHeight = qrRegionSize;
                renderWidth = renderHeight * imgAspectRatio;
                x = padding + (qrRegionSize - renderWidth) / 2;
              } else {
                renderWidth = qrRegionSize;
                renderHeight = renderWidth / imgAspectRatio;
                y = padding + (qrRegionSize - renderHeight) / 2;
              }
              
              const filterParts = [];
              if (design.imageBlur && design.imageBlur > 0) {
                filterParts.push(`blur(${design.imageBlur}px)`);
              }
              const imageFilter = design.imageFilter || 'none';
              if (imageFilter === 'black-and-white') filterParts.push('grayscale(100%)');
              if (imageFilter === 'light') filterParts.push('brightness(150%)');
              if (imageFilter === 'sketchy') {
                  filterParts.push('grayscale(100%) contrast(200%) brightness(120%)');
              }
              if (filterParts.length > 0) {
                  ctx.filter = filterParts.join(' ');
              }

              ctx.drawImage(img, x, y, renderWidth, renderHeight);

              if (design.imageOverlayColor) {
                  ctx.globalAlpha = design.imageOverlayOpacity || 0.5;
                  ctx.fillStyle = design.imageOverlayColor;
                  ctx.fillRect(padding, padding, qrRegionSize, qrRegionSize);
              }
              
              ctx.restore(); // Restore from clipping
              bgResolve();
            };
            img.onerror = () => {
              // Fallback if image fails to load
              ctx.fillStyle = design.backgroundColor;
              ctx.fillRect(padding, padding, qrRegionSize, qrRegionSize);
              bgResolve();
            };
            img.src = bgImage;
          } else {
            if (design.bgGradientStart && design.bgGradientEnd) {
              const gradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
              gradient.addColorStop(0, design.bgGradientStart);
              gradient.addColorStop(1, design.bgGradientEnd);
              ctx.fillStyle = gradient;
            } else {
              // Background color is already set for quiet zone
            }
            ctx.fillRect(padding, padding, qrRegionSize, qrRegionSize);
            bgResolve();
          }
        });
      };
  
      const isFinderPattern = (x: number, y: number, moduleCount: number): boolean => {
        if (x < 7 && y < 7) return true; // Top-left eye
        if (x >= moduleCount - 7 && y < 7) return true; // Top-right eye
        if (x < 7 && y >= moduleCount - 7) return true; // Bottom-left eye
        return false;
      };

      const drawModule = (x: number, y: number, size: number, style: Design['pixelStyle']) => {
        const top = y * size + padding;
        const left = x * size + padding;
        ctx.beginPath();
        switch (style) {
          case 'circle':
            ctx.arc(left + size / 2, top + size / 2, (size / 2) * 0.9, 0, 2 * Math.PI);
            break;
          case 'diamond':
            ctx.moveTo(left + size / 2, top);
            ctx.lineTo(left + size, top + size / 2);
            ctx.lineTo(left + size / 2, top + size);
            ctx.lineTo(left, top + size / 2);
            ctx.closePath();
            break;
          case 'rounded':
             ctx.roundRect(left, top, size, size, [size * 0.25]);
            break;
          default: // square
            ctx.rect(left, top, size, size);
            break;
        }
        ctx.fill();
      }
      
      const drawEye = (cornerX: number, cornerY: number) => {
        const eyeSize = moduleSize * 7;
        const pupilSize = moduleSize * 3;
        const eyeColor = design.pixelColor;

        ctx.save();
        ctx.translate(padding + cornerX * moduleSize, padding + cornerY * moduleSize);
        
        // 1. Draw Outer Frame
        ctx.fillStyle = eyeColor;
        const framePath = new Path2D();
        const frameRadius = design.eyeRadius * (moduleSize / 8);
        switch (design.eyeShape) {
          case 'shield':
              framePath.moveTo(eyeSize / 2, 0);
              framePath.lineTo(eyeSize, eyeSize * 0.25);
              framePath.lineTo(eyeSize, eyeSize * 0.75);
              framePath.bezierCurveTo(eyeSize, eyeSize, eyeSize / 2, eyeSize, eyeSize / 2, eyeSize);
              framePath.bezierCurveTo(eyeSize / 2, eyeSize, 0, eyeSize, 0, eyeSize * 0.75);
              framePath.lineTo(0, eyeSize * 0.25);
              framePath.closePath();
              break;
          case 'flower':
              const petalCount = 8;
              const outerRadius = eyeSize / 2;
              const innerRadius = eyeSize / 4;
              for(let i = 0; i < petalCount; i++) {
                const angle = (i / petalCount) * (2 * Math.PI);
                const x1 = eyeSize / 2 + Math.cos(angle) * outerRadius;
                const y1 = eyeSize / 2 + Math.sin(angle) * outerRadius;
                const x2 = eyeSize / 2 + Math.cos(angle + (Math.PI / petalCount)) * innerRadius;
                const y2 = eyeSize / 2 + Math.sin(angle + (Math.PI / petalCount)) * innerRadius;
                framePath.quadraticCurveTo(x2, y2, x1, y1);
              }
              framePath.closePath();
              break;
          default: // frame
              framePath.roundRect(0, 0, eyeSize, eyeSize, [frameRadius]);
              break;
        }
        ctx.fill(framePath);

        // 2. Draw Pupil Background (carve out)
        const pupilBgPath = new Path2D();
        const pupilBgPos = moduleSize;
        const pupilBgSize = eyeSize - moduleSize * 2;
        const pupilBgRadius = design.eyeRadius * (moduleSize / 16);
        switch (design.eyeStyle) {
            case 'circle':
                pupilBgPath.arc(eyeSize / 2, eyeSize / 2, (pupilBgSize / 2), 0, 2 * Math.PI);
                break;
            default: // square
                pupilBgPath.roundRect(pupilBgPos, pupilBgPos, pupilBgSize, pupilBgSize, [pupilBgRadius]);
                break;
        }
        
        ctx.save();
        ctx.clip(pupilBgPath);
        if (design.transparentBg && !design.useImage) { // Also check for image use
            ctx.clearRect(0, 0, eyeSize, eyeSize);
        } else {
            ctx.fillStyle = design.backgroundColor;
            ctx.fillRect(0, 0, eyeSize, eyeSize);
        }
        ctx.restore();


        // 3. Draw Pupil
        ctx.fillStyle = eyeColor;
        const pupilPath = new Path2D();
        const pupilPos = (eyeSize - pupilSize) / 2;
        const pupilRadius = design.eyeRadius * (moduleSize / 16);
        switch (design.eyeStyle) {
            case 'circle':
                pupilPath.arc(eyeSize / 2, eyeSize / 2, pupilSize / 2, 0, 2 * Math.PI);
                break;
            default: // square
                pupilPath.roundRect(pupilPos, pupilPos, pupilSize, pupilSize, [pupilRadius]);
                break;
        }
        ctx.fill(pupilPath);

        ctx.restore();
    }

      const applyCanvasShape = () => {
        if (design.canvasShape === 'circle') {
          ctx.globalCompositeOperation = 'destination-in';
          ctx.beginPath();
          ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
      }
  
      drawBackground().then(() => {
        let pixelFillStyle: string | CanvasGradient = design.pixelColor;
        // Gradients disabled on image backgrounds for better scannability
        if (design.pixelGradientStart && design.pixelGradientEnd && !design.useImage) {
          const gradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
          gradient.addColorStop(0, design.pixelGradientStart);
          gradient.addColorStop(1, design.pixelGradientEnd);
          pixelFillStyle = gradient;
        }

        // Draw pixel data
        for (let y = 0; y < moduleCount; y++) {
          for (let x = 0; x < moduleCount; x++) {
            const index = y * moduleCount + x;
            if (!modules[index] || isFinderPattern(x, y, moduleCount)) continue;
            
            ctx.fillStyle = pixelFillStyle;
            drawModule(x, y, moduleSize, design.pixelStyle);
          }
        }
        
        // Draw finder patterns
        drawEye(0, 0); // Top-left
        drawEye(moduleCount - 7, 0); // Top-right
        drawEye(0, moduleCount - 7); // Bottom-left
        
        // Apply final clipping mask
        applyCanvasShape();

        resolve(canvas.toDataURL('image/png'));
      });
    });
  };

const DesignPreview = ({ design, backgroundImage }: { design: Design, backgroundImage: string | null }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const generate = async () => {
      try {
        const qrData = QRCode.create('Live Preview', { errorCorrectionLevel: 'H' });
        const dataUrl = await drawCustomQr(qrData, design, backgroundImage, 200);
        if (isMounted) {
          setQrCodeDataUrl(dataUrl);
        }
      } catch (err) {
        console.error("Preview generation failed:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Debounce generation
    const timeoutId = setTimeout(generate, 300);

    return () => { 
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [design, backgroundImage]);

  return (
    <div className="w-full aspect-square bg-muted/50 rounded-lg flex items-center justify-center p-4">
      {isLoading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <img src={qrCodeDataUrl} alt="QR Code Preview" className="w-full h-full object-contain" />
      )}
    </div>
  );
};


export default function QrArtStudio() {
  const [content, setContent] = useState('https://firebase.google.com/');
  const [designs, setDesigns] = useState<Design[]>([]);
  const [svgTemplates, setSvgTemplates] = useState<string[]>([]);
  const [generatedQrs, setGeneratedQrs] = useState<GeneratedQr[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const { toast } = useToast();
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchTemplates = React.useCallback(() => {
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data: string[]) => {
        if (data.length > 0) {
          setSvgTemplates(data);
        } else {
          setSvgTemplates(['/templates/template1.svg']); // Fallback
          toast({
            title: "No Templates Found",
            description: "No SVG templates found in /public/templates. Using a default. Please add your own SVGs.",
          });
        }
      })
      .catch(() => {
        setSvgTemplates(['/templates/template1.svg']); // Fallback
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load SVG templates from the API.",
        });
      });
  }, [toast]);

  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }

    // Fetch designs
    fetch('/designs.json')
      .then((res) => res.json())
      .then((data: Design[]) => setDesigns(data))
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load designs.json. Make sure it exists in the public folder.",
        });
      });
      
    // Fetch SVG templates
    fetchTemplates();
  }, [toast, fetchTemplates]);

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTemplateUpload = async () => {
    if (!templateFile) {
      toast({ variant: "destructive", title: "No file selected", description: "Please choose an SVG file to upload." });
      return;
    }
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', templateFile);

    try {
      const response = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload template');
      }

      toast({
        title: "Success!",
        description: "Your SVG template has been uploaded.",
      });
      setTemplateFile(null); // Clear the file input
      fetchTemplates(); // Refresh the template list
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };


  const handleGenerate = async () => {
    if (!content) {
      toast({ variant: "destructive", title: "Error", description: "Content cannot be empty." });
      return;
    }

    setIsLoading(true);
    setGeneratedQrs([]);

    try {
      const qrResults: GeneratedQr[] = [];
      const qrData = QRCode.create(content, { errorCorrectionLevel: 'H' });

      for (const design of designs) {
        let qrCodeDataUrl: string;
        
        qrCodeDataUrl = await drawCustomQr(qrData, design, design.useImage ? backgroundImage : null, QR_IMG_SIZE);

        const templateResponse = await fetch(design.template);
        if (!templateResponse.ok) {
           toast({ variant: "destructive", title: `Error loading template for ${design.name}`, description: `Could not fetch ${design.template}` });
           continue;
        }
        let svgText = await templateResponse.text();
        
        // Use a more robust regex that handles different quote styles and xlink:href
        svgText = svgText.replace(/(<image[^>]*?(?:href|xlink:href)=)(["'])(?:[^"']*)(\2)/, `$1$2${qrCodeDataUrl}$3`);

        if (design.text) {
           svgText = svgText.replace(/(<text[^>]*>)\s*TEXT\s*(<\/text>)/g, `$1${design.text}$2`);
           if (design.foregroundColor) {
             svgText = svgText.replace(/(<text[^>]*fill=")[^"]*(")/g, `$1${design.foregroundColor}$2`);
           }
        }

        qrResults.push({
          designId: design.id,
          svg: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`,
        });
      }

      setGeneratedQrs(qrResults);

      if (qrResults.length > 0) {
        toast({
          title: "Success",
          description: "QR codes generated successfully.",
        });
      } else {
         toast({
          variant: "destructive",
          title: "Generation Failed",
          description: "No QR codes were generated. Check your designs and inputs.",
        });
      }

    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "An unexpected error occurred. Please check the console.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (generatedQrs.length === 0) {
      toast({ variant: 'destructive', title: 'Nothing to download' });
      return;
    }
    setIsDownloading(true);
    const zip = new JSZip();

    for (let i = 0; i < generatedQrs.length; i++) {
        const qr = generatedQrs[i];
        const design = designs.find(d => d.id === qr.designId);
        const designName = design ? design.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : `design_${i + 1}`;
        
        const response = await fetch(qr.svg);
        const blob = await response.blob();
        zip.file(`${designName}.svg`, blob);
    }

    zip.generateAsync({ type: 'blob' }).then((content) => {
      saveAs(content, 'qr-art-studio-designs.zip');
    });
    setIsDownloading(false);
  };
  
  const addDesign = (isImageDesign: boolean) => {
    const newId = designs.length > 0 ? Math.max(...designs.map(d => d.id)) + 1 : 1;
    const newDesign: Design = {
      id: newId,
      name: `New ${isImageDesign ? 'Image' : 'Basic'} Design ${newId}`,
      template: svgTemplates[0] || '',
      pixelStyle: "square",
      pixelColor: "#000000",
      backgroundColor: "#FFFFFF",
      foregroundColor: "#000000",
      eyeShape: 'frame',
      eyeStyle: 'square',
      eyeRadius: 8,
      padding: 16,
      canvasShape: 'square',
      text: "Your Text Here",
      useImage: isImageDesign,
      imageFilter: 'none',
      imageBlur: 0,
      imageOverlayColor: '#FFFFFF',
      imageOverlayOpacity: 0.5,
      transparentBg: false,
      pixelGradientStart: "",
      pixelGradientEnd: "",
      bgGradientStart: "",
      bgGradientEnd: ""
    };
    setDesigns([...designs, newDesign]);
  };
  
  const updateDesign = (id: number, updatedProps: Partial<Design>) => {
    setDesigns(designs.map(d => d.id === id ? { ...d, ...updatedProps } : d));
  };

  const removeDesign = (id: number) => {
    setDesigns(designs.filter(d => d.id !== id));
  };
  
  const saveDesignsToServer = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/save-designs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(designs, null, 2),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save designs');
      }

      toast({ title: "Designs Saved", description: "Your designs have been saved successfully on the server." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const AiPromptDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Clipboard className="mr-2 h-4 w-4" /> Show AI Prompt</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>AI Prompt for QR Art Studio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
            <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted p-4">
                <pre className="text-sm whitespace-pre-wrap font-mono">{aiPromptText}</pre>
            </div>
            <Button onClick={() => {
                navigator.clipboard.writeText(aiPromptText);
                toast({ title: "Copied!", description: "The AI prompt has been copied to your clipboard." });
            }}>
                <Clipboard className="mr-2 h-4 w-4" /> Copy Prompt
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderDesignList = (isImageDesigns: boolean) => {
      const filteredDesigns = designs.filter(d => !!d.useImage === isImageDesigns);

      return (
        <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
            {filteredDesigns.map(design => (
                <AccordionItem value={`item-${design.id}`} key={design.id}>
                <AccordionTrigger>
                    <div className="flex justify-between items-center w-full pr-4">
                    <Input 
                        value={design.name} 
                        onChange={(e) => updateDesign(design.id, { name: e.target.value })}
                        className="text-base font-medium border-none focus-visible:ring-1"
                        onClick={(e) => e.stopPropagation()}
                    />
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-background/50 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                        {/* Main Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                            <Label>SVG Template</Label>
                            <Select value={design.template} onValueChange={(v) => updateDesign(design.id, { template: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                {svgTemplates.map(template => (
                                    <SelectItem key={template} value={template}>{template.split('/').pop()}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            </div>
                            <div>
                                <Label>Pixel Style</Label>
                                <Select value={design.pixelStyle} onValueChange={(v: Design['pixelStyle']) => updateDesign(design.id, { pixelStyle: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="square">Square</SelectItem>
                                    <SelectItem value="rounded">Rounded</SelectItem>
                                    <SelectItem value="circle">Circle</SelectItem>
                                    <SelectItem value="diamond">Diamond</SelectItem>
                                </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Canvas Settings */}
                        <div className="p-4 border rounded-lg space-y-4">
                            <h4 className="font-semibold text-lg">QR Canvas Settings</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label>Canvas Shape</Label>
                                    <Select value={design.canvasShape} onValueChange={(v: Design['canvasShape']) => updateDesign(design.id, { canvasShape: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                        <SelectItem value="square">Square</SelectItem>
                                        <SelectItem value="circle">Circle</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>QR Code Padding</Label>
                                <div className="flex items-center gap-4">
                                    <Slider
                                    value={[design.padding]}
                                    onValueChange={(v) => updateDesign(design.id, { padding: v[0] })}
                                    max={64}
                                    step={1}
                                    />
                                    <span className="text-sm text-muted-foreground w-8">{design.padding}</span>
                                </div>
                            </div>
                        </div>


                        {/* Eye Settings */}
                        <div className="p-4 border rounded-lg space-y-4">
                            <h4 className="font-semibold text-lg">Eye Customization</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label>Eye Shape</Label>
                                    <Select value={design.eyeShape} onValueChange={(v: Design['eyeShape']) => updateDesign(design.id, { eyeShape: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="frame">Frame</SelectItem>
                                            <SelectItem value="shield">Shield</SelectItem>
                                            <SelectItem value="flower">Flower</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Eye Pupil Style</Label>
                                    <Select value={design.eyeStyle} onValueChange={(v: Design['eyeStyle']) => updateDesign(design.id, { eyeStyle: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="square">Square</SelectItem>
                                            <SelectItem value="circle">Circle</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>Eye Radius (for 'Frame' shape)</Label>
                                <div className="flex items-center gap-4">
                                    <Slider
                                    value={[design.eyeRadius]}
                                    onValueChange={(v) => updateDesign(design.id, { eyeRadius: v[0] })}
                                    max={30}
                                    step={1}
                                    />
                                    <span className="text-sm text-muted-foreground w-8">{design.eyeRadius}</span>
                                </div>
                            </div>
                        </div>

                        {/* Color Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <Label>Pixel Color (also for Eyes)</Label>
                                <Input type="color" value={design.pixelColor} onChange={(e) => updateDesign(design.id, { pixelColor: e.target.value, pixelGradientStart: '', pixelGradientEnd: '' })} className="p-1 h-10"/>
                                <p className="text-xs text-muted-foreground mt-1">Used if gradients are not set.</p>
                            </div>
                            <div>
                                <Label>QR Background Color</Label>
                                <Input type="color" value={design.backgroundColor} onChange={(e) => updateDesign(design.id, { backgroundColor: e.target.value, bgGradientStart: '', bgGradientEnd: '' })} className="p-1 h-10" disabled={design.useImage || design.transparentBg}/>
                                {(design.useImage || design.transparentBg) && <p className="text-xs text-muted-foreground mt-1">Disabled for image/transparent backgrounds.</p>}
                            </div>
                            <div>
                                <Label>Pixel Gradient Start</Label>
                                <Input type="color" value={design.pixelGradientStart || '#000000'} onChange={(e) => updateDesign(design.id, { pixelGradientStart: e.target.value })} className="p-1 h-10" disabled={design.useImage}/>
                            </div>
                            <div>
                                <Label>Pixel Gradient End</Label>
                                <Input type="color" value={design.pixelGradientEnd || '#000000'} onChange={(e) => updateDesign(design.id, { pixelGradientEnd: e.target.value })} className="p-1 h-10" disabled={design.useImage}/>
                            </div>
                            <div>
                                <Label>BG Gradient Start</Label>
                                <Input type="color" value={design.bgGradientStart || '#FFFFFF'} onChange={(e) => updateDesign(design.id, { bgGradientStart: e.target.value })} className="p-1 h-10" disabled={design.useImage || design.transparentBg}/>
                            </div>
                            <div>
                                <Label>BG Gradient End</Label>
                                <Input type="color" value={design.bgGradientEnd || '#FFFFFF'} onChange={(e) => updateDesign(design.id, { bgGradientEnd: e.target.value })} className="p-1 h-10" disabled={design.useImage || design.transparentBg}/>
                            </div>
                        </div>

                        {/* Image Background Settings */}
                        {design.useImage && (
                            <div className="p-4 border rounded-lg space-y-4">
                                <h4 className="font-semibold text-lg">Image Background Settings</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>Image Filter</Label>
                                        <Select value={design.imageFilter} onValueChange={(v: Design['imageFilter']) => updateDesign(design.id, { imageFilter: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                <SelectItem value="light">Light</SelectItem>
                                                <SelectItem value="black-and-white">Black & White</SelectItem>
                                                <SelectItem value="sketchy">Sketchy</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Overlay Color</Label>
                                        <Input type="color" value={design.imageOverlayColor} onChange={(e) => updateDesign(design.id, { imageOverlayColor: e.target.value })} className="p-1 h-10"/>
                                    </div>
                                </div>
                                <div>
                                    <Label>Image Blur (px)</Label>
                                    <div className="flex items-center gap-4">
                                        <Slider
                                        value={[design.imageBlur || 0]}
                                        onValueChange={(v) => updateDesign(design.id, { imageBlur: v[0] })}
                                        max={20}
                                        step={1}
                                        />
                                        <span className="text-sm text-muted-foreground w-8">{design.imageBlur || 0}</span>
                                    </div>
                                </div>
                                <div>
                                    <Label>Overlay Opacity</Label>
                                    <div className="flex items-center gap-4">
                                        <Slider
                                        value={[design.imageOverlayOpacity || 0]}
                                        onValueChange={(v) => updateDesign(design.id, { imageOverlayOpacity: v[0] })}
                                        max={1}
                                        step={0.05}
                                        />
                                        <span className="text-sm text-muted-foreground w-8">{design.imageOverlayOpacity?.toFixed(2) || 0}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label>Foreground Color (for text)</Label>
                                <Input type="color" value={design.foregroundColor || '#000000'} onChange={(e) => updateDesign(design.id, { foregroundColor: e.target.value })} className="p-1 h-10"/>
                            </div>
                            <div className="space-y-2">
                                <Label>Embedded Text</Label>
                                <Textarea
                                    value={design.text || ''}
                                    onChange={(e) => updateDesign(design.id, { text: e.target.value })}
                                    placeholder="Enter text to embed in the SVG"
                                />
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id={`use-image-${design.id}`}
                                    checked={design.useImage}
                                    onCheckedChange={(checked) => updateDesign(design.id, { useImage: checked })}
                                />
                                <Label htmlFor={`use-image-${design.id}`}>Use Image Background</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id={`transparent-bg-${design.id}`}
                                    checked={!!design.transparentBg}
                                    onCheckedChange={(checked) => updateDesign(design.id, { transparentBg: checked })}
                                />
                                <Label htmlFor={`transparent-bg-${design.id}`}>Transparent QR Background</Label>
                            </div>
                        </div>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            <h4 className="font-semibold text-lg text-center">Live Preview</h4>
                            <DesignPreview design={design} backgroundImage={backgroundImage} />
                            <Button variant="destructive" size="sm" onClick={() => removeDesign(design.id)} className="w-full"><Trash2 className="mr-2"/> Remove Design</Button>
                        </div>
                    </div>

                </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
             <div className="flex justify-between items-center mt-4">
                <Button onClick={() => addDesign(isImageDesigns)}><Plus className="mr-2"/> Add {isImageDesigns ? "Image" : "Basic"} Design</Button>
                {filteredDesigns.length === 0 && (
                    <p className="text-sm text-muted-foreground">No {isImageDesigns ? "image" : "basic"} designs yet. Add one to get started!</p>
                )}
            </div>
        </div>
      );
  }


  const renderDesignManager = () => (
    <div className="space-y-6">
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline flex items-center gap-2"><Palette />Design Presets</CardTitle>
                    <CardDescription>Manage your QR code design templates. These settings will be saved to the server.</CardDescription>
                </div>
                <AiPromptDialog />
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="basic">Basic QR Designs</TabsTrigger>
                        <TabsTrigger value="image">Image Background Designs</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="mt-6">
                        {renderDesignList(false)}
                    </TabsContent>
                    <TabsContent value="image" className="mt-6">
                        {renderDesignList(true)}
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter>
                <Button onClick={saveDesignsToServer} variant="outline" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                  {isSaving ? 'Saving...' : 'Save All Designs'}
                </Button>
            </CardFooter>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Upload />Upload New Template</CardTitle>
                <CardDescription>Upload your own custom SVG files to use as templates for your QR codes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full">
                    <Label htmlFor="template-upload">SVG Template File</Label>
                    <Input 
                        id="template-upload" 
                        type="file" 
                        accept=".svg,image/svg+xml" 
                        onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                        className="file:text-foreground"
                    />
                </div>
                <Button onClick={handleTemplateUpload} disabled={isUploading || !templateFile} className="w-full sm:w-auto mt-4 sm:mt-0 self-end">
                    {isUploading ? <Loader2 className="mr-2 animate-spin" /> : <Upload className="mr-2" />}
                    Upload
                </Button>
            </CardContent>
        </Card>
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl md:text-6xl font-headline font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          SayWith
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Generate artistic QR codes by injecting them into your own SVG templates.
        </p>
      </header>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content"><QrCode className="mr-2" />Generator</TabsTrigger>
          <TabsTrigger value="designs"><Settings className="mr-2" />Designs</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">QR Code Content &amp; Generation</CardTitle>
              <CardDescription>Enter content and upload an optional background image for your designs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content-input">Content (URL or Text)</Label>
                <Input
                  id="content-input"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="e.g., https://example.com"
                />
              </div>
              <div className="space-y-2">
                 <Label>Background Image (Optional)</Label>
                  <div className="flex items-center gap-2">
                       <Input id="bg-image-upload" type="file" accept="image/png, image/jpeg" onChange={handleBackgroundImageUpload} className="hidden"/>
                       <Button asChild variant="outline">
                          <label htmlFor="bg-image-upload" className="cursor-pointer">
                              <ImageIcon className="mr-2" /> Upload Image
                          </label>
                       </Button>
                       {backgroundImage && 
                          <div className="flex items-center gap-2">
                              <img src={backgroundImage} alt="background preview" className="w-10 h-10 rounded-sm bg-white p-1 object-cover"/>
                              <Button variant="ghost" size="icon" onClick={() => setBackgroundImage(null)}>
                                  <X className="w-4 h-4"/>
                              </Button>
                          </div>
                       }
                  </div>
                  <p className="text-sm text-muted-foreground">Used by designs where "Use Image Background" is enabled.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate QR Codes'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="designs" className="mt-6">
          {renderDesignManager()}
        </TabsContent>
      </Tabs>
      
      { (isLoading || generatedQrs.length > 0) && (
        <section className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-headline font-bold">Preview</h2>
                <Button onClick={handleDownloadAll} disabled={isDownloading || generatedQrs.length === 0}>
                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2" />}
                    Download All (.zip)
                </Button>
            </div>
            <div ref={previewContainerRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {isLoading && Array.from({ length: designs.length }).map((_, i) => (
                    <Card key={i} className="flex flex-col items-center justify-center p-4 aspect-square">
                        <Skeleton className="w-full h-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4 mt-4" />
                    </Card>
                ))}
                {!isLoading && generatedQrs.map(qr => {
                    const design = designs.find(d => d.id === qr.designId);
                    return (
                        <Card key={qr.designId} className="p-4 flex flex-col items-center">
                            <img src={qr.svg} alt={design?.name || 'QR Code'} className="w-full h-auto rounded-lg" />
                            <p className="mt-2 font-semibold">{design?.name}</p>
                        </Card>
                    );
                })}
            </div>
        </section>
      )}
    </div>
  );
}
