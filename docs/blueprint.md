# **App Name**: QR Art Studio

## Core Features:

- Content Input: Input content (URL, text) for QR code generation with a file picker for background images.
- Design Management: Dynamic design management interface to add/edit design properties (SVG path, pixel style, colors, etc.) and save to a JSON file.
- JSON-Driven Design Injection: JSON file processing: Reads design properties from a JSON file to generate QR codes, injects the QR code (as a base64 encoded string) into an SVG template, and loops through all designs.
- Design Preview: Displays previews of all generated QR code designs.
- Bulk Download: Option to download all generated designs in PNG or PDF format.
- Status Notifications: Visual feedback for QR code generation via a loading animation and error/success pop-up notifications.

## Style Guidelines:

- Background color: Dark grayish blue (#222F3E) for a sophisticated, dark theme.
- Primary color: Vivid cyan (#2DD4FF) to ensure a striking contrast and modern aesthetic against the dark background.
- Accent color: Electric violet (#9F5DFF), analogous to cyan, for interactive elements and highlights.
- Headline font: 'Space Grotesk' (sans-serif) for a techy, scientific feel; use 'Inter' (sans-serif) for body text.
- Use a set of crisp, minimalist icons with a line-art style to represent various design settings and functionalities.
- Two-tab layout: One tab for content input and the other for design management, ensuring organized access to functionalities.
- Implement subtle animations during QR code generation to give clear user feedback; use progress bars or loading spinners.