// Reload the skin in the CSS variable
function reloadSkin() {
    var texture = document.getElementById('texture');

    document.documentElement.style.setProperty('--skin', 'url(' + texture.src + ')');
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    reloadSkin();

    generateOutfit();

    // Listen for changes in the color inputs
    document.querySelectorAll('.color').forEach(function(input) {
        console.log(input);
        input.addEventListener('input', function() {
            generateOutfit();
        });
    });
});

// Generate a image by layering the skin parts from the folder layers and save it to the texture element
function generateOutfit() {
    // Define the parts and other variables
    var skinParts = ['color_maillot', 'color_skin', 'color_hair', 'color_eyes', 'color_primary', 'color_secondary', 'top'];
    var texture = document.getElementById('texture');

    // Main canvas setup
    var mainCanvas = document.createElement('canvas');
    var ctx = mainCanvas.getContext('2d');

    // Set canvas size
    mainCanvas.width = 64;
    mainCanvas.height = 64;

    // Off-screen canvas for layering
    var offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = mainCanvas.width;
    offscreenCanvas.height = mainCanvas.height;
    var offscreenCtx = offscreenCanvas.getContext('2d');

    function drawLayeredImage(img, color, part) {
        // Step 1: Clear the off-screen canvas
        offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    
        // Step 2: Draw the grayscale image on the off-screen canvas
        offscreenCtx.globalCompositeOperation = 'source-over';
        offscreenCtx.drawImage(img, 0, 0);
    
        // Step 3: Apply color with multiply mode on the off-screen canvas
        offscreenCtx.globalCompositeOperation = 'multiply';

        if (part === 'color_maillot') {
            color = clampColor(color);
        }
        offscreenCtx.fillStyle = color;
        offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    
        // Step 4: Retain only the opaque parts of the original grayscale image
        offscreenCtx.globalCompositeOperation = 'destination-in';
        offscreenCtx.drawImage(img, 0, 0);
    
        // Step 5: Draw the result from the off-screen canvas onto the main canvas
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(offscreenCanvas, 0, 0);
    }

    // Load skin parts and draw only after all are loaded
    var imagesLoaded = 0;

    skinParts.forEach(function(part) {
        var img = new Image();
        img.src = 'layers/' + part + '.png';
        
        img.onload = function() {
            try {
                var color = document.getElementById(part).value;
            }
            catch (error) {
                var color = '#ffffff';
            }

            drawLayeredImage(img, color, part);
            
            // Increment count and check if all images are loaded
            imagesLoaded++;
            
            if (imagesLoaded === skinParts.length) {
                // All images have loaded, update the texture
                texture.src = mainCanvas.toDataURL();
                reloadSkin();
            }
        };
        
        img.onerror = function() {
            console.error("Failed to load image:", img.src);
        };
    });
}

// Clamp the color to a minimum value for better visibility
function clampColor(color) {
    // Convert hex color to RGB components
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);

    if (r < 5 && g < 5 && b < 5) {
        return '#050505';
    }

    // Convert back to hex format
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}