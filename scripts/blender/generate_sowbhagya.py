"""Generate the Sowbhagya Kalyana Mantapa interior prototype.

Conceptual reconstruction, not a measured replica. Every dimension is an
assumption recorded in docs/phase-2/venue-reference-sowbhagya.md.

Run headless:
    blender --background --factory-startup --python scripts/blender/generate_sowbhagya.py

Coordinates: x is width (across the hall), y is length (stage at -y, entrance at
+y), z is height. Units are metres.
"""

import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "assets" / "3d" / "sowbhagya"

# ---------------------------------------------------------------------------
# Assumed dimensions (metres). See the reference record for confidence.
# ---------------------------------------------------------------------------
HALL_LENGTH = 24.0
HALL_WIDTH = 16.0
CEILING = 6.0
WALL = 0.25
STAGE_DEPTH = 4.0
STAGE_WIDTH = 9.0
STAGE_HEIGHT = 0.9
COLUMN_SIZE = 0.4
COLUMN_X = 5.5
COLUMN_Y = (-6.0, 0.0, 6.0)
ROWS = 15
ROW_START = -7.4
ROW_PITCH = 0.9
SEATS_PER_BLOCK = 11
SEAT_PITCH = 0.54
BLOCK_CENTRE = 3.6

HALF_W = HALL_WIDTH / 2
HALF_L = HALL_LENGTH / 2

# Clay palette. Deliberately flat, no textures.
PALETTE = {
    "floor": (0.68, 0.63, 0.53),
    "wall": (0.80, 0.78, 0.72),
    "ceiling": (0.74, 0.72, 0.66),
    "column": (0.72, 0.70, 0.64),
    "stage": (0.40, 0.37, 0.31),
    "seat": (0.27, 0.35, 0.28),
    "table": (0.52, 0.47, 0.38),
    "fixture": (0.14, 0.14, 0.13),
}


# ---------------------------------------------------------------------------
# Scene helpers
# ---------------------------------------------------------------------------
def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene.unit_settings.scale_length = 1.0


def collection(name: str, parent: bpy.types.Collection | None = None) -> bpy.types.Collection:
    coll = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(coll)
    return coll


def clay_material(name: str, rgb: tuple[float, float, float], roughness: float = 0.92):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.18
    elif "Specular" in bsdf.inputs:
        bsdf.inputs["Specular"].default_value = 0.18
    mat.diffuse_color = (*rgb, 1.0)
    return mat


CUBE_FACES = [
    (0, 2, 3, 1),  # bottom, -Z
    (4, 5, 7, 6),  # top, +Z
    (0, 1, 5, 4),  # front, -Y
    (1, 3, 7, 5),  # right, +X
    (2, 6, 7, 3),  # back, +Y
    (0, 4, 6, 2),  # left, -X
]


def compose_boxes(
    name: str,
    parts: list[tuple[tuple[float, float, float], tuple[float, float, float]]],
    material: bpy.types.Material,
    coll: bpy.types.Collection,
) -> bpy.types.Object:
    """One mesh object made of axis-aligned boxes, so each element stays editable."""
    verts: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []

    for centre, size in parts:
        base = len(verts)
        cx, cy, cz = centre
        sx, sy, sz = size
        for dz in (-0.5, 0.5):
            for dy in (-0.5, 0.5):
                for dx in (-0.5, 0.5):
                    verts.append((cx + dx * sx, cy + dy * sy, cz + dz * sz))
        faces.extend(tuple(base + i for i in face) for face in CUBE_FACES)

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.validate(verbose=False)
    mesh.update()
    mesh.materials.append(material)

    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    return obj


def box(
    centre: tuple[float, float, float],
    size: tuple[float, float, float],
) -> tuple[tuple[float, float, float], tuple[float, float, float]]:
    return (centre, size)


