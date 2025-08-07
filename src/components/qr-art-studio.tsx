
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
import { QrCode, Palette, Download, Trash2, Plus, Settings, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Slider } from './ui/slider';

const QR_IMG_SIZE = 512;

export default function QrArtStudio() {
  const [content, setContent] = useState('https://firebase.google.com/');
  const [designs, setDesigns] = useState<Design[]>([]);
  const [svgTemplates, setSvgTemplates] = useState<string[]>([]);
  const [generatedQrs, setGeneratedQrs] = useState<GeneratedQr[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const { toast } = useToast();
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  
  const drawCustomQr = (qrData: QRCode.QRCode, design: Design, bgImage: string | null): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const canvasSize = QR_IMG_SIZE;
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Could not get canvas context');
  
      const modules = qrData.modules.data;
      const moduleCount = qrData.modules.size;
      const moduleSize = canvasSize / moduleCount;
  
      const drawBackground = () => {
        return new Promise<void>((bgResolve) => {
          if (design.transparentBg) {
              ctx.clearRect(0, 0, canvasSize, canvasSize);
              bgResolve();
              return;
          }

          if (design.useImage && bgImage) {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
              bgResolve();
            };
            img.onerror = () => {
              ctx.fillStyle = design.backgroundColor;
              ctx.fillRect(0, 0, canvasSize, canvasSize);
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
              ctx.fillStyle = design.backgroundColor;
            }
            ctx.fillRect(0, 0, canvasSize, canvasSize);
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

      const drawModule = (x: number, y: number, size: number, style: Design['pixelStyle'] | Design['eyeStyle'], radius: number) => {
        const top = y * size;
        const left = x * size;
        ctx.beginPath();
        switch (style) {
          case 'dot':
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
            ctx.roundRect(left, top, size, size, [radius]);
            break;
          default: // square
            ctx.rect(left, top, size, size);
            break;
        }
        ctx.fill();
      }
  
      drawBackground().then(() => {
        let pixelFillStyle: string | CanvasGradient = design.pixelColor;
        if (design.pixelGradientStart && design.pixelGradientEnd) {
          const gradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
          gradient.addColorStop(0, design.pixelGradientStart);
          gradient.addColorStop(1, design.pixelGradientEnd);
          pixelFillStyle = gradient;
        }
  
        for (let y = 0; y < moduleCount; y++) {
          for (let x = 0; x < moduleCount; x++) {
            const index = y * moduleCount + x;
            if (!modules[index]) continue;

            const isFinder = isFinderPattern(x, y, moduleCount);
            
            if (isFinder) {
              ctx.fillStyle = design.eyeColor;
              drawModule(x, y, moduleSize, design.eyeStyle, design.eyeRadius);
            } else {
              ctx.fillStyle = pixelFillStyle;
              drawModule(x, y, moduleSize, design.pixelStyle, moduleSize * 0.25);
            }
          }
        }
        resolve(canvas.toDataURL('image/png'));
      });
    });
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
        
        const useSimpleGenerator = design.pixelStyle === 'square' &&
                                   design.eyeStyle === 'square' &&
                                   !design.useImage && 
                                   !design.transparentBg &&
                                   !design.pixelGradientStart && 
                                   !design.bgGradientStart;

        if (useSimpleGenerator) {
             qrCodeDataUrl = await QRCode.toDataURL(content, {
                errorCorrectionLevel: 'H',
                width: QR_IMG_SIZE,
                color: {
                    dark: design.pixelColor,
                    light: design.backgroundColor,
                },
            });
        } else {
            qrCodeDataUrl = await drawCustomQr(qrData, design, design.useImage ? backgroundImage : null);
        }

        const templateResponse = await fetch(design.template);
        if (!templateResponse.ok) {
           toast({ variant: "destructive", title: `Error loading template for ${design.name}`, description: `Could not fetch ${design.template}` });
           continue;
        }
        let svgText = await templateResponse.text();

        svgText = svgText.replace(/(<image[^>]*?(?:href|xlink:href)=")[^"]*(")/, `$1${qrCodeDataUrl}$2`);
        
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
  
  const addDesign = () => {
    const newId = designs.length > 0 ? Math.max(...designs.map(d => d.id)) + 1 : 1;
    const newDesign: Design = {
      id: newId,
      name: `New Design ${newId}`,
      template: svgTemplates[0] || '',
      pixelStyle: "square",
      pixelColor: "#000000",
      backgroundColor: "#FFFFFF",
      foregroundColor: "#000000",
      eyeStyle: 'square',
      eyeColor: "#000000",
      eyeRadius: 8,
      text: "Your Text Here",
      useImage: false,
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
  
  const saveDesignsToJson = () => {
    const jsonString = JSON.stringify(designs, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    saveAs(blob, 'designs.json');
    toast({ title: "Designs Saved", description: "Your designs.json file has been prepared for download." });
  };


  const renderDesignManager = () => (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2"><Palette />Design Presets</CardTitle>
        <CardDescription>Manage your QR code design templates. These settings will be saved to `designs.json`.</CardDescription>
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
                          <SelectItem value="dot">Dot</SelectItem>
                          <SelectItem value="diamond">Diamond</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                </div>

                {/* Eye Settings */}
                 <div className="p-4 border rounded-lg space-y-4">
                    <h4 className="font-semibold text-lg">Eye Customization</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label>Eye Style</Label>
                            <Select value={design.eyeStyle} onValueChange={(v: Design['eyeStyle']) => updateDesign(design.id, { eyeStyle: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                <SelectItem value="square">Square</SelectItem>
                                <SelectItem value="rounded">Rounded</SelectItem>
                                <SelectItem value="dot">Dot</SelectItem>
                                <SelectItem value="diamond">Diamond</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Eye Color</Label>
                            <Input type="color" value={design.eyeColor} onChange={(e) => updateDesign(design.id, { eyeColor: e.target.value })} className="p-1 h-10"/>
                        </div>
                    </div>
                    <div>
                        <Label>Eye Radius (for corners)</Label>
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
                        <Label>Pixel Color</Label>
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
                        <Input type="color" value={design.pixelGradientStart || '#000000'} onChange={(e) => updateDesign(design.id, { pixelGradientStart: e.target.value })} className="p-1 h-10"/>
                    </div>
                     <div>
                        <Label>Pixel Gradient End</Label>
                        <Input type="color" value={design.pixelGradientEnd || '#000000'} onChange={(e) => updateDesign(design.id, { pixelGradientEnd: e.target.value })} className="p-1 h-10"/>
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

                <Button variant="destructive" size="sm" onClick={() => removeDesign(design.id)}><Trash2 className="mr-2"/> Remove Design</Button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={addDesign}><Plus className="mr-2"/> Add Design</Button>
        <Button onClick={saveDesignsToJson} variant="outline">Save designs.json</Button>
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
