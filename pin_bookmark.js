( function() { 
	var host = 'http://www.mylab.com/pin_collector/',
		scriptId = '__pin_scripter__',
		cssId = '__pin_linker__';
	
	if ( window.__PinPicker__ ) {
		window.__PinPicker__.run();	

		return;
	}

	var link = document.createElement( 'link' );
	link.setAttribute( 'rel', 'stylesheet' );
	link.setAttribute( 'type', 'text/css' );
	link.setAttribute( 'media', 'all' );
	link.setAttribute( 'href', host + 'pin.css?t=' + ( new Date ).getTime() );
	link.setAttribute( 'id', cssId );
	document.body.appendChild( link );
	
	// 给css提供加载时间
	setTimeout( function() {
	var script = document.createElement( 'script' ); 
	script.id = scriptId;
	script.src = host + 'pin_collect.js?t=' + ( new Date ).getTime(); 
	script.charset = 'utf-8';
	document.body.appendChild( script ); 
	}, 10 );

} )()