# ---------------------------------------------------------------------------
# Architecture
# ---------------------------------------------------------------------------
def wall_solids(
    span: tuple[float, float],
    height: float,
    openings: list[dict],
) -> list[tuple[float, float, float, float]]:
    """Split a wall into solid rectangles around rectangular openings.

    Each opening is {centre, width, sill, height} measured along the wall.
    No booleans, so the topology stays predictable and the file stays editable.
    """
    cuts = {0.0, height}
    for opening in openings:
        cuts.add(opening["sill"])
        cuts.add(opening["sill"] + opening["height"])
    cuts = sorted(c for c in cuts if 0.0 <= c <= height)

    solids: list[tuple[float, float, float, float]] = []
    for z0, z1 in zip(cuts, cuts[1:]):
        if z1 - z0 < 1e-4:
            continue
        holes = sorted(
            (
                opening["centre"] - opening["width"] / 2,
                opening["centre"] + opening["width"] / 2,
            )
            for opening in openings
            if opening["sill"] <= z0 + 1e-6 and opening["sill"] + opening["height"] >= z1 - 1e-6
        )
        cursor = span[0]
        pieces: list[tuple[float, float]] = []
        for hole_start, hole_end in holes:
            if hole_start > cursor:
                pieces.append((cursor, min(hole_start, span[1])))
            cursor = max(cursor, hole_end)
        if cursor < span[1]:
            pieces.append((cursor, span[1]))
        for p0, p1 in pieces:
            if p1 - p0 > 1e-4:
                solids.append((p0, p1, z0, z1))
    return solids


def wall_parts(
    along: str,
    fixed: float,
    span: tuple[float, float],
    height: float,
    thickness: float,
    solids: list[tuple[float, float, float, float]],
) -> list[tuple[tuple[float, float, float], tuple[float, float, float]]]:
    """Turn wall rectangles into boxes. `along` is the axis the wall runs on."""
    parts = []
    for a0, a1, z0, z1 in solids:
        mid = (a0 + a1) / 2
        if along == "x":
            parts.append(box((mid, fixed, (z0 + z1) / 2), (a1 - a0, thickness, z1 - z0)))
        else:
            parts.append(box((fixed, mid, (z0 + z1) / 2), (thickness, a1 - a0, z1 - z0)))
    return parts


def build_architecture(root: bpy.types.Collection, mats: dict) -> None:
    arch = collection("Architecture", root)

    span_x = (-HALF_W, HALF_W)
    span_y = (-HALF_L, HALF_L)

    # Floor slab, top surface at z = 0.
    compose_boxes(
        "Floor",
        [box((0, 0, -0.05), (HALL_WIDTH, HALL_LENGTH, 0.1))],
        mats["floor"],
        arch,
    )

    windows_east = [
        {"centre": y, "width": 1.6, "sill": 3.6, "height": 0.9}
        for y in (-6.0, -2.0, 2.0, 6.0)
    ]
    side_openings = windows_east + [{"centre": 8.0, "width": 1.2, "sill": 0.0, "height": 2.4}]

    # Long walls run along y, inner face flush with the floor edge.
    for side, sign in (("East", 1), ("West", -1)):
        solids = wall_solids(span_y, CEILING, side_openings)
        compose_boxes(
            f"Wall_{side}",
            wall_parts("y", sign * (HALF_W + WALL / 2), span_y, CEILING, WALL, solids),
            mats["wall"],
            arch,
        )

    # Rear wall: main double door at the centre. Front wall is behind the stage.
    rear_solids = wall_solids(span_x, CEILING, [{"centre": 0.0, "width": 2.4, "sill": 0.0, "height": 2.4}])
    compose_boxes(
        "Wall_Rear",
        wall_parts("x", HALF_L + WALL / 2, span_x, CEILING, WALL, rear_solids),
        mats["wall"],
        arch,
    )
    front_solids = wall_solids(span_x, CEILING, [])
    compose_boxes(
        "Wall_Front",
        wall_parts("x", -(HALF_L + WALL / 2), span_x, CEILING, WALL, front_solids),
        mats["wall"],
        arch,
    )

    # Ceiling slab with a simple beam grid.
    ceiling_parts = [box((0, 0, CEILING + 0.12), (HALL_WIDTH, HALL_LENGTH, 0.24))]
    for y in (-8.0, -4.0, 0.0, 4.0, 8.0):
        ceiling_parts.append(box((0, y, CEILING - 0.22), (HALL_WIDTH, 0.3, 0.44)))
    for x in (-COLUMN_X, 0.0, COLUMN_X):
        ceiling_parts.append(box((x, 0, CEILING - 0.15), (0.26, HALL_LENGTH, 0.3)))
    compose_boxes("Ceiling", ceiling_parts, mats["ceiling"], arch)

    # Columns on the two assumed grid lines.
    column_parts = [
        box((side * COLUMN_X, y, CEILING / 2), (COLUMN_SIZE, COLUMN_SIZE, CEILING))
        for side in (-1, 1)
        for y in COLUMN_Y
    ]
    compose_boxes("Columns", column_parts, mats["column"], arch)

    # Pendant fixtures over the centre aisle.
    fixture_parts = []
    for y in (-4.0, 0.0, 4.0):
        fixture_parts.append(box((0, y, 4.55), (1.4, 0.36, 0.14)))
        fixture_parts.append(box((0, y, 5.25), (0.04, 0.04, 1.4)))
    compose_boxes("CeilingFixtures", fixture_parts, mats["fixture"], arch)


