// Reload the skin in the CSS variable
function reloadSkin() {
    var texture = document.getElementById('texture');

    document.documentElement.style.setProperty('--skin', 'url(' + texture.src + ')');
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    reloadSkin();

    generateOutfit();
});

// Generate a image by layering the skin parts from the folder layers and save it to the texture element
function generateOutfit() {
    // Define the parts and other variables
    var skinParts = ['color_secondary'];
    var texture = document.getElementById('texture');
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = 64;
    canvas.height = 64;

    // Load skin parts and draw only after all are loaded
    var imagesLoaded = 0;

    skinParts.forEach(function(part) {
        var img = new Image();
        img.src = 'layers/' + part + '.png';
        
        img.onload = function() {
            // Draw the image on the canvas when it loads
            ctx.drawImage(img, 0, 0);
            
            // Increment count and check if all images are loaded
            imagesLoaded++;
            if (imagesLoaded === skinParts.length) {
                // All images have loaded, update the texture
                texture.src = canvas.toDataURL();
                reloadSkin();
            }
        };
        
        img.onerror = function() {
            console.error("Failed to load image:", img.src);
        };
    });
}

