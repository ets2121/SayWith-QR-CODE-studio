"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Design, GeneratedQr } from '@/lib/types';
import QRCode, { QRCodeToDataURLOptions } from 'qrcode';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { QrCode, Palette, Download, Trash2, Plus, Settings, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

const PIXEL_SIZE = 10;
const PADDING = 2; // 2 * PIXEL_SIZE = 20px padding
const QR_SVG_SIZE = 300;


const isFinderPattern = (x: number, y: number, size: number) => {
  return (
    (x < 7 && y < 7) ||
    (x > size - 8 && y < 7) ||
    (x < 7 && y > size - 8)
  );
};

const QrSvgRenderer = ({ qrMatrix, design }: { qrMatrix: boolean[][], design: Design }) => {
  const size = qrMatrix.length;
  const svgSize = size * PIXEL_SIZE + (PADDING * PIXEL_SIZE * 2);

  const clearedAreaSize = Math.floor(size * design.logoSize);
  const start = Math.floor((size - clearedAreaSize) / 2);
  const end = start + clearedAreaSize;

  const renderPixel = (x: number, y: number) => {
    const isPartOfLogo = design.logo && x >= start && x < end && y >= start && y < end;
    if (isPartOfLogo) return null;
    if (!qrMatrix[y][x]) return null;

    const color = isFinderPattern(x, y, size) ? design.eyeColor : design.pixelColor;
    const key = `${y}-${x}`;
    const props = {
      key,
      x: x * PIXEL_SIZE + (PADDING * PIXEL_SIZE),
      y: y * PIXEL_SIZE + (PADDING * PIXEL_SIZE),
      width: PIXEL_SIZE,
      height: PIXEL_SIZE,
      fill: color,
    };

    switch (design.pixelStyle) {
      case 'dot':
        return <circle cx={props.x + PIXEL_SIZE / 2} cy={props.y + PIXEL_SIZE / 2} r={PIXEL_SIZE / 2} fill={color} key={key} />;
      case 'rounded':
        return <rect {...props} rx={PIXEL_SIZE / 2} />;
      default:
        return <rect {...props} />;
    }
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      width={QR_SVG_SIZE}
      height={QR_SVG_SIZE}
      className="qr-code-svg"
    >
      <rect width="100%" height="100%" fill={design.backgroundColor} />
      {qrMatrix.map((row, y) => row.map((_, x) => renderPixel(x, y)))}
      {design.logo && (
        <image
          href={design.logo}
          x={(start * PIXEL_SIZE) + (PADDING * PIXEL_SIZE) - (design.logoPadding)}
          y={(start * PIXEL_SIZE) + (PADDING * PIXEL_SIZE) - (design.logoPadding)}
          width={(clearedAreaSize * PIXEL_SIZE) + (design.logoPadding * 2)}
          height={(clearedAreaSize * PIXEL_SIZE) + (design.logoPadding * 2)}
        />
      )}
    </svg>
  );
};

export default function QrArtStudio() {
  const [content, setContent] = useState('https://firebase.google.com/');
  const [designs, setDesigns] = useState<Design[]>([]);
  const [generatedQrs, setGeneratedQrs] = useState<GeneratedQr[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/designs.json')
      .then((res) => res.json())
      .then((data: Design[]) => {
        setDesigns(data);
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load default designs.",
        });
      });
  }, [toast]);

  const handleGenerate = async () => {
    if (!content) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Content cannot be empty.",
      });
      return;
    }

    setIsLoading(true);
    setGeneratedQrs([]);

    try {
      const qr = QRCode.create(content, { errorCorrectionLevel: 'H' });
      const matrix: boolean[][] = [];
      for (let y = 0; y < qr.modules.size; y++) {
        const row: boolean[] = [];
        for (let x = 0; x < qr.modules.size; x++) {
          row.push(qr.modules.get(x, y));
        }
        matrix.push(row);
      }
      
      const newQrs = designs.map(design => {
        const svgElement = <QrSvgRenderer qrMatrix={matrix} design={design} />;
        
        // This is a simplification; for a real app, you'd use a library to render JSX to string on the client if needed,
        // but for now, we'll just re-render for download. This structure makes the SVG available for display.
        // We'll generate SVG strings for download later.
        return { designId: design.id, svg: '' }; // SVG string is generated on download
      });

      // To make previews visible, we can't store JSX in state.
      // So we will just trigger a re-render and the preview component will use the new matrix.
      // A better way is to generate SVG strings here. Let's do a simplified version of that.
      
      const promises = designs.map(async (design) => {
        const size = matrix.length;
        const svgSize = size * PIXEL_SIZE + (PADDING * PIXEL_SIZE * 2);
        let svgContent = `<rect width="100%" height="100%" fill="${design.backgroundColor}" />`;
        
        const clearedAreaSize = Math.floor(size * design.logoSize);
        const start = Math.floor((size - clearedAreaSize) / 2);
        const end = start + clearedAreaSize;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
             const isPartOfLogo = design.logo && x >= start && x < end && y >= start && y < end;
            if (isPartOfLogo || !matrix[y][x]) continue;

            const color = isFinderPattern(x, y, size) ? design.eyeColor : design.pixelColor;
            const px = x * PIXEL_SIZE + (PADDING * PIXEL_SIZE);
            const py = y * PIXEL_SIZE + (PADDING * PIXEL_SIZE);

            if (design.pixelStyle === 'dot') {
              svgContent += `<circle cx="${px + PIXEL_SIZE / 2}" cy="${py + PIXEL_SIZE / 2}" r="${PIXEL_SIZE / 2}" fill="${color}" />`;
            } else if (design.pixelStyle === 'rounded') {
              svgContent += `<rect x="${px}" y="${py}" width="${PIXEL_SIZE}" height="${PIXEL_SIZE}" rx="${PIXEL_SIZE / 2}" fill="${color}" />`;
            } else {
              svgContent += `<rect x="${px}" y="${py}" width="${PIXEL_SIZE}" height="${PIXEL_SIZE}" fill="${color}" />`;
            }
          }
        }
        
        if (design.logo) {
            const logoX = (start * PIXEL_SIZE) + (PADDING * PIXEL_SIZE) - (design.logoPadding);
            const logoY = (start * PIXEL_SIZE) + (PADDING * PIXEL_SIZE) - (design.logoPadding);
            const logoSvgSize = (clearedAreaSize * PIXEL_SIZE) + (design.logoPadding * 2);
            svgContent += `<image href="${design.logo}" x="${logoX}" y="${logoY}" width="${logoSvgSize}" height="${logoSvgSize}" />`;
        }
        
        const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${QR_SVG_SIZE}" height="${QR_SVG_SIZE}">${svgContent}</svg>`;
        return { designId: design.id, svg: `data:image/svg+xml;base64,${btoa(fullSvg)}` };
      });
      
      const results = await Promise.all(promises);
      setGeneratedQrs(results);

      toast({
        title: "Success",
        description: "QR codes generated successfully.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate QR codes. Please check your content.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (generatedQrs.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing to download',
        description: 'Please generate some QR codes first.',
      });
      return;
    }
    setIsDownloading(true);
    const zip = new JSZip();

    const promises = Array.from(previewContainerRef.current?.querySelectorAll('img.qr-code-preview') || [])
      .map(async (img, index) => {
        const design = designs.find(d => d.id === generatedQrs[index].designId);
        const designName = design ? design.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : `design_${index + 1}`;
        const canvas = document.createElement('canvas');
        canvas.width = QR_SVG_SIZE * 2;
        canvas.height = QR_SVG_SIZE * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        return new Promise<void>((resolve) => {
            const image = new Image();
            image.src = (img as HTMLImageElement).src;
            image.onload = () => {
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        zip.file(`${designName}.png`, blob);
                    }
                    resolve();
                }, 'image/png');
            };
            image.onerror = () => resolve();
        });
      });

    await Promise.all(promises);

    zip.generateAsync({ type: 'blob' }).then((content) => {
      saveAs(content, 'qr-art-studio-designs.zip');
    });
    setIsDownloading(false);
  };
  
  const addDesign = () => {
    const newId = designs.length > 0 ? Math.max(...designs.map(d => d.id)) + 1 : 1;
    const newDesign: Design = {
      id: newId,
      name: `New Design ${newId}`,
      pixelStyle: "square",
      pixelColor: "#2DD4FF",
      backgroundColor: "#222F3E",
      eyeColor: "#9F5DFF",
      logoSize: 0.3,
      logoPadding: 5,
    };
    setDesigns([...designs, newDesign]);
  };
  
  const updateDesign = (id: number, updatedProps: Partial<Design>) => {
    setDesigns(designs.map(d => d.id === id ? { ...d, ...updatedProps } : d));
  };

  const removeDesign = (id: number) => {
    setDesigns(designs.filter(d => d.id !== id));
  };
  
  const handleLogoUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateDesign(id, { logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };


  const renderDesignManager = () => (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2"><Palette />Design Presets</CardTitle>
        <CardDescription>Customize the appearance of your QR codes. Add or edit designs below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          {designs.map(design => (
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
              <AccordionContent className="p-4 space-y-6 bg-background/50 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div>
                    <Label>Pixel Style</Label>
                    <Select value={design.pixelStyle} onValueChange={(v: Design['pixelStyle']) => updateDesign(design.id, { pixelStyle: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="square">Square</SelectItem>
                        <SelectItem value="rounded">Rounded</SelectItem>
                        <SelectItem value="dot">Dot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Pixels</Label>
                      <Input type="color" value={design.pixelColor} onChange={(e) => updateDesign(design.id, { pixelColor: e.target.value })} className="p-1 h-10"/>
                    </div>
                    <div>
                      <Label>Eyes</Label>
                      <Input type="color" value={design.eyeColor} onChange={(e) => updateDesign(design.id, { eyeColor: e.target.value })} className="p-1 h-10"/>
                    </div>
                    <div>
                      <Label>BG</Label>
                      <Input type="color" value={design.backgroundColor} onChange={(e) => updateDesign(design.id, { backgroundColor: e.target.value })} className="p-1 h-10"/>
                    </div>
                  </div>
                </div>

                <div className='space-y-4'>
                    <Label>Logo</Label>
                    <div className="flex items-center gap-2">
                         <Input id={`logo-upload-${design.id}`} type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={(e) => handleLogoUpload(design.id, e)} className="hidden"/>
                         <Button asChild variant="outline">
                            <label htmlFor={`logo-upload-${design.id}`} className="cursor-pointer">
                                <ImageIcon className="mr-2" /> Upload
                            </label>
                         </Button>
                         {design.logo && 
                            <div className="flex items-center gap-2">
                                <img src={design.logo} alt="logo preview" className="w-10 h-10 rounded-sm bg-white p-1"/>
                                <Button variant="ghost" size="icon" onClick={() => updateDesign(design.id, {logo: undefined})}>
                                    <X className="w-4 h-4"/>
                                </Button>
                            </div>
                         }
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Logo Size ({Math.round(design.logoSize * 100)}%)</Label>
                        <Slider value={[design.logoSize]} onValueChange={([v]) => updateDesign(design.id, { logoSize: v })} max={0.5} step={0.01} />
                    </div>
                     <div className="space-y-2">
                        <Label>Logo Padding ({design.logoPadding}px)</Label>
                        <Slider value={[design.logoPadding]} onValueChange={([v]) => updateDesign(design.id, { logoPadding: v })} max={20} step={1} />
                    </div>
                </div>

                <Button variant="destructive" size="sm" onClick={() => removeDesign(design.id)}><Trash2 className="mr-2"/> Remove Design</Button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
      <CardFooter>
        <Button onClick={addDesign}><Plus className="mr-2"/> Add Design</Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl md:text-6xl font-headline font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          QR Art Studio
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Create and customize beautiful QR codes with dynamic designs.
        </p>
      </header>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content"><QrCode className="mr-2" />Content</TabsTrigger>
          <TabsTrigger value="designs"><Settings className="mr-2" />Designs</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">QR Code Content</CardTitle>
              <CardDescription>Enter the URL or text you want your QR code to link to.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="content-input">Content (URL or Text)</Label>
                <Input
                  id="content-input"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="e.g., https://example.com"
                />
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
                    <Card key={i} className="flex flex-col items-center justify-center p-4">
                        <Skeleton className="w-[250px] h-[250px] rounded-lg" />
                        <Skeleton className="h-4 w-3/4 mt-4" />
                    </Card>
                ))}
                {!isLoading && generatedQrs.map(qr => {
                    const design = designs.find(d => d.id === qr.designId);
                    return (
                        <Card key={qr.designId} className="p-4 flex flex-col items-center">
                            <img src={qr.svg} alt={design?.name || 'QR Code'} className="qr-code-preview rounded-lg" />
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