def build_stage(root: bpy.types.Collection, mats: dict) -> None:
    stage = collection("Stage", root)
    parts = [
        # Platform, front face at y = -8.
        box((0, -(HALF_L - STAGE_DEPTH / 2), STAGE_HEIGHT / 2), (STAGE_WIDTH, STAGE_DEPTH, STAGE_HEIGHT)),
        # Backdrop panel.
        box((0, -HALF_L + 0.2, STAGE_HEIGHT + 1.7), (STAGE_WIDTH, 0.12, 3.4)),
    ]
    # Three treads in front of the platform, 0.3 rise each.
    for index, top in enumerate((0.3, 0.6, 0.9)):
        centre_y = -HALF_L + STAGE_DEPTH + 0.15 + index * 0.3
        parts.append(box((0, centre_y, top / 2), (4.0, 0.3, top)))
    compose_boxes("Stage", parts, mats["stage"], stage)


# ---------------------------------------------------------------------------
# Furniture
# ---------------------------------------------------------------------------
def chair_parts(centre_x: float, centre_y: float) -> list:
    """A plain chair facing -y: seat, four legs, backrest."""
    cx, cy = centre_x, centre_y
    parts = [
        box((cx, cy, 0.44), (0.46, 0.46, 0.06)),
        box((cx, cy + 0.215, 0.66), (0.44, 0.04, 0.34)),
    ]
    for dx in (-0.19, 0.19):
        for dy in (-0.19, 0.19):
            parts.append(box((cx + dx, cy + dy, 0.21), (0.04, 0.04, 0.42)))
    return parts


def build_furniture(root: bpy.types.Collection, mats: dict) -> None:
    furniture = collection("Furniture", root)

    # Seating: 15 rows, two blocks, centre aisle, facing the stage.
    for row in range(ROWS):
        y = ROW_START + row * ROW_PITCH
        for side, sign in (("Left", -1), ("Right", 1)):
            parts = []
            for seat in range(SEATS_PER_BLOCK):
                offset = (seat - (SEATS_PER_BLOCK - 1) / 2) * SEAT_PITCH
                parts.extend(chair_parts(sign * BLOCK_CENTRE + offset, y))
            compose_boxes(f"Seats_Row{row + 1:02d}_{side}", parts, mats["seat"], furniture)

    # Four tables at the rear, an assumption: registration and gift tables.
    for index, (x, y) in enumerate(((-5.6, 9.6), (5.6, 9.6), (-5.6, 11.0), (5.6, 11.0))):
        parts = [box((x, y, 0.74), (1.8, 0.75, 0.06))]
        for dx in (-0.8, 0.8):
            for dy in (-0.3, 0.3):
                parts.append(box((x + dx, y + dy, 0.36), (0.06, 0.06, 0.72)))
        compose_boxes(f"Table_{index + 1}", parts, mats["table"], furniture)


