# Pietje's share card picture: three posed Minecraft Pieten, rendered by Blender on a transparent
# background with their shadows, for card.html to put the words next to (see there). The skins are
# the app's own examples, downloaded from it: groen.png (the plain link), rood.png and roze.png (the
# Rood and Roze buttons, with roetvegen). From this folder:
#   blender -b -P render.py -- . pieten.png
# Every part is a box in skin pixels with Minecraft's 64x64 layout on its faces; the outer layer
# (hat, sleeves) a little bigger, as in the game. Pixels stay square: the texture is sampled Closest.
import math
import os
import sys

import bpy
from mathutils import Vector

# absolute: Blender reads a relative path as relative to the .blend file, and there is none
skins, out = map(os.path.abspath, sys.argv[sys.argv.index("--") + 1:][:2])

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# Minecraft's skin layout: per part its size (w, h, d), inner and outer layer origin on the skin,
# where it hangs from (the pivot) and how much bigger the outer layer is
PARTS = {
    "head": ((8, 8, 8), (0, 0), (32, 0), (0, 0, 24), (0, 0, 4), 0.5),
    "body": ((8, 12, 4), (16, 16), (16, 32), (0, 0, 24), (0, 0, -6), 0.25),
    "arm_r": ((4, 12, 4), (40, 16), (40, 32), (-5, 0, 22), (-1, 0, -4), 0.25),
    "arm_l": ((4, 12, 4), (32, 48), (48, 48), (5, 0, 22), (1, 0, -4), 0.25),
    "leg_r": ((4, 12, 4), (0, 16), (0, 32), (-1.95, 0, 12), (0, 0, -6), 0.25),
    "leg_l": ((4, 12, 4), (16, 48), (0, 48), (1.95, 0, 12), (0, 0, -6), 0.25),
}


def box(name, size, uv, grow, center, mat):
    """A box facing -Y (the camera), each face's quad in the skin's pixel rectangle for it."""
    w, h, d = size
    u, v = uv
    x0, x1 = center[0] - w / 2 - grow, center[0] + w / 2 + grow
    y0, y1 = center[1] - d / 2 - grow, center[1] + d / 2 + grow
    z0, z1 = center[2] - h / 2 - grow, center[2] + h / 2 + grow
    # corners top-left, top-right, bottom-right, bottom-left as seen from outside; skin rect (px)
    faces = [
        ([(x0, y1, z1), (x1, y1, z1), (x1, y0, z1), (x0, y0, z1)], (u + d, v, w, d)),  # top
        ([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], (u + d + w, v, w, d)),  # bottom
        ([(x0, y1, z1), (x0, y0, z1), (x0, y0, z0), (x0, y1, z0)], (u, v + d, d, h)),  # right (-X)
        ([(x0, y0, z1), (x1, y0, z1), (x1, y0, z0), (x0, y0, z0)], (u + d, v + d, w, h)),  # front (-Y)
        ([(x1, y0, z1), (x1, y1, z1), (x1, y1, z0), (x1, y0, z0)], (u + d + w, v + d, d, h)),  # left (+X)
        ([(x1, y1, z1), (x0, y1, z1), (x0, y1, z0), (x1, y1, z0)], (u + 2 * d + w, v + d, w, h)),  # back
    ]
    verts, polys, uvs = [], [], []
    for corners, (ru, rv, rw, rh) in faces:
        polys.append(tuple(range(len(verts), len(verts) + 4)))
        verts += corners
        for pu, pv in ((ru, rv), (ru + rw, rv), (ru + rw, rv + rh), (ru, rv + rh)):
            uvs.append((pu / 64, 1 - pv / 64))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], polys)
    layer = mesh.uv_layers.new()
    for i, loop in enumerate(mesh.loops):
        layer.data[i].uv = uvs[loop.vertex_index]
    mesh.materials.append(mat)
    return mesh


