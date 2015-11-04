2xBR-Filter
===========
A JavaScript implementation of the xBR filter

[![Alt Description](http://i.imgur.com/K82K6T9.png)](http://i.imgur.com/K82K6T9.png)
*Click on the image to see it full size*. *Sprites taken from [spriters-resource.com](http://www.spriters-resource.com/resources/sheets/5/5229.png)* *FF4*

Open `example.html` to see it at work.

----------

Originally a shader for video game emulators, the xBR filter was created to scale 16 bit games, while at the same time 'smoothing' the video output from the emulator, so as to reduce jagged edges.

xBR stands for **scale By Rules**, which is the basis of how the algorithm works. Interpolation (guessing the next pixel) is done by taking into account 20 surrounding pixels for every pixel being scaled. By determining the difference in luminance, using 2 opposing points within the 21 pixel window, 4 new pixels are created for every pixel that is scaled, while taking into consideration the pixels surrounding the pixel being scaled. 

> When scaling a pixel, xBR creates 4 new pixels using the colors surrounding the pixel being scaled.

The original creator of the algorithm is known as Hyllian. He explained the algorithm in a post at [board.byuu.org](http://board.byuu.org/viewtopic.php?f=10&t=2248), an emulator forum in Dec 2011. Unfortunately the post is gone now, however you can still find it here at [archive.org](http://web.archive.org/web/20140729022435/http://board.byuu.org/viewtopic.php?f=10&t=2248).

----------
**UPDATE** 11/04/2015

Up until recently, I've noticed the Internet has gained interest over the xBR algorithm, as there is so little information on the web, this repository has become in a way, the go to place to understand how it works. 

The first commit was made on Dec 2012, however I didn't use github before then, so the code I ultimately made public was version v0.2.5. Also, previous revisions where lost. 

This is important, as v0.2.5 was a performant spaghetti mess of bithacks. I actually bursted out laughing when I looked at it, how in the hell would anyone understand it?

I've released v0.3.0, a much more developer friendly version. This new version is about a magnitude **slower** than its predecessor with equal quality. However, I believe the algorithm and its implementation is explained much more clearly, which will make implementing/porting the algorithm feasible. Enjoy.

## API

	ImageData xBR(context[, x, y, width, height])

An [ImageData](https://developer.mozilla.org/en-US/docs/Web/API/ImageData) is returned with the scaled pixel data result.

##### params
CanvasRenderingContext2D **context**
Canvas context where the original image has been loaded.

Number **x**
*Optional*. Used to only scale a portion of the original image.

Number **y**
*Optional*. Used to only scale a portion of the original image.

Number **width**
*Optional*. Used to only scale a portion of the original image.

Number **height**
*Optional*. Used to only scale a portion of the original image.

## Improvements

There have been improvements made to the algorithm since its inception.

Hyllian has made a repo with all the [xBR shaders](https://github.com/libretro/common-shaders/tree/master/xbr/shaders), so if you want the latest goodies, you'll find them there. 

**Note**
This repo was not based off the shaders, instead it was written from scratch using Hyllian's explanation of the algorithm in his forum post back in 2011. From a quick glance, I'll say this implementation most resembles that of **xbr level 2** *(xbr-lv2.cg)*
