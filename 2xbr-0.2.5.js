/**
 * 2xBR Filter v0.2.5 
 *
 * Javascript implementation of the 2xBR filter.
 *
 * Originally a filter for video game emulators, the xBR filter was created to
 * scale 16 bit games, while at the same time 'smoothing' the video output from 
 * the emulator.
 *
 * The original creator's alias is Hyllian, google search on 'xBR filter' 
 * will eventually lead you to a forum topic where he made the algorithm public:
 * http://board.byuu.org/viewtopic.php?f=10&t=2248
 * 
 * @nutshell: Takes in a CanvasRenderingContext2D and returns an ImageData scaled
 * by 2 and filtered with the algorithm.   
 *
 * @note: After getting the algorithm working, I focused on refactoring the code and 
 * optimizing the speed by using a bunch of bithacks and making the code a bit
 * less readiable, to balance things out I added more comments to explain the messy 
 * parts. 
 *
 * @version: 0.2.5
 * @author: Carlos Ascari <carlos.ascari.x@gmail.com>
 * 
 **/




 /**
 * function filter_2xBR()
 *
 * You can specify only to scale part of an image by defining
 * sourceX,sourceY,sourceWidth,sourceHeight to point to the particular
 * spot you want. An ImageData is returned containing the filtered image. 
 *
 * @arguments:
 *   	CanvasRenderingContext2D context,
 *		Number sourceX,
 *		Number sourceY,
 *		Number sourceWidth,
 *		Number sourceHeight
 * @return:
 *		ImageData scaledImageData 
 **/
 function filter_2xBR(context,sourceX,sourceY,sourceWidth,sourceHeight){
	const VERSION		= '0.2.5';
	const REDMASK 		= 0x000000FF; // &MASK	>>0		
	const GREENMASK 	= 0x0000FF00; // &MASK	>>8 	
	const BLUEMASK 		= 0x00FF0000; // &MASK	>>16 	
	const ALPHAMASK 	= 0xFF000000; // &MASK	>>24 
	const SCALE			= 2;
	const THRESHHOLD_Y 	= 48;
	const THRESHHOLD_U 	= 7;
	const THRESHHOLD_V 	= 6;
 	const abs 			= Math.abs;

 	var scaledWidth = sourceWidth * SCALE;
 	var scaledHeight = sourceHeight * SCALE;

  	/**
 	 * Array matrix
 	 * This the filters 'view' it holds the current pixel being scaled
 	 * in the center (matrix[10]) and all of it's sourrounding pixels 
 	 **/
 	var matrix =  Array(21);
 	
 	/**
 	 * ImageData originalImageData
 	 * Original image's data, below this variable is the originalPixelView,
 	 * a 32bit ArrayView of the 8bit data inside the originalImageData's
 	 *  buffer (originalImageData.data.buffer)
 	 **/
	var originalImageData = context.getImageData(
			sourceX,
			sourceY,
			sourceWidth,
			sourceHeight
	);
	/*32bit View (4 bytes: Red,Greed,Blue,Alpha)*/
 	var originalPixelView = new Uint32Array(originalImageData.data.buffer);
	
	/**
 	 * ImageData scaledImageData
 	 * Scaled image's data, below this variable is the scaledPixelView,
 	 * a 32bit ArrayView of the 8bit data array inside the scaledImageData's 
 	 * buffer (scaledImageData.data.buffer)
 	 **/
 	var scaledImageData = context.createImageData(
			scaledWidth, 
			scaledHeight
	);	
 	/*32bit View (4 bytes: Red,Greed,Blue,Alpha)*/
 	var scaledPixelView = new Uint32Array(scaledImageData.data.buffer);




	/**
	 * function d(A,B) 
	 * Arguments:
	 *		Uint32 A,
	 *		Uint32 B
	 *	Calculates the weight of difference of pixels A and B, by transforming these 
	 *	pixels into their Y'UV parts. It then uses the threshold used by HQx filters: 
	 *	48*Y + 7*U + 6*V, to give it those smooth looking edges.
	 * @return: Number weightedDifference
	 **/
	function d(A,B){
		/*Extract each value from 32bit Uint & Find absolute difference in values*/
		var r = abs(   (A&REDMASK) - (B&REDMASK) );
		var g = abs(   ((A&GREENMASK)>>8) - ((B&GREENMASK)>>8) );
		var b = abs(   ((A&BLUEMASK)>>16) - ((B&BLUEMASK)>>16) );

		/*Convert RGB to Y'UV*/
		var y = r *  .299000 + g *  .587000 + b *  .114000;
	  	var u = r * -.168736 + g * -.331264 + b *  .500000;
		var v = r *  .500000 + g * -.418688 + b * -.081312;

		/*Add HQx filters threshold & return*/
		return (y * THRESHHOLD_Y) + (u* THRESHHOLD_U) + (v* THRESHHOLD_V);
	}


	/**
	 * function mix(A,B,a) 
	 * Arguments:
	 *		Uint32 	A,
	 *		Uint32 	B,
	 *		Float 	a 	// Between 0 and 1 
	 * Mixes a 32bit pixel A, with pixel B, with B's transperancy set to 'a'
	 * In other words, A is a solid color (bottom) and B is a transparent color (top)
	 * @return: Uint32 mixedPixel
	 **/
	function mix(A,B,a){
		/*Extract each value from 32bit Uint & blend colors together*/
		var r = a * (B&REDMASK) 		+ (1-a) * (A&REDMASK)+0;
		var g = a * ((B&GREENMASK)>>8) 	+ (1-a) * ((A&GREENMASK)>>8)+0;
		var b = a * ((B&BLUEMASK)>>16) 	+ (1-a) * ((A&BLUEMASK)>>16)+0;
		/*The bit hack '~~' is used to floor the values like Math.floor, but faster*/
		return ( (~~r) | ( (~~g) << 8) | ( (~~b) << 16) | (255 << 24) );
	};


	/** 
	 * function fillMatrix(x,y)
	 * Arguments:
	 *		Number 	x,
	 *		Number 	y,
	 * Fills the pixel Matrix, which consists of the current pixel, and other 20
	 * sourrounding pixels, you'll find a ascii representation of the matrix below.
	 **/
	function fillMatrix (x,y){
		/*Alias*/
 		var m = matrix;
 		var o = originalPixelView;
 		var w = sourceWidth;
		/** NOTE: Bounds Checker
		 * The cordinates are multiplied by a bit result: if x OR y is negative
		 * the cordinates are multiplied by -1, otherwise its multiplied by +1.
		 * 
		 * This keeps out-of-bound cordinates, out of bounds in the originalPixelView
		 * resulting in a undefined value stored.
		 * 
		 * I chose this 'odd' method of bound checking for 3 reasons:
		 *	1: I didn't realize, that when 'x' is negative and 'y' positive, the cordinate
		 *	math I implemented gives a wrong index because 'y' ends up being subtracted by
		 *	'x', and since each 'y' value is multiplied by the width of the image, a positive
		 *	index is the result. I didn't want to re-write this whole thing..
		 *	2: I didn't want to add individual if...else statement to check the boundries
		 *	and at that point, any other similer check seemed..dirty to me. 
		 *	3: Speed. Since this function is called constantly by a for loop, i didn't want 
		 *	a boundry check on every call, this little 'bug' only comes out when
		 *	'x' or 'y' is at the edge of the image.
		 *
		 * Take matrix[0] for example:
		 * abs( (w * (y-2) ) + (x-1) ) * ((x-1>>31) | 0x00000001)|((y-2>>31) | 0x00000001)
		 *
		 * This is the 'x,y coordinate to index' conversion:
		 * abs( (w * (y-2) ) + (x-1) )
		 *
		 * And it's multiplied by the bit boundry check:
		 * ((x-1>>31) | 0x00000001)  |  ((y-2>>31) | 0x00000001)
		 *
		 * It's not so bad :3
		 **/
		m[ 0] = o[ abs( (w * (y-2) ) + (x-1) ) * (  ((x-1>>31) | 0x00000001)|((y-2>>31) | 0x00000001)  ) ];
		m[ 1] = o[ abs( (w * (y-2) ) + ( x ) ) * (  ((  x>>31) | 0x00000001)|((y-2>>31) | 0x00000001)  ) ];
		m[ 2] = o[ abs( (w * (y-2) ) + (x+1) ) * (  ((x+1>>31) | 0x00000001)|((y-2>>31) | 0x00000001)  ) ];

		m[ 3] = o[ abs( (w * (y-1) ) + (x-2) ) * (  ((x-2>>31) | 0x00000001)|((y-1>>31) | 0x00000001)  ) ];
		m[ 4] = o[ abs( (w * (y-1) ) + (x-1) ) * (  ((x-1>>31) | 0x00000001)|((y-1>>31) | 0x00000001)  ) ];
		m[ 5] = o[ abs( (w * (y-1) ) + ( x ) ) * (  ((  x>>31) | 0x00000001)|((y-1>>31) | 0x00000001)  ) ];
		m[ 6] = o[ abs( (w * (y-1) ) + (x+1) ) * (  ((x+1>>31) | 0x00000001)|((y-1>>31) | 0x00000001)  ) ];
		m[ 7] = o[ abs( (w * (y-1) ) + (x+2) ) * (  ((x+2>>31) | 0x00000001)|((y-1>>31) | 0x00000001)  ) ];

		m[ 8] = o[ abs( (w * ( y ) ) + (x-2) ) * (  ((x-2>>31) | 0x00000001)|((  y>>31) | 0x00000001)  ) ];
		m[ 9] = o[ abs( (w * ( y ) ) + (x-1) ) * (  ((x-1>>31) | 0x00000001)|((  y>>31) | 0x00000001)  ) ];
		m[10] = o[ abs( (w * ( y ) ) + ( x ) ) * (  ((  x>>31) | 0x00000001)|((  y>>31) | 0x00000001)  ) ];
		m[11] = o[ abs( (w * ( y ) ) + (x+1) ) * (  ((x+1>>31) | 0x00000001)|((  y>>31) | 0x00000001)  ) ];
		m[12] = o[ abs( (w * ( y ) ) + (x+2) ) * (  ((x+2>>31) | 0x00000001)|((  y>>31) | 0x00000001)  ) ];

		m[13] = o[ abs( (w * (y+1) ) + (x-2) ) * (  ((x-2>>31) | 0x00000001)|((y+1>>31) | 0x00000001)  ) ];
		m[14] = o[ abs( (w * (y+1) ) + (x-1) ) * (  ((x-1>>31) | 0x00000001)|((y+1>>31) | 0x00000001)  ) ];
		m[15] = o[ abs( (w * (y+1) ) + ( x ) ) * (  ((  x>>31) | 0x00000001)|((y+1>>31) | 0x00000001)  ) ];
		m[16] = o[ abs( (w * (y+1) ) + (x+1) ) * (  ((x+1>>31) | 0x00000001)|((y+1>>31) | 0x00000001)  ) ];
		m[17] = o[ abs( (w * (y+1) ) + (x+2) ) * (  ((x+2>>31) | 0x00000001)|((y+1>>31) | 0x00000001)  ) ];

		m[18] = o[ abs( (w * (y+2) ) + (x-1) ) * (  ((x-1>>31) | 0x00000001)|((y+2>>31) | 0x00000001)  ) ];
		m[19] = o[ abs( (w * (y+2) ) + ( x ) ) * (  ((  x>>31) | 0x00000001)|((y+2>>31) | 0x00000001)  ) ];
		m[20] = o[ abs( (w * (y+2) ) + (x+1) ) * (  ((x+1>>31) | 0x00000001)|((y+2>>31) | 0x00000001)  ) ];
		/* Matrix: (10 is 0,0 i.e: current pixel)
				-2 | -1|  0| +1| +2 	(x)
		______________________________
		-2 |		[ 0][ 1][ 2]
		-1 |	[ 3][ 4][ 5][ 6][ 7]
		 0 |	[ 8][ 9][10][11][12]
		+1 |	[13][14][15][16][17]
		+2 |		[18][19][20]
		   |
		(y)|
		*/
 	}
 

	/** 
	 * function edgeDetectionRules(x,y)
	 * Arguments:
	 *		Number 	x,
	 *		Number 	y
	 * Applies the xBR filter rules.
	 * Previous version (0.2.2) rotates the matrix, and applies edgeDetectionRule()
	 * which works well, and keeps the code very clean as it applies code re-use
	 * BUT, calling the rotateMatrixClockwise() function slows down filtering by
	 * around 10ms, this new implementation doesn't rotate the matrix, instead every
	 * weight difference returned from d() is cached and then each edge's detection
	 * rule is applied seperately.
	 * It was a tradeoff between code readability and speed. 
	 **/
	function edgeDetectionRules(x,y){
		/*Fill the pixel Matrix*/
		fillMatrix(x,y);

		/*Alias*/
		var m = matrix;
		var w = scaledWidth;
		var s = scaledPixelView;

		/*Cached Pixel Weight Difference*/
		var d_10_9 	= d(m[10],m[9]); 	 
		var d_10_5 	= d(m[10],m[5]); 	
		var d_10_11 = d(m[10],m[11]); 	
		var d_10_15 = d(m[10],m[15]); 	
		var d_10_14 = d(m[10],m[14]); 	
		var d_10_6 	= d(m[10],m[6]); 	
		var d_4_8 	= d(m[4],m[8]); 	
		var d_4_1 	= d(m[4],m[1]); 	
		var d_9_5 	= d(m[9],m[5]); 	
		var d_9_15 	= d(m[9],m[15]); 	
		var d_9_3 	= d(m[9],m[3]); 	
		var d_5_11 	= d(m[5],m[11]); 	
		var d_5_0 	= d(m[5],m[0]); 	
		var d_10_4 	= d(m[10],m[4]); 	
		var d_10_16 = d(m[10],m[16]); 	
		var d_6_12 	= d(m[6],m[12]); 	
		var d_6_1	= d(m[6],m[1]); 	
		var d_11_15 = d(m[11],m[15]); 	
		var d_11_7 	= d(m[11],m[7]); 	
		var d_5_2 	= d(m[5],m[2]); 	
		var d_14_8 	= d(m[14],m[8]); 	
		var d_14_19 = d(m[14],m[19]); 	
		var d_15_18 = d(m[15],m[18]); 	
		var d_9_13 	= d(m[9],m[13]); 	
		var d_16_12 = d(m[16],m[12]); 	
		var d_16_19 = d(m[16],m[19]); 	
		var d_15_20 = d(m[15],m[20]); 	
		var d_15_17 = d(m[15],m[17]); 	

		/**
		 * Note: On reading edge detection rules
		 *
		 * Each edge rule is an if..else statement, everytime on else, the
		 * current pixel color pointed to by matrix[0] is used to color it's edge.
		 *
		 * Each if statement checks wether the sum of weight difference on the left is
		 * lesser than that of the right weight differece. If you need to understand
		 * why or how i chose each corner's coordinates in the matrix array, you need
		 * to read up on how xBR filter works:
		 * http://board.byuu.org/viewtopic.php?f=10&t=2248
		 * 
		 * Hard to explain without pictures..
		 */


		/**
		 * Top Left Edge Detection Rule
		 **/
		if ((d_10_14+d_10_6+d_4_8+d_4_1+(4*d_9_5)) < (d_9_15+d_9_3+d_5_11+d_5_0+(4*d_10_4))){
			// Figure what color to blend with current pixel (m[10]) 
			var new_color = (d_10_9 <= d_10_5)  ?  m[9]  :  m[5];
			/*mix colors*/
			var blendedColor = mix(new_color, m[10], .5);
			/*Insert blended color into scaledImageData*/
			s[ (((y*2) ) *w )  +  ( (x*2)) ] = blendedColor;
		} else{
			/*Insert current pixel color into scaledImageData*/
			s[ (((y*2) ) *w )  +  ( (x*2)) ] = m[10];
		}


		/**
		 * Top Right Edge Detection Rule
		 **/
		if ((d_10_16+d_10_4+d_6_12+d_6_1+(4*d_5_11)) < (d_11_15+d_11_7+d_9_5+d_5_2+(4*d_10_6))){
			// Figure what color to blend with current pixel (m[10]) 
			var new_color = (d_10_5 <= d_10_11)  ?  m[5]  :  m[11];
			/*mix colors*/
			var blendedColor = mix(new_color,m[10],.5);
			/*Insert blended color into scaledImageData*/
			s[ (((y*2) ) *w )  +  ( (x*2)+1) ] = blendedColor;
		} else{
			/*Insert current pixel color into scaledImageData*/
			s[ (((y*2) ) *w )  +  ( (x*2)+1) ] = m[10];
		}


		/**
		 * Bottom Left Edge Detection Rule
		 **/
		if ((d_10_4+d_10_16+d_14_8+d_14_19+(4*d_9_15)) < (d_9_5+d_9_13+d_11_15+d_15_18+(4*d_10_14))){
			// Figure what color to blend with current pixel (m[10]) 
			var new_color = (d_10_9 <= d_10_15)  ?  m[9]  :  m[15];
			/*mix colors*/
			var blendedColor = mix(new_color,m[10],.5);
			/*Insert blended color into scaledImageData*/
			s[ (((y*2)+1 ) *w )  +  ( (x*2)) ] = blendedColor;
		} else{
			/*Insert current pixel color into scaledImageData*/
			s[ (((y*2)+1 ) *w )  +  ( (x*2)) ] = m[10];
		}


		/**
		 * Bottom Right Edge Detection Rule
		 **/
		if ((d_10_6+d_10_14+d_16_12+d_16_19+(4*d_11_15)) < (d_9_15+d_15_20+d_15_17+d_5_11+(4*d_10_16))){
			// Figure what color to blend with current pixel (m[10]) 
			var new_color = (d_10_11 <= d_10_15)  ?  m[11]  :  m[15];
			/*mix colors*/
			var blendedColor = mix(new_color,m[10],.5);
			/*Insert blended color into scaledImageData*/
			s[ (((y*2)+1 ) *w )  +  ( (x*2)+1) ] = blendedColor;
		} else{
			/*Insert current pixel color into scaledImageData*/
			s[ (((y*2)+1 ) *w )  +  ( (x*2)+1) ] = m[10];
		}
	}



	/**
	 * Apply the Filter
	 * 
	 * This is where it all gets put together, inside an anonymous function
	 * because for w.e reason if I leave it out it loops for infinity... idk..
	 * I'm pretty sure it has to do with the fillMatrix() function as a few tests
	 * showed it messes with the x,y variables. Not sure why either, might have
	 * something to do with the bit manipulation? it's scope?
	 * If you could shed some light on the matter, I'd appreciate it!
	 **/
 	(function (){
		for (var x = 0, len = sourceWidth; x<len; ++x ){
		 	for (var y = 0, len2 = sourceHeight; y<len2; ++y ){
		 		/* xBR stands for 'scales By Rules' */
		 		edgeDetectionRules(x,y); 			
		 	}
		}
	})();

	/*Tadaaa!*/
 	return scaledImageData;
 }
