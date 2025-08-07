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
  
  const handleGenerate = async () => {
    if (!content) {
      toast({ variant: "destructive", title: "Error", description: "Content cannot be empty." });
      return;
    }

    setIsLoading(true);
    setGeneratedQrs([]);

    try {
      const qrResults: GeneratedQr[] = [];

      for (const design of designs) {
        if (design.useImage && !backgroundImage) {
          toast({ variant: "destructive", title: `Skipping ${design.name}`, description: "Please select a background image first." });
          continue;
        }

        const qrOptions: QRCode.QRCodeToDataURLOptions = {
          errorCorrectionLevel: 'H',
          width: QR_IMG_SIZE,
          margin: 1,
          color: {
            dark: design.pixelColor,
            light: design.useImage ? '#00000000' : design.backgroundColor,
          },
        };
        
        // The qrcode library doesn't support different eye colors directly.
        // This is a limitation we'll accept for now. A more advanced implementation
        // would involve custom drawing on a canvas.
        const qrCodeDataUrl = await QRCode.toDataURL(content, qrOptions);

        const templateResponse = await fetch(design.template);
        if (!templateResponse.ok) {
           toast({ variant: "destructive", title: `Error loading template for ${design.name}`, description: `Could not fetch ${design.template}` });
           continue;
        }
        let svgText = await templateResponse.text();

        // 1. Replace QR Code placeholder
        svgText = svgText.replace(/xlink:href="data:image\/png;base64,[^"]+"/g, `xlink:href="${qrCodeDataUrl}"`);
        svgText = svgText.replace(/href="data:image\/png;base64,[^"]+"/g, `href="${qrCodeDataUrl}"`);

        // 2. Replace background image if needed
        if (design.useImage && backgroundImage) {
          svgText = svgText.replace(/id="background-image"[^>]*href="[^"]*"/, `id="background-image" href="${backgroundImage}"`);
        }
        
        // 3. Replace text placeholder
        if (design.text) {
           svgText = svgText.replace(/>TEXT</g, `>${design.text}<`);
        }

        qrResults.push({
          designId: design.id,
          svg: `data:image/svg+xml;base64,${btoa(svgText)}`,
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
        
        // To convert SVG data URL to blob for zipping
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
      eyeColor: "#000000",
      text: "Your Text Here",
      useImage: false
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
    // This is a client-side "save". It prepares a file for the user to download.
    // To persist changes automatically, a backend API would be required.
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
                          <SelectItem value="rounded">Rounded (Not Implemented)</SelectItem>
                          <SelectItem value="dot">Dot (Not Implemented)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>Pixel Color</Label>
                    <Input type="color" value={design.pixelColor} onChange={(e) => updateDesign(design.id, { pixelColor: e.target.value })} className="p-1 h-10"/>
                  </div>
                  <div>
                    <Label>Eye Color</Label>
                     <Input type="color" value={design.eyeColor} onChange={(e) => updateDesign(design.id, { eyeColor: e.target.value })} className="p-1 h-10" disabled/>
                     <p className='text-xs text-muted-foreground mt-1'>Not Implemented</p>
                  </div>
                  <div>
                    <Label>QR Background Color</Label>
                    <Input type="color" value={design.backgroundColor} onChange={(e) => updateDesign(design.id, { backgroundColor: e.target.value })} className="p-1 h-10" disabled={design.useImage}/>
                    {design.useImage && <p className="text-xs text-muted-foreground mt-1">Disabled when using background image.</p>}
                  </div>
                </div>
                
                 <div className="space-y-2">
                    <Label>Embedded Text</Label>
                    <Textarea
                      value={design.text}
                      onChange={(e) => updateDesign(design.id, { text: e.target.value })}
                      placeholder="Enter text to embed in the SVG"
                    />
                 </div>

                <div className="flex items-center space-x-2">
                    <Switch
                        id={`use-image-${design.id}`}
                        checked={design.useImage}
                        onCheckedChange={(checked) => updateDesign(design.id, { useImage: checked })}
                    />
                    <Label htmlFor={`use-image-${design.id}`}>Use Background Image in SVG</Label>
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
                  <p className="text-sm text-muted-foreground">Used by designs where "Use Background Image" is enabled.</p>
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
