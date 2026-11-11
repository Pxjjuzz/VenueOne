# Sowbhagya interior: model notes

Conceptual reconstruction of the main function hall at Sowbhagya Kalyana Mantapa,
Anekal. It is built from the features described in public listings and from
assumed dimensions. It is not a surveyed replica and must not be presented as one.

## Files

| File | What it is |
| --- | --- |
| `sowbhagya.blend` | Editable Blender 5.2 project, collections for architecture, stage, furniture, lighting and cameras |
| `sowbhagya.glb` | Exported glTF 2.0 binary, 43 meshes, 8 materials, 24,588 triangles, 1.2 MB |
| `preview.png` | 1600 x 900 Cycles clay render from the preview camera |
| `../../scripts/blender/generate_sowbhagya.py` | The generator that produced all three |

## Regenerating

```
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" ^
  --background --factory-startup --python scripts/blender/generate_sowbhagya.py
```

The script writes into `assets/3d/sowbhagya/` and prints object, triangle and byte
counts. It takes about a minute, most of it the Cycles render. If Blender is not on
`PATH`, use the full path above.

## Geometry

Units are metres, Z up in Blender, and the glTF export converts to Y up.

| Element | Built as |
| --- | --- |
| Hall | 24.0 m deep, 16.0 m wide, 6.0 m to the ceiling soffit |
| Floor | Single slab, top face at z = 0 |
| Walls | 0.25 m thick, openings cut by rectangle splitting rather than booleans, so the topology stays predictable |
| Windows | 1.6 x 0.9 m strip windows at a 3.6 m sill, four per long wall |
| Doors | 2.4 x 2.4 m rear double door, 1.2 x 2.4 m side door near the rear |
| Ceiling | Slab plus a beam grid and three pendant fixtures |
| Columns | Six 0.4 m square columns at x = +/-5.5, y = -6 / 0 / 6 |
| Stage | 9.0 x 4.0 m platform, 0.9 m high, three treads, 3.4 m backdrop panel |
| Seating | 15 rows of 22 chairs in two blocks, facing the stage |
| Tables | Four 1.8 m rear tables |

Every element is a named object inside a collection, so a human can move, delete or
re-proportion it in Blender without touching the script.

## Materials

Eight flat clay materials, no textures and no image maps: floor, wall, ceiling,
column, stage, seat, table and fixture. Roughness is 0.92 to keep the surfaces matte.
Seats are deep green and the floor is warm stone, which ties the model to the
VenueOne palette without turning it into a stylised illustration.

## Lighting

Cycles, 64 samples with denoising, four downlights, two long ceiling-wash uplights,
and a neutral world at 0.5 strength. AgX with medium-high contrast, exposure -0.25.

EEVEE was tried first and abandoned for the preview: its screen-space raytracing
painted a hard black terminator across the floor, and without raytracing the
contact shadows disappeared entirely. Cycles resolves both. The GLB itself carries
no lights and no camera, so the web viewer lights the model itself.

## What is assumed, not measured

Recorded in full, with confidence levels, in
`docs/phase-2/venue-reference-sowbhagya.md`. In summary: every dimension, the column
grid, the door and window positions, the seating layout and the rear tables are
estimates chosen to fit the reported capacity of 350 seated and 550 floating. The
only facts taken from sources are the venue's identity, its stage, its high ceiling,
its ground-floor layout, and its capacity claims, which conflict between listings.

## Publishing rules

The model ships as a development prototype, accuracy `conceptual`. Uploading it
through the Super Admin panel leaves it in `draft`. Moving it to `published` is a
deliberate administrator action, and the customer UI labels the result as a
conceptual reconstruction wherever it appears.

## Adapting this for another venue

1. Copy `generate_sowbhagya.py`, change the constants at the top, and keep the
   helper functions.
2. Run it, inspect `preview.png`, and iterate on proportions before exporting.
3. Upload the new GLB through Super Admin for that venue. The viewer reads the URL
   from the database, so no application code changes.
