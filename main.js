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

        // when part is color_maillot, or color_skin, clamp the color to a minimum value for better visibility
        if (['color_maillot', 'color_skin'].includes(part)) {
            color = clampColor(color);
        } else if (part === 'color_hair') {
            color = clampColor(color, 12);
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

    function loadImage(part) {
        return new Promise((resolve, reject) => {
            var img = new Image();
            img.src = 'layers/' + part + '.png';
            img.onload = function() {
                // Fetch color and return the image, color, and part as an object
                let color;
                try {
                    color = document.getElementById(part).value;
                } catch (error) {
                    color = '#ffffff'; // Default color when no input is found
                }
                resolve({ img, color, part });
            };
            img.onerror = function() {
                console.error("Failed to load image:", img.src);
                reject(img.src); // Reject the promise if loading fails
            };
        });
    }

    // Load all images, then draw them in sequence
    Promise.all(skinParts.map(part => loadImage(part)))
        .then(images => {
            // All images are loaded, now draw them in the specified order
            images.forEach(({ img, color, part }) => {
                drawLayeredImage(img, color, part);
            });
            // Update the texture after all layers are drawn
            texture.src = mainCanvas.toDataURL();
            reloadSkin();
        })
        .catch(error => {
            console.error("An error occurred while loading images:", error);
        });
}

// Clamp the color to a minimum value for better visibility
function clampColor(color, min = 5) {
    // Convert hex color to RGB components
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);

    if (r < min && g < min && b < min) {
        return `#${min.toString(16).padStart(2, '0')}${min.toString(16).padStart(2, '0')}${min.toString(16).padStart(2, '0')}`;
    }

    // Convert back to hex format
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}