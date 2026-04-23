# Brand assets — proposal platform

Per-entity brand files used by the proposal platform's document generator and
by the admin brand preview. Each entity has its own subfolder; files are
optional — the document generator falls back to a text wordmark when a file is
missing.

## Folder layout

- public/brands/exousia/
- public/brands/vitalx/
- public/brands/ironhouse/

## File names and requirements

Inside each entity folder:

- logo.png       (required) primary logo for proposal cover, letterhead. PNG, transparent background, 1000px+ wide, 300+ DPI.
- logo-mono.png  (optional) monochrome version for black-and-white printing.
- signature.png  (optional) scanned signature block for auto-signed cover letters. PNG, transparent, 400x150px approx.

SVG beats PNG at any resolution; use PNG if SVG is not available.

## Quick drop-in

Copy the logo files you have into:

- Exousia: public/brands/exousia/logo.png
- VitalX:  public/brands/vitalx/logo.png
- IronHouse: public/brands/ironhouse/logo.png (add when ready)

Commit the files via git (the platform's deploy script bundles them into the
Next.js public folder automatically).

## Brand colors (used in docx generation)

- Exousia: primary #253A5E navy, accent #D4AF37 gold
- VitalX: primary #064E3B dark green, accent #06A59A teal
- IronHouse: primary #292524 stone, accent #B45309 amber

## Voice guides

Each entity has a distinct voice guide in src/lib/proposals/brand-config.ts.
The humanizer post-processor applies the voice guide to every AI-drafted
paragraph before it lands in a document.