def skin_material(path):
    mat = bpy.data.materials.new(path)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(path)
    tex.interpolation = "Closest"
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    bsdf.inputs["Roughness"].default_value = 0.85
    return mat


def piet(name, skin, location, turn, pose):
    """A Piet at LOCATION, turned TURN degrees, each part rotated as POSE says (degrees x, y, z)."""
    mat = skin_material(f"{skins}/{skin}.png")
    root = bpy.data.objects.new(name, None)
    scene.collection.objects.link(root)
    for part, (size, inner, outer, pivot, offset, grow) in PARTS.items():
        obj = bpy.data.objects.new(f"{name}.{part}", None)
        obj.location = pivot
        obj.rotation_euler = [math.radians(a) for a in pose.get(part, (0, 0, 0))]
        obj.parent = root
        scene.collection.objects.link(obj)
        for layer, uv, g in (("inner", inner, 0), ("outer", outer, grow)):
            o = bpy.data.objects.new(f"{name}.{part}.{layer}", box(f"{name}.{part}.{layer}", size, uv, g, offset, mat))
            o.parent = obj
            scene.collection.objects.link(o)
    root.location = location
    root.rotation_euler = (0, 0, math.radians(turn))
    return root


# Poses, in degrees about x (+: backward), y (+: the right arm outward, the left arm inward), z
piet("rood", "rood", (-16.5, 7, 0), 26, {  # striding in from the left
    "head": (0, 0, -12), "arm_r": (28, 0, 0), "arm_l": (-34, 0, 0), "leg_r": (-24, 0, 0), "leg_l": (22, 0, 0)})
piet("groen", "groen", (0, -2, 0), 4, {  # waving
    "head": (-4, 8, 0), "arm_r": (0, 158, 0), "arm_l": (-10, -6, 0), "leg_r": (0, 0, 4), "leg_l": (0, 0, -4)})
piet("roze", "roze", (16.5, 7, 0), -28, {  # cheering
    "head": (-8, -6, 8), "arm_r": (-12, 8, 0), "arm_l": (-14, -142, 0), "leg_r": (-10, 0, 0), "leg_l": (12, 0, 0)})

# the ground only catches shadows: the card's background shows through it
bpy.ops.mesh.primitive_plane_add(size=400)
bpy.context.object.is_shadow_catcher = True

# a soft key from the front left, a cooler rim from behind, the warm card color as fill: together
# about as bright as the skin itself on the faces turned to the camera, so bright suits keep their shading
bpy.ops.object.light_add(type="SUN", rotation=(math.radians(32), 0, math.radians(-28)))
bpy.context.object.data.energy = 2.0
bpy.context.object.data.angle = math.radians(24)
bpy.ops.object.light_add(type="AREA", location=(30, 45, 50))
rim = bpy.context.object
rim.data.energy = 45000
rim.data.size = 30
rim.data.color = (0.9, 0.95, 1.0)
rim.visible_shadow = False  # a rim only: its shadow would fall toward the camera
rim.rotation_euler = (Vector((0, 0, 16)) - rim.location).to_track_quat("-Z", "Y").to_euler()
world = bpy.data.worlds.new("card")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.93, 0.86, 0.77, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.55
scene.world = world

# a long lens, a little from below the heads, so they stand tall; the group on the right of the card
cam = bpy.data.objects.new("camera", bpy.data.cameras.new("camera"))
scene.collection.objects.link(cam)
cam.data.lens = 85
cam.data.shift_x = -0.235
cam.location = (5, -248, 33)
cam.rotation_euler = (Vector((0, 0, 16.5)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

scene.render.engine = "CYCLES"
scene.cycles.samples = 256
scene.cycles.use_denoising = True
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = "GPU"
except TypeError:
    pass
scene.view_settings.view_transform = "Standard"  # the skins' own colors, not a film look
scene.render.film_transparent = True
scene.render.resolution_x, scene.render.resolution_y = 1200, 630
scene.render.resolution_percentage = 100
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
