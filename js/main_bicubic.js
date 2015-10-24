(function(){

    var $ = window.jQuery;

    var Morpher = {

        o: {
            canvas: null,
            canvasWidth: 0,
            canvasHeight: 0,
            context: null,
            img: 'img/2.png',
            step: 15,
            flowSpeed: 3,
            flowChange: 0.2,
            aw: 0,
            ah: 0,
            flowMap: {
                x: null,
                y: null,
            },
            flowAnchors: {
                x: null,
                y: null,
                r: null,
                phi: null,
                dPhi: null,
            },
            framesTotal: 100,
            frames: null,
            currentFrame: 0,
            singlePass: false,
            buffering: true,
            timerId: null,
        },

        init: function() {

            this.o.canvas = document.getElementById('canvas');
            this.o.canvasWidth  = this.o.canvas.width;
            this.o.canvasHeight = this.o.canvas.height;
            this.o.context = this.o.canvas.getContext('2d');

            this.o.flowMap.x = new Array(this.o.canvasWidth * this.o.canvasHeight);
            this.o.flowMap.y = new Array(this.o.canvasWidth * this.o.canvasHeight);

            this.o.aw = Math.floor(this.o.canvasWidth / this.o.step);
            this.o.ah = Math.floor(this.o.canvasHeight / this.o.step);

            this.generateFlowAnchors();
            this.generateFlowMap();

            var imageObj = new Image();
            imageObj.src = this.o.img;
            
            var context = this.o.context;

            imageObj.onload = function() {
                context.drawImage(this, 0, 0);
            };
        },

        buffering: function() {

            var imageData = this.o.context.getImageData(0, 0, this.o.canvasWidth, this.o.canvasHeight);

            this.o.frames = new Array(this.o.framesTotal);
            this.o.frames[0] = new Array();

            for (var i = 0; i < imageData.data.length; i++) {
                this.o.frames[0][i] = imageData.data[i];
            }

            for (var i = 1; i < this.o.framesTotal; i++) {

                console.log('Generating frame #'+i+' of '+this.o.framesTotal);
                
                var data = this.o.frames[i-1];
                this.o.frames[i] = new Array(data.length);

                for (var y = 0; y < this.o.canvasHeight; y++) {
                    for (var x = 0; x < this.o.canvasWidth; x++) {

                        if ((x/this.o.step < 2) ||
                            (y/this.o.step < 2) ||
                            (x/this.o.step > this.o.aw - 2) ||
                            (y/this.o.step > this.o.ah - 2)) {

                            var r = data[(y * this.o.canvasWidth + x)*4 + 0];
                            var g = data[(y * this.o.canvasWidth + x)*4 + 1];
                            var b = data[(y * this.o.canvasWidth + x)*4 + 2];

                        } else {

                            var r = this.bicubicOptimized(data, x + this.o.flowMap.x[y * this.o.canvasWidth + x], y + this.o.flowMap.y[y * this.o.canvasWidth + x], 0, this.o.canvasWidth);
                            var g = this.bicubicOptimized(data, x + this.o.flowMap.x[y * this.o.canvasWidth + x], y + this.o.flowMap.y[y * this.o.canvasWidth + x], 1, this.o.canvasWidth);
                            var b = this.bicubicOptimized(data, x + this.o.flowMap.x[y * this.o.canvasWidth + x], y + this.o.flowMap.y[y * this.o.canvasWidth + x], 2, this.o.canvasWidth);

                            r = Math.ceil((r < 0) ? 0 : ((r > 255) ? 255 : r));
                            g = Math.ceil((g < 0) ? 0 : ((g > 255) ? 255 : g));
                            b = Math.ceil((b < 0) ? 0 : ((b > 255) ? 255 : b));

                        }

                        this.o.frames[i][(y * this.o.canvasWidth + x)*4 + 0] = r;
                        this.o.frames[i][(y * this.o.canvasWidth + x)*4 + 1] = g;
                        this.o.frames[i][(y * this.o.canvasWidth + x)*4 + 2] = b;
                        this.o.frames[i][(y * this.o.canvasWidth + x)*4 + 3] = 0xff;

                    }
                }

                this.updateFlowAnchors();

            }

            $('#frame_counter').html('Buffering completed');
        
        },

        play: function() {
            this.o.currentFrame = (this.o.currentFrame + 1) % this.o.framesTotal;
            var imageData = this.o.context.getImageData(0, 0, this.o.canvasWidth, this.o.canvasHeight);
            imageData.data.set(this.o.frames[this.o.currentFrame]);
            this.o.context.putImageData(imageData, 0, 0);
            $('#frame_counter').html(this.o.currentFrame);
        },

        draw: function() {

            var imageData = this.o.context.getImageData(0, 0, this.o.canvasWidth, this.o.canvasHeight);
            var buf = new ArrayBuffer(imageData.data.length);
            var buf8 = new Uint8ClampedArray(buf);
            var buf32 = new Uint32Array(buf);

            for (var y = 0; y < this.o.canvasHeight; y++) {
                for (var x = 0; x < this.o.canvasWidth; x++) {

                    if ((x/this.o.step < 2) ||
                        (y/this.o.step < 2) ||
                        (x/this.o.step > this.o.aw - 2) ||
                        (y/this.o.step > this.o.ah - 2)) {

                        var r = imageData.data[(y * this.o.canvasWidth + x)*4 + 0];
                        var g = imageData.data[(y * this.o.canvasWidth + x)*4 + 1];
                        var b = imageData.data[(y * this.o.canvasWidth + x)*4 + 2];

                    } else {

                        var r = this.bicubicOptimized(imageData.data, x + this.o.flowMap.x[y * this.o.canvasWidth + x], y + this.o.flowMap.y[y * this.o.canvasWidth + x], 0, this.o.canvasWidth);
                        var g = this.bicubicOptimized(imageData.data, x + this.o.flowMap.x[y * this.o.canvasWidth + x], y + this.o.flowMap.y[y * this.o.canvasWidth + x], 1, this.o.canvasWidth);
                        var b = this.bicubicOptimized(imageData.data, x + this.o.flowMap.x[y * this.o.canvasWidth + x], y + this.o.flowMap.y[y * this.o.canvasWidth + x], 2, this.o.canvasWidth);

                        r = Math.ceil((r < 0) ? 0 : ((r > 255) ? 255 : r));
                        g = Math.ceil((g < 0) ? 0 : ((g > 255) ? 255 : g));
                        b = Math.ceil((b < 0) ? 0 : ((b > 255) ? 255 : b));

                    }
                    
                    buf32[y * this.o.canvasWidth + x] = 0xff000000 | (b << 16) | (g << 8) | r;

                }
            }

            this.o.currentFrame++;

            imageData.data.set(buf8);
            this.o.context.putImageData(imageData, 0, 0);

            $('#frame_counter').html($('#frame_counter').html()*1+1);
        },

        bicubicOptimizedMono: function(pixels, x, y, width) {
            var a, b, c, d, v0, v1, v2, v3;
            var fx = x ^ 0;
            var fy = y ^ 0;
            var percentX = x - fx;
            var percentY = y - fy;
        
            var fx14 = fx;
            var fx04 = fx14 - 1;
            var fx24 = fx14 + 1;
            var fx34 = fx14 + 2;
            var w4 = width;
            var yw14o = fy * w4;
            var yw04o = yw14o - w4;
            var yw24o = yw14o + w4;
            var yw34o = yw14o + w4 + w4;
            
            a = pixels[yw04o + fx04];
            b = pixels[yw04o + fx14];
            c = pixels[yw04o + fx24];
            d = pixels[yw04o + fx34];
            v0 = 0.5 * (c - a + (2.0 * a - 5.0 * b + 4.0 * c - d + (3.0 * (b - c) + d - a) * percentX) * percentX) * percentX + b;
            
            a = pixels[yw14o + fx04];
            b = pixels[yw14o + fx14];
            c = pixels[yw14o + fx24];
            d = pixels[yw14o + fx34];
            v1 = 0.5 * (c - a + (2.0 * a - 5.0 * b + 4.0 * c - d + (3.0 * (b - c) + d - a) * percentX) * percentX) * percentX + b;
            
            a = pixels[yw24o + fx04];
            b = pixels[yw24o + fx14];
            c = pixels[yw24o + fx24];
            d = pixels[yw24o + fx34];
            v2 = 0.5 * (c - a + (2.0 * a - 5.0 * b + 4.0 * c - d + (3.0 * (b - c) + d - a) * percentX) * percentX) * percentX + b;
            
            a = pixels[yw34o + fx04];
            b = pixels[yw34o + fx14];
            c = pixels[yw34o + fx24];
            d = pixels[yw34o + fx34];
            v3 = 0.5 * (c - a + (2.0 * a - 5.0 * b + 4.0 * c - d + (3.0 * (b - c) + d - a) * percentX) * percentX) * percentX + b;
            
            a = v0;
            b = v1;
            c = v2;
            d = v3;
            a = 0.5 * (c - a + (2.0 * a - 5.0 * b + 4.0 * c - d + (3.0 * (b - c) + d - a) * percentY) * percentY) * percentY + b;
            return a;
        },

        bicubicOptimized: function(pixels, x, y, offset, width) {
            var a, b, c, d, v0, v1, v2, v3;
            var fx = x ^ 0;
            var fy = y ^ 0;
            var percentX = x - fx;
            var percentY = y - fy;
        
            var fx14 = fx * 4;
            var fx04 = fx14 - 4;
            var fx24 = fx14 + 4;
            var fx34 = fx14 + 8;
            var w4 = width * 4;
            var yw14o = fy * w4 + offset;
            var yw04o = yw14o - w4;
            var yw24o = yw14o + w4;
            var yw34o = yw14o + w4 + w4;
            
            a = pixels[yw04o + fx04];
            b = pixels[yw04o + fx14];
            c = pixels[yw04o + fx24];
            d = pixels[yw04o + fx34];
            v0 = 0.5 * (c - a + (2.0 * a - 5.0 * b + 4.0 * c - d + (3.0 * (b - c) + d - a) * percentX) * percentX) * percentX + b;
            v0 = v0 > 255 ? 255 : v0 < 0 ? 0 : v0;
            
            a = pixels[yw14o + fx04];
            b = pixels[yw14o + fx14];
            c = pixels[yw14o + fx24];
            d = pixels[yw14o + fx34];
            v1 = 0.5 * (c - a + (2.0 * a - 5.0 * b + 4.0 * c - d + (3.0 * (b - c) + d - a) * percentX) * percentX) * percentX + b;
            v1 = v1 > 255 ? 255 : v1 < 0 ? 0 : v1;
            
            a = pixels[yw24o + fx04];
            b = pixels[yw24o + fx14];
            c = pixels[yw24o + fx24];
            d = pixels[yw24o + fx34];
            v2 = 0.5 * (c - a + (2.0 * a - 5.0 * b + 4.0 * c - d + (3.0 * (b - c) + d - a) * percentX) * percentX) * percentX + b;
            v2 = v2 > 255 ? 255 : v2 < 0 ? 0 : v2;
            
            a = pixels[yw34o + fx04];
            b = pixels[yw34o + fx14];
            c = pixels[yw34o + fx24];
            d = pixels[yw34o + fx34];
            v3 = 0.5 * (c - a + (2.0 * a - 5.0 * b + 4.0 * c - d + (3.0 * (b - c) + d - a) * percentX) * percentX) * percentX + b;
            v3 = v3 > 255 ? 255 : v3 < 0 ? 0 : v3;
            
            a = v0;
            b = v1;
            c = v2;
            d = v3;
            a = 0.5 * (c - a + (2.0 * a - 5.0 * b + 4.0 * c - d + (3.0 * (b - c) + d - a) * percentY) * percentY) * percentY + b;
            return a > 255 ? 255 : a < 0 ? 0 : a ^ 0;
        },

        generateFlowAnchors: function() {

            this.o.flowAnchors.x = new Array(this.o.aw * this.o.ah);
            this.o.flowAnchors.y = new Array(this.o.aw * this.o.ah);
            this.o.flowAnchors.r = new Array(this.o.aw * this.o.ah);
            this.o.flowAnchors.phi = new Array(this.o.aw * this.o.ah);
            this.o.flowAnchors.dPhi = new Array(this.o.aw * this.o.ah);

            for (var y = 0; y <= this.o.ah; y++) {
                for (var x = 0; x <= this.o.aw; x++) {
                    if ((x*y == 0) || (x >= this.o.aw) || (y >= this.o.ah)) {
                        this.o.flowAnchors.x[y*this.o.aw + x] = 0;
                        this.o.flowAnchors.y[y*this.o.aw + x] = 0;
                        this.o.flowAnchors.r[y*this.o.aw + x] = 0;
                        this.o.flowAnchors.phi[y*this.o.aw + x] = 0;
                        this.o.flowAnchors.dPhi[y*this.o.aw + x] = 0;                        
                    } else {
                        this.o.flowAnchors.r[y*this.o.aw + x] = this.o.flowSpeed * Math.random();
                        this.o.flowAnchors.phi[y*this.o.aw + x] = Math.random() * 2 * Math.PI;
                        this.o.flowAnchors.dPhi[y*this.o.aw + x] = (Math.random() - 0.5) * this.o.flowChange;
                        this.o.flowAnchors.x[y*this.o.aw + x] = this.o.flowAnchors.r[y*this.o.aw + x] * Math.cos(this.o.flowAnchors.phi[y*this.o.aw + x]);
                        this.o.flowAnchors.y[y*this.o.aw + x] = this.o.flowAnchors.r[y*this.o.aw + x] * Math.sin(this.o.flowAnchors.phi[y*this.o.aw + x]);
                    }
                }
            }
        },

        updateFlowAnchors: function() {
            for (var y = 0; y <= this.o.ah; y++) {
                for (var x = 0; x <= this.o.aw; x++) {
                    this.o.flowAnchors.phi[y*this.o.aw + x] += this.o.flowAnchors.dPhi[y*this.o.aw + x];
                    this.o.flowAnchors.x[y*this.o.aw + x] = this.o.flowAnchors.r[y*this.o.aw + x] * Math.cos(this.o.flowAnchors.phi[y*this.o.aw + x]);
                    this.o.flowAnchors.y[y*this.o.aw + x] = this.o.flowAnchors.r[y*this.o.aw + x] * Math.sin(this.o.flowAnchors.phi[y*this.o.aw + x]);
                }
            }
            this.generateFlowMap();
        },

        generateFlowMap: function() {
            for (var y = 0; y < this.o.canvasHeight; y++) {
                for (var x = 0; x < this.o.canvasWidth; x++) {
                    if ((x*y == 0) ||
                        (x > this.o.aw * this.o.step) ||
                        (y > this.o.ah * this.o.step)) {
                        
                        this.o.flowMap.x[y*this.o.canvasWidth + x] = 0;
                        this.o.flowMap.y[y*this.o.canvasWidth + x] = 0;
                    
                    } else {

                        this.o.flowMap.x[y*this.o.canvasWidth + x] = this.bicubicOptimizedMono(this.o.flowAnchors.x, x / this.o.step, y / this.o.step, this.o.aw);
                        this.o.flowMap.y[y*this.o.canvasWidth + x] = this.bicubicOptimizedMono(this.o.flowAnchors.y, x / this.o.step, y / this.o.step, this.o.aw);

                    }
                }
            }
        },

        start: function() {
            var c = this;
            if (this.o.singlePass == true) {
                this.o.timerId = window.setTimeout(function() { c.draw() }, 10);
            } else {
                if (this.o.buffering) {
                    this.o.timerId = window.setInterval(function() { c.play() }, 10);    
                } else {
                    this.o.timerId = window.setInterval(function() { c.draw() }, 10);
                }
            }
        },

        stop: function() {
            if (this.o.singlePass == true) {
                window.clearTimeout(this.o.timerId);
            } else {
                window.clearInterval(this.o.timerId);
            }
        },

    };

    $(document).ready(function() {
        
        Morpher.init();

        $('#buffering_btn').click(function() {
            Morpher.buffering();
        });

        $('#start_btn').click(function() {
            Morpher.start();
        });

        $('#stop_btn').click(function() {
            Morpher.stop();
        });

    });

})(window)