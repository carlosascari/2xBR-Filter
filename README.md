2xBR-Filter
===========

A JavaScript implementation of the xBR filter
---------------------------------------------
Originally a filter for video game emulators, the xBR filter was created to scale 16 bit 
games, while at the same time 'smoothing' the video output from the emulator.

The original creator's alias is Hyllian, google search on 'xBR filter' will eventually lead 
you to a forum topic where he made the algorithm public:

http://board.byuu.org/viewtopic.php?f=10&t=2248

There he explains how the algorithm works as well as some optional implementations.


Todo's:
* Let user choose scaling factor: 2x,3x,5x, etc.
* Add level 2 interpolation as an optional argument
* Make it faster
* Fix filter's for..loop scope issue
* Research: Hyllian mentions a few optional implementations besides level 2 interpolation, but i can't find any 
documentation on the filter other than the byuu forum, where he only mentions them:
  * Font Enhancement
  * Using LVL2 Interpolation in regions plagued by shades of colors
  * Using linear equation of the Straight Line to interpolate in odd scale factors

Usage: 
```javascript
/**
 * You can call filter_2xBR with one parameter, the canvas context thats holding
 * the original image you want to filter.
 * 
 * The function returns a filtered ImageData object
 **/
  var xbr = filter_2xBR(
    ctx,	//context
  );


/**
 * Optionally, you can also filter part of the image in the canvas by
 * defining the source X,Y coordinates and the width and height of the part of 
 * the image you want to scale.
 **/
var xbr = filter_2xBR(
  ctx,  //context  
  0,    //Source X
  0,	//Source Y
  w,	//Source Width
  h 	//Source Height
);
```

Copy n' Pasta Example:
```html
<html>
  <head>
  	<title>xBR Filter 0.2.5</title>
		<script type="text/javascript" src="2xbr-0.2.5.js"></script>
	</head>
  
	<body>
		
    <canvas id="example"> </canvas>

    <script type="text/javascript">

      window.onload = function(){
        /*Load Original Image*/
      	var image = new Image();
      	image.src="image.png";
        
      	/*When image loads...*/
      	image.onload =  function(e){
          /*Get image's attributes*/
          var w = image.width;
          var h = image.height;
          var x = image.x;
          var y = image.y;

        /*Point to our Canvas*/
        var canvas = document.getElementById("example");  
        var ctx = canvas.getContext("2d");

        /*Resize Canvas*/
        canvas.width = w *2;    
        canvas.height = h *2;

        /*Draw Original image in Canvas*/
        ctx.drawImage(image, 0, 0);


        /*Apply 2xBR*/
        var xbr = filter_2xBR(
          ctx,  //context
          0,    //Source X
          0,    //Source Y
          w,    //Source Width
          h     //Source Height
        );

        /*Draw filtered image in Canvas*/
        ctx.putImageData(xbr, 0, 0);

        };
      }
    </script>
	</body>
</html>
```