# ---------------------------------------------------------------------------
# Lighting and camera
# ---------------------------------------------------------------------------
def area_light(
    name: str,
    location: tuple[float, float, float],
    size: tuple[float, float],
    power: float,
    coll: bpy.types.Collection,
    point_up: bool = False,
) -> None:
    """Rectangular area light. Local -Z is the emission direction.

    An unrotated area light shines downward, which is what the hall needs.
    Uplights get a half turn so they wash the ceiling instead.
    """
    data = bpy.data.lights.new(name, type="AREA")
    data.shape = "RECTANGLE"
    data.size, data.size_y = size
    data.energy = power
    data.color = (1.0, 0.985, 0.96)
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    obj.rotation_euler = (math.radians(180) if point_up else 0.0, 0.0, 0.0)
    coll.objects.link(obj)


def build_lighting(root: bpy.types.Collection) -> None:
    lights = collection("Lighting", root)

    # Downlights sit just under the ceiling beams (beam soffit is at 5.56 m).
    # Sizes are kept moderate so the shadow edges stay readable.
    area_light("Key", (0, -1.0, 5.45), (4.5, 5.5), 340, lights)
    area_light("Fill_West", (-5.0, 4.5, 4.9), (2.5, 3.0), 70, lights)
    area_light("Fill_East", (5.0, 4.5, 4.9), (2.5, 3.0), 70, lights)
    area_light("Fill_Rear", (0, 10.0, 4.8), (3.0, 2.5), 110, lights)

    # Ceiling wash. Uplights keep the soffit readable instead of leaving it black.
    # Long strips so the whole soffit gets an even grade, not three bright pools.
    area_light("Uplight_West", (-4.5, 0.0, 5.4), (4.0, 16.0), 260, lights, point_up=True)
    area_light("Uplight_East", (4.5, 0.0, 5.4), (4.0, 16.0), 260, lights, point_up=True)

    world = bpy.data.worlds.new("ClayWorld")
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (0.94, 0.93, 0.90, 1.0)
    background.inputs["Strength"].default_value = 0.35
    bpy.context.scene.world = world


def build_camera(root: bpy.types.Collection) -> bpy.types.Object:
    cams = collection("Cameras", root)
    data = bpy.data.cameras.new("Preview")
    data.lens = 20
    data.sensor_width = 36
    data.clip_start = 0.1
    data.clip_end = 120
    obj = bpy.data.objects.new("PreviewCamera", data)
    # Slightly right of the centre aisle, at standing-plus height, looking at the stage.
    obj.location = (2.2, 10.4, 3.2)
    target = Vector((-0.4, -6.5, 1.35))
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cams.objects.link(obj)
    bpy.context.scene.camera = obj
    return obj


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
def configure_render() -> None:
    scene = bpy.context.scene
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False

    # Cycles resolves soft shadows and occlusion for the clay preview. EEVEE's
    # screen-space raytracing leaves a hard black terminator across the floor.
    try:
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 64
        scene.cycles.use_adaptive_sampling = True
        scene.cycles.use_denoising = True
        scene.cycles.max_bounces = 4
    except (AttributeError, TypeError):
        scene.render.engine = "BLENDER_EEVEE"
        scene.eevee.taa_render_samples = 64

    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.25


def export_glb(excluded: set[str]) -> Path:
    path = OUT / "sowbhagya.glb"
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH" and obj.name not in excluded:
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_materials="EXPORT",
        export_animations=False,
    )
    return path


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    reset_scene()

    root = collection("SOWBHAGYA")
    mats = {key: clay_material(f"Clay_{key.title()}", rgb) for key, rgb in PALETTE.items()}

    build_architecture(root, mats)
    build_stage(root, mats)
    build_furniture(root, mats)
    build_lighting(root)
    build_camera(root)

    configure_render()

    blend_path = OUT / "sowbhagya.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    glb_path = export_glb(set())

    bpy.context.scene.render.filepath = str(OUT / "preview.png")
    bpy.ops.render.render(write_still=True)

    tris = 0
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            tris += sum(len(poly.vertices) - 2 for poly in obj.data.polygons)

    print("PHASE2 model built")
    print(f"PHASE2 objects={len(bpy.context.scene.objects)} tris={tris}")
    print(f"PHASE2 blend={blend_path} bytes={blend_path.stat().st_size if blend_path.exists() else 'missing'}")
    print(f"PHASE2 glb={glb_path} bytes={glb_path.stat().st_size if glb_path.exists() else 'missing'}")


if __name__ == "__main__":
    main()
