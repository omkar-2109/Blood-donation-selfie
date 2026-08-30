# Humanness Blood Drive — Digital Selfie Kiosk Assets

Included:
- frames/frame_photo_only.png — frame with photo area only
- frames/frame_with_name.png — frame with photo area + name area
- brand/snc_f_logo_transparent.png — transparent SNCF logo lockup
- brand/snc_f_emblem_transparent.png — emblem crop
- graphics/*.svg — blood donation themed decorative graphics
- frame_coordinates.json — suggested photo/name overlay coordinates
- previews/*.jpg — reference previews

Recommended web compositing:
1. Put the user's camera/captured image in a positioned layer.
2. Apply object-fit: cover inside the photo_window.
3. Apply horizontal mirroring to selfie content.
4. Put the selected PNG frame above the image.
5. For the name frame, render the normalized name + ' Ji' in the name area.
6. Export the final composition as a PNG/JPEG using the same frame aspect ratio.

The PNG frames retain their transparent center so the camera image can show through.
