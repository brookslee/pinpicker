( function() {

var pinPanelId = '__pinCollector__'
	, pickCls = 'pinpicker-tip'
	, pinWidth = 200
	, pinHeight = 200;

var Helper = {
	'_fnList' : [],

	'$' : function( id ) {
		return document.getElementById( id );	
	},

	'$$' : function( clsName, context ) {
		var el = context || document
		, elements = el.getElementsByTagName( '*' )
		, targetNodes = []
		, rclsName = new RegExp( '(?:^|\s+)' + clsName + '(?:\s+|$)', '' )
		, i, len, item;

		for ( i = 0, len = elements.length; i < len; i++ ) {
			item = elements[ i ];
			if ( item.className.match( rclsName ) ) {
				targetNodes.push( item );	
			}	
		}

		return targetNodes;
	},

	'addFunction' : function( fn, scope ) {
		return this._fnList.push( function() {
			return fn.apply( scope || window, arguments );	
		} ) - 1;
	},

	'callFunction' : function( index ) {
		var fn = this._fnList[ index ];	

		return fn && fn.apply( null, Array.prototype.slice.call( arguments, 1 ) );
	},

	'removeFunction' : function( index ) {
		if ( index ) {
			this._fnList[ index ] = null;	
		} else {
			this._fnList = [];	
		}
	},
	
	'toArray' : function( list ) {
		var result = [];
	
		for ( var i = 0, len = list.length; i < len; i++ ) {
			result[ i ] = list[ i ];	
		}

		return result;
	}
};

Helper.dom = {
	'getDocRect' : function() {
		var dd = document.documentElement
			, height = Math.max( dd.offsetHeight, dd.scrollHeight, dd.clientHeight )
			, width = Math.max( dd.offsetWidth, dd.scrollWidth, dd.clientWidth );

		return [ width, height ];
	},

	'getPosition' : function( el ) {
		var left = 0,
			top = 0;

		while ( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
			left += el.offsetLeft;
			top  += el.offsetTop;

			el = el.offsetParent;
		}

		return [ left, top ];
	},

	'closest' : function( el, tag ) {
		var node;

		while ( ( node = el.parentNode ) && node != document.documentElement  ) {
			if ( node.tagName.toLowerCase() == tag.toLowerCase() ) {
				return node;	
			}	
		}

		return null;
	},

	'contains' : function( a, b ) {
		return a.contains ?
			a != b && a.contains( b ) :
			!! ( a.compareDocumentPosition( b ) & 16 )
	},

	'getStyle' : function( el, css ) {
		var style = '';
		if ( el.currentStyle ) {
			style = el.currentStyle[ css ];	
		} else if ( window.getComputedStyle ) {
			style = document.defaultView.getComputedStyle( el, null ).getPropertyValue( css );	
		}	

		return style;
	}
};

Helper.event = {
	'getTarget' : function( evt ) {
		evt = evt || window.event;

		return evt.srcElement || evt.target;
	},

	'add' : function( el, evtType, handler ) {
		if ( window.addEventListener ) {
			el.addEventListener( evtType, handler, false );	
		} else if ( window.attachEvent ) {
			el.attachEvent( 'on' + evtType, handler );	
		} else {
			el[ 'on' + evtType ] = handler;
		}
	},

	'remove' : function( el, evtType, handler ) {
		if ( window.removeEventListener ) {
			el.removeEventListener( evtType, handler, false );
		} else if ( window.detachEvent ) {
			el.detachEvent( 'on' + evtType, handler );	
		} else {
			el[ 'on' + evtType ] = null;	
		}	
	},

	'preventDefault' : function( evt ) {
		evt = evt || window.event;

		try {
			evt.preventDefault();	
		} catch ( e ) {
			evt.returnValue = false;	
		}
	}
};


var PinPicker = {
	'helper' : Helper,

	'_cache' : {}, 

	'getImages' : function( doc ) {
		var imgs = [].concat( Helper.toArray( doc.getElementsByTagName( 'img' ) ) )
		, iframes = doc.getElementsByTagName( 'iframe' )
		, i, len, iframe, idoc;	

		for ( i = 0, len = iframes.length; i < len; i++ ) {
			iframe = iframes[ i ];	
			try {
				idoc = iframe.contentDocument || iframe.contentWindow.document;
				imgs = imgs.concat( this.getImages( idoc ) );
			} catch ( e ) {
				continue;	
			}
		}
	
		return imgs;
	},

	'run' : function() {
		var imgs = this.getImages( document )
		, imgData = []
		, cache = {} 
		, item;
		
		for ( var i = 0, len = imgs.length; i < len; i++ ) {
			item = imgs[ i ];
			
			// 忽略相同图片
			if ( cache[ item.src ] ) {
				continue;	
			}
			cache[ item.src ] = true;

			if ( ! this.isValidate( item ) ) {
				continue;	
			}
			
			imgData.push( {
				src : item.src,
				width : item.width,
				height : item.height,
				title : item.title || item.alt
			} );	
		}

		if ( Helper.$( pinPanelId ) ) {
			return;	
		}

		if ( imgData.length == 0 ) {
			alert( '对不起，没找到合适的图片！' );
			return;
		}

		this.render( imgData );
	},

	'init' : function() {
		if ( this.panel ) {
			return;	
		}

		var 
		panel = document.createElement( 'div' ), 
		me = this,
		// 取消事件处理器 
		close = Helper.addFunction( function() {
			panel.parentNode.removeChild( panel );
			me.panel = null;

			Helper.removeFunction();

			document.body.scrollTop = me._cache.bodyScrollTop;
			document.documentElement.scrollTop = me._cache.bodyScrollTop;

			Helper.event.remove( window, 'resize', me.resizeHandler );
		} );

		panel.innerHTML = [
			'<a class="pinner-controller" onclick="__PinPicker__.helper.callFunction('+ close +');return false;" href="#">取消</a>',
			'<div class="pinner-mask"></div>',
			'<div class="pinner-list"></div>'
		].join( '' );
		panel.id = pinPanelId;

		document.body.appendChild( panel );
		this.panel = panel;
		

		if ( !this.__bindGlobleEvent__ ) {
			this.__bindGlobleEvent__ = true;

			this.resizeHandler = function() {
				me._setRect();	
			};
			Helper.event.add( window, 'resize', this.resizeHandler );
			Helper.event.add( document, 'mouseover', function( evt ) {
				me.showPickTiper( evt );
			} );
			Helper.event.add( document, 'mouseout', function( evt ) {
				me.hidePickTiper( evt );
			} );
		}
	},

	'isValidate' : function( img, checkCls ) {
		var base = img.src && ( img.width > 100 || img.height > 100 );

		if ( checkCls ) {
			return base && img.className != checkCls;	
		}

		return base;
	},

	'showPickTiper' : function( evt ) {
		var target = Helper.event.getTarget( evt );			

		if ( target.tagName.toLowerCase() == 'img' && this.isValidate( target, '__pinpicker-img__' )  ) {
			this.setPickTiper.apply( this, [ target ].concat( Helper.dom.getPosition( target ) ) );
		}
	},

	'hidePickTiper' : function( evt ) {
		var target = Helper.event.getTarget( evt );
		if ( target.tagName.toLowerCase() != 'img' ) {
			return;	
		}
		
		var me = this;
		this._hideTimer = setTimeout( function() {
			me.pickTiper && ( me.pickTiper.style.display = 'none' );	
		}, 100 );
	},

	'setPickTiper' : function( img, left, top ) {
		if ( !this.pickTiper ) {
			var pickTiper = document.createElement( 'div' ),
				me = this;
			
			pickTiper.className = '__pinpicker-tiper__';
			pickTiper.innerHTML = '采集到xxx';
			document.body.appendChild( pickTiper );

			pickTiper.onmouseover = function() {
				me._hideTimer && clearTimeout( me._hideTimer );	
			};
			pickTiper.onmouseout = function() {
				this.style.display = 'none';	
			};
			pickTiper.onclick = function( evt ) {
				me.submit( this.relImage );
				Helper.event.preventDefault( evt );
			}

			this.pickTiper = pickTiper;
		}	

		img.parentNode.appendChild( this.pickTiper );
		this.pickTiper.relImage = img;

		var style = this.pickTiper.style;	
		style.display = 'block';	
		style.left = left - 10 + 'px';
		style.top  = top - 8 + 'px';
	},

	'_setRect' : function() {
		var rect = Helper.dom.getDocRect();
		this.panel.style.width = rect[0] + 'px';
		this.panel.style.height = rect[1] + 'px';

		var mask = Helper.$$( 'pinner-mask', this.panel )[0];
		mask.style.height = rect[ 1 ] + 'px';

		// 设置ul marginLeft, 减去40,确保留有边距
		var pinNumInRow = Math.floor( ( rect[0] - 40 ) / pinWidth ), 
			marginLeft = ( rect[0] - pinNumInRow * ( 2 + pinWidth ) ) / 2;
		
		this.panel.getElementsByTagName( 'ul' )[0].style.marginLeft = marginLeft + 'px';
	},

	'_calImageSize' : function( width, height ) {
		if ( width <= pinWidth && height <= pinHeight ) {
			return [ width, height ];	
		} 
		// 按宽度等比缩小	
		else if ( width/pinWidth >= height/pinHeight ) {
			return [ pinWidth, height * pinWidth / width ];	
		} else {
			return [ width * pinHeight / height, pinHeight ];	
		}
	},

	'_showTip' : function( evt, li ) {
		var el = Helper.event.getTarget( evt ),
			relTarget = evt.relatedTarget || evt.fromElement;

		var tipId = li.getAttribute( 'rel-tip' );
		if ( tipId ) {
			Helper.$( tipId ).style.display = '';
			return;	
		}
		
		var tip = document.createElement( 'p' );		
		tip.innerHTML = '采下来';
		tip.className = pickCls;

		var id = 'tip_' + (new Date).getTime();
		tip.id = id;
		li.setAttribute( 'rel-tip', id );
		li.appendChild( tip );
	},

	'_hideTip' : function( evt, li ) {
		var el = Helper.event.getTarget( evt ),
			relTarget = evt.relatedTarget || evt.toElement;

		var tip = Helper.$( li.getAttribute( 'rel-tip' ) );	
		tip && ( tip.style.display = 'none' );
	},

	'_pickPin' : function( evt ) {
		var target = Helper.event.getTarget( evt )
		, li, img;

		if ( target.tagName.toLowerCase() == 'li' || Helper.dom.closest( target, 'li' ) ) {
			li = target.parentNode;
			img = li.getElementsByTagName( 'img' )[ 0 ];

			this.submit( {
				'src' : img.src,
				'title' : img.title || img.alt
			} );
		}
	},
	
	// todo 
	'submit' : function( img ) {
		alert( 
			img.title + 
			'\n' + img.src +
			'\n' + window.location.href
		);	
	},

	'render' : function( data ) {
		this.init();
		
		var me = this;
		var fn1 = Helper.addFunction( function( evt, li ) {
			me._showTip( evt, li );
		} );

		var fn2 = Helper.addFunction( function( evt, li ) {
			me._hideTip( evt, li );
		} );

		var pick = Helper.addFunction( function( evt ) {
			me._pickPin( evt );	
		} );


		var html = [ '<ul onclick="__PinPicker__.helper.callFunction(' + pick + ', event );" class="pinpicker-list" >' ]
		, item, size, marginTop = 0;

		for ( var i = 0, len = data.length; i < len; i++ ) {
			item = data[ i ];

			size = this._calImageSize( item.width, item.height );
			marginTop = ( pinHeight - size[1] ) / 2;

			html.push( 
				'<li onmouseover="__PinPicker__.helper.callFunction(' + fn1 + ', event, this );" onmouseout="__PinPicker__.helper.callFunction(' + fn2 + ', event, this );" style="width:' + pinWidth + 'px;height:' + pinHeight + 'px;">',
					'<img class="__pinpicker-img__" style="margin-top:' + marginTop + 'px;" title="' + ( item.title || '' ) + '" src="' + item.src + '" width="' + size[0] + '" height="' + size[1] + '" />',
					'<p class="pinpicker-size">', item.width, ' X ', item.height, '</p>',
				'</li>' 
			);
		}
		html.push( '</ul>' );

		var list = Helper.$$( 'pinner-list', this.panel )[ 0 ];
     	list.innerHTML = html.join( '' );

		this._setRect();

		// todo 动画
		this._cache.bodyScrollTop = document.body.scrollTop;
		document.body.scrollTop = 0;
		document.documentElement.scrollTop = 0;
	}
};

window.__PinPicker__ = PinPicker;

PinPicker.run();

} )();

