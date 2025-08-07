import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const templatesDirectory = path.join(process.cwd(), 'public', 'templates');
  try {
    const filenames = fs.readdirSync(templatesDirectory);
    const svgFiles = filenames
      .filter((file) => file.endsWith('.svg'))
      .map((file) => `/templates/${file}`);
    return NextResponse.json(svgFiles);
  } catch (error) {
    console.error('Failed to read templates directory:', error);
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }
}
