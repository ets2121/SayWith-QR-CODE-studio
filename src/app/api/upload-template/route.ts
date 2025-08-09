
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'image/svg+xml') {
      return NextResponse.json({ error: 'Invalid file type. Please upload an SVG file.' }, { status: 400 });
    }

    const templatesDirectory = path.join(process.cwd(), 'public', 'templates');
    const filePath = path.join(templatesDirectory, file.name);

    // Ensure the directory exists
    await fs.mkdir(templatesDirectory, { recursive: true });

    // Write the file
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, fileBuffer);

    return NextResponse.json({ message: 'Template uploaded successfully', filePath: `/templates/${file.name}` });
  } catch (error) {
    console.error('Template upload failed:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during upload.' }, { status: 500 });
  }
}
