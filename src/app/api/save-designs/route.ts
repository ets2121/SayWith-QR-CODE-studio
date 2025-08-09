
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const designs = await req.json();
    
    if (!designs || !Array.isArray(designs)) {
      return NextResponse.json({ error: 'Invalid designs data provided.' }, { status: 400 });
    }

    const designsFilePath = path.join(process.cwd(), 'public', 'designs.json');
    
    // Convert the data to a formatted JSON string
    const jsonString = JSON.stringify(designs, null, 2);

    // Write the file
    await fs.writeFile(designsFilePath, jsonString, 'utf-8');

    return NextResponse.json({ message: 'Designs saved successfully.' });
  } catch (error) {
    console.error('Failed to save designs:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while saving the designs.' }, { status: 500 });
  }
}
