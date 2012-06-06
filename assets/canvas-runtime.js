/* <copyright>
This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
(c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
</copyright> */

// namespace for the Ninja Canvas Runtime
var NinjaCvsRt =  NinjaCvsRt || {};

///////////////////////////////////////////////////////////////////////
//Loading webGL/canvas data on window load
window.addEventListener('load', loadCanvasData, false);
//Load data function (on document loaded)
function loadCanvasData (e) {
	//Cleaning up events
	window.removeEventListener('load', loadCanvasData, false);
    //Getting tag with data, MUST contain attribute
    var xhr, tag = document.querySelectorAll(['script[data-ninja-canvas-lib]'])[0];
   	//Checking for data to be external file
   	if (tag.getAttribute('data-ninja-canvas-json') !== null) {
   		//Loading JSON data
   		xhr = new XMLHttpRequest();
        xhr.open("GET", tag.getAttribute('data-ninja-canvas-json'), false);
        xhr.send();
		//Checking for data
       	if (xhr.readyState === 4) {
       		//Calling method to initialize all webGL/canvas(es)
   			NinjaCvsRt.initWebGl(document.body, tag.getAttribute('data-ninja-canvas-libpath'), xhr.response);
       	} else {
       		//TODO: Add error for users
       	}
   	} else {//Data in document itself
   		//Calling method to initialize all webGL/canvas(es)
   		NinjaCvsRt.initWebGl(document.body, tag.getAttribute('data-ninja-canvas-libpath'), document.querySelectorAll(['script[data-ninja-canvas]'])[0].innerHTML);
   	}
}

///////////////////////////////////////////////////////////////////////
//Loading webGL/canvas data
NinjaCvsRt.initWebGl = function (rootElement, directory, data) {
	var cvsDataMngr, ninjaWebGlData = JSON.parse((data.replace('(', '')).replace(')', ''));
	if (ninjaWebGlData && ninjaWebGlData.data) {
		for (var n=0; ninjaWebGlData.data[n]; n++) {
			ninjaWebGlData.data[n] = unescape(ninjaWebGlData.data[n]);
		}
	}
	//Creating data manager
	cvsDataMngr = Object.create(NinjaCvsRt.CanvasDataManager, {});
	//Loading data to canvas(es)
	cvsDataMngr.loadGLData(rootElement, ninjaWebGlData.data, directory);
};

///////////////////////////////////////////////////////////////////////
// Class ShapeRuntime
//      Manages runtime shape display
///////////////////////////////////////////////////////////////////////
NinjaCvsRt.CanvasDataManager = Object.create(Object.prototype, {

	loadGLData: {
		value: function(root, valueArray, assetPath) {
			if (assetPath)
				this._assetPath = assetPath.slice();

			var value = valueArray;
			var nWorlds = value.length;
			for (var i=0;  i<nWorlds;  i++)
			{
				var importStr = value[i];

				// there should be some version information in
				// the form of 'v0.0;'  Pull that off.  (the trailing ';' should
				// be in the first 24 characters).
				var index = importStr.indexOf( ';' );
				if ((importStr[0] === 'v') && (index < 24))
				{
					// JSON format.  pull off the version info
					importStr = importStr.substr( index+1 );

					var jObj = JSON.parse( importStr );
					var id = jObj.id;
					if (id)
					{
						var canvas = this.findCanvasWithID( id, root );
						if (canvas)
						{
//                            new NinjaCvsRt.GLRuntime( canvas, jObj,  assetPath );
							var glRt = Object.create(NinjaCvsRt.GLRuntime, {});
							glRt.renderWorld(canvas, jObj, this._assetPath);
						}
						else
						{
							console.log( "***** COULD NOT FIND CANVAS WITH ID " + id + " *****" );
						}
					}
				}
			}
		}
	},

	findCanvasWithID: {
		value: function(id, elt) {
			var cid = elt.getAttribute( "data-RDGE-id" );
			if (cid == id)  return elt;

			if (elt.children)
			{
				var nKids = elt.children.length;
				for (var i=0;  i<nKids;  i++)
				{
					var child = elt.children[i];
					var foundElt = this.findCanvasWithID( id, child );
					if (foundElt)  return foundElt;
				}
			}
		}
	}
});

///////////////////////////////////////////////////////////////////////
// Class GLRuntime
//      Manages runtime fora WebGL canvas
///////////////////////////////////////////////////////////////////////
NinjaCvsRt.GLRuntime = Object.create(Object.prototype, {
	///////////////////////////////////////////////////////////////////////
	// Instance variables
	///////////////////////////////////////////////////////////////////////
	_canvas: { value: null, writable: true },
	_context : { value: null, writable: true },
	//this._importStr		= importStr;
	_jObj: { value: null, writable: true },

	_renderer: { value: null, writable: true },
	myScene: { value: null, writable: true },
	light: { value: null, writable: true },
	light2: { value: null, writable: true },
	_rootNode: { value: null, writable: true },

	_firstRender: { value: true, writable: true },
	_renderCount: { value: -1, writable: true },
	_initialized: { value: false, writable: true },

	_useWebGL: { value: false, writable: true },
	_assetPath: { value: undefined, writable: true },

	// view parameters
	_fov: { value: 45.0, writable: true },
	_zNear: { value: 0.1, writable: true },
	_zFar: { value: 100.0, writable: true },
	_viewDist: { value: 5.0, writable: true },

	elapsed: { value: 0, writable: true },

	_aspect: { value: 1, writable: true },

	//this._geomRoot = null;
	_rootChildren: { value: [], writable: true },

	// all "live" materials
	_materials: { value: [], writable: true },

	renderWorld: {
		value: function(canvas, jObj, assetPath) {
			this._materials = [];
			this._rootChildren = [];
			this._canvas = canvas;
			this._aspect = this._canvas.width/this._canvas.height;

			this._jObj= jObj;

			// provide the mapping for the asset directory
			if (assetPath) {
				this._assetPath = assetPath.slice();
				if (this._assetPath[this._assetPath.length - 1] != '/')
					this._assetPath += '/';
			}

			if(this._assetPath !== undefined) {
				RDGE.globals.engine.setAssetPath(this._assetPath);
			}

			// start RDGE or load Canvas 2D objects
			if (jObj.scenedata)  this._useWebGL = true;
			if (this._useWebGL)
			{
				var id = this._canvas.getAttribute( "data-RDGE-id" );
				this._canvas.rdgeid = id;
				RDGE.globals.engine.registerCanvas(this._canvas, this);
				RDGE.RDGEStart( this._canvas );
			}
			else
			{
				this.loadScene();
			}
		}
	},

	///////////////////////////////////////////////////////////////////////
	// accessors
	///////////////////////////////////////////////////////////////////////
	getZNear: { value: function() { return this._zNear; }},
	getZFar: { value: function() { return this._zFar; }},
	getFOV: { value: function() { return this._fov; }},
	getAspect: { value: function() { return this._aspect; }},
	getViewDistance: { value: function() { return this._viewDist; }},

	get2DContext: { value: function() { return this._context; }},

	getViewportWidth: { value: function() { return this._canvas.width; }},
	getViewportHeight: { value: function() { return this._canvas.height; }},

	loadScene: {
		value: function() {
			var jObj = this._jObj;
			if (!jObj.children)	// || (jObj.children.length != 1))
				throw new Error( "ill-formed JSON for runtime load: " + jObj );
			var nChildren = jObj.children.length;

			// parse the data
			var child;
			if (jObj.scenedata)
			{
				this._useWebGL = true;

				var rdgeStr = jObj.scenedata;
				this.myScene.importJSON( rdgeStr );
				for (var i=0;  i<nChildren;  i++)
				{
					child = jObj.children[i];
					this.importObjects( child );
				}
				//this.linkMaterials( this._geomRoot );
				this.linkMaterials( this._rootChildren );
				this.initMaterials();
				this.linkLights();
			}
			else
			{
				this._context = this._canvas.getContext( "2d" );
				for (var i=0;  i<nChildren;  i++)
				{
					child = jObj.children[i];
					this.importObjects( child );
				}
				this.render();
			}
		}
	},

	init: {
		value: function() {
			var ctx1 = RDGE.globals.engine.ctxMan.handleToObject(this._canvas.rdgeCtxHandle),
				ctx2 = RDGE.globals.engine.getContext();
			if (ctx1 != ctx2)  console.log( "***** different contexts *****" );
			this.renderer = ctx1.renderer;

			// create a camera, set its perspective, and then point it at the origin
			var cam = new RDGE.camera();
			this._camera = cam;
			cam.setPerspective(this.getFOV(), this.getAspect(), this.getZNear(), this.getZFar());
			cam.setLookAt([0, 0, this.getViewDistance()], [0, 0, 0], RDGE.vec3.up());

			// make this camera the active camera
			this.renderer.cameraManager().setActiveCamera(cam);

			// change clear color
			this.renderer.setClearColor([1.0, 1.0, 1.0, 0.0]);

			// create an empty scene graph
			this.myScene = new RDGE.SceneGraph();

			// load the scene graph data
			this.loadScene();

			// Add the scene to the engine - necessary if you want the engine to draw for you
			var name = "myScene" + this._canvas.getAttribute( "data-RDGE-id" );
			RDGE.globals.engine.AddScene(name, this.myScene);

			this._initialized = true;
		}
	},

	// main code for handling user interaction and updating the scene
	update: {
		value: function(dt) {
			if (this._initialized)
			{
				if (!dt)  dt = 0.2;

				dt = 0.01;	// use our own internal throttle
				this.elapsed += dt;

				// changed the global position uniform of light 0, another way to change behavior of a light
				RDGE.rdgeGlobalParameters.u_light0Pos.set( [5*Math.cos(this.elapsed), 5*Math.sin(this.elapsed), 20]);

				// orbit the light nodes around the boxes
				if (this.light )  this.light.setPosition([1.2*Math.cos(this.elapsed*2.0), 1.2*Math.sin(this.elapsed*2.0), 1.2*Math.cos(this.elapsed*2.0)]);
				if (this.light2)  this.light2.setPosition([-1.2*Math.cos(this.elapsed*2.0), 1.2*Math.sin(this.elapsed*2.0), -1.2*Math.cos(this.elapsed)]);

				this.updateMaterials();

				// now update all the nodes in the scene
				this.myScene.update(dt);
			}
		}
	},

	updateMaterials: {
		value: function() {
			var nMats = this._materials.length;
			for (var i=0;  i<nMats;  i++)
			{
				var mat = this._materials[i];
				mat.update();
			}
		}
	},

	// defining the draw function to control how the scene is rendered
	draw: {
		value: function() {
			if (this._initialized)
			{
				RDGE.globals.engine.setContext( this._canvas.rdgeid );

				var ctx = RDGE.globals.engine.getContext();
				var renderer = ctx.renderer;
				if (renderer.unloadedTextureCount <= 0)
				{
					renderer.disableCulling();
					renderer._clear();
					this.myScene.render();

					if (this._firstRender)
					{
						if (this._canvas.task)
						{
							this._firstRender = false;
							//this._canvas.task.stop();
						}
					}
				}
			}
		}
	},

	importObjects: {
		value: function(jObj, parent) {
			// read the next object
			var gObj = this.importObject( jObj, parent );

			// load the children
			if (jObj.children)
			{
				var nKids = jObj.children.length;
				for (var i=0;  i<nKids;  i++)
				{
					var child = jObj.children[i];
					this.importObjects( child, gObj );
				}
			}
		}
	},

	importObject: {
		value: function(jObj, parent) {
			var type = jObj.type;
			var obj;
			switch (type)
			{
				case 1:
					obj = Object.create(NinjaCvsRt.RuntimeRectangle, {_materials: { value:[], writable:true}});
					obj.importJSON( jObj );
					break;

				case 2:		// circle
					obj = Object.create(NinjaCvsRt.RuntimeOval, {_materials: { value:[], writable:true}});
					obj.importJSON( jObj );
					break;

				case 3:		// line
					obj = Object.create(NinjaCvsRt.RuntimeLine, {_materials: { value:[], writable:true}});
					obj.importJSON( jObj );
					break;

				default:
					throw new Error( "Attempting to load unrecognized object type: " + type );
					break;
			}

			if (obj)
				this.addObject( obj, parent );

			return obj;
		}
	},

	addObject: {
		value: function(obj, parent) {
			if (!obj)  return;
			obj.setWorld( this );

			if (parent == null)
			{
				//this._geomRoot = obj;
				this._rootChildren.push( obj );
			}
			else
				parent.addChild( obj );
		}
	},

	linkLights: {
		value: function() {
			var matNode = this.findMaterialNode( "lights", this.myScene.scene );
			if (matNode)
			{
				this.light = matNode.lightChannel[1];
				this.light2 = matNode.lightChannel[2];
			}
		}
	},

	linkMaterials: {
		value: function(objArray) {
			if (!objArray)  return;

			for (var i=0;  i<objArray.length;  i++)
			{
				var obj = objArray[i];

				// get the array of materials from the object
				var matArray = obj._materials;
				var nMats = matArray.length;
				for (var j=0;  j<nMats;  j++)
				{
					var mat = matArray[j];
					var nodeName = mat._materialNodeName;
					var matNode = this.findMaterialNode( nodeName, this.myScene.scene );
					if (matNode)
					{
						mat._materialNode = matNode;
						mat._shader = matNode.shaderProgram;
						this._materials.push( mat );
					}
				}

				this.linkMaterials( obj.children );
			}
		}
	},

	initMaterials: {
		value: function() {
			var nMats = this._materials.length;
			for (var i=0;  i<nMats;  i++)
			{
				var mat = this._materials[i];
				mat.init( this );
			}
		}
	},

	findMaterialNode: {
		value: function(nodeName, node) {
			if (node.transformNode)
				node = node.transformNode;

			if (node.materialNode)
			{
				if (nodeName === node.materialNode.name)  return node.materialNode;
			}

			if (node.children)
			{
				var nKids = node.children.length;
				for (var i=0;  i<nKids;  i++)
				{
					var child = node.children[i];
					var rtnNode = this.findMaterialNode( nodeName, child );
					if (rtnNode)  return rtnNode;
				}
			}
		}
	},

	render: {
		value: function(obj) {
			//if (!obj)  obj = this._geomRoot;
			//obj.render();

			var children;
			if (obj)
			{
				obj.render();
				children = obj.children;
			}
			else
				children = this._rootChildren;

			if (children)
			{
				var nKids = children.length;
				for (var i=0;  i<nKids;  i++)
				{
					var child = children[i];
					if (child)
						this.render( child );
				}
			}
		}
	}
});

///////////////////////////////////////////////////////////////////////
// Class RuntimeGeomObj
//      Super class for all geometry classes
///////////////////////////////////////////////////////////////////////
NinjaCvsRt.RuntimeGeomObj = Object.create(Object.prototype, {
	///////////////////////////////////////////////////////////////////////
	// Constants
	///////////////////////////////////////////////////////////////////////
	GEOM_TYPE_RECTANGLE: { value: 1, writable: false },
	GEOM_TYPE_CIRCLE: { value: 2, writable: false },
	GEOM_TYPE_LINE: { value: 3, writable: false },
	GEOM_TYPE_PATH: { value: 4, writable: false },
	GEOM_TYPE_CUBIC_BEZIER: { value: 5, writable: false },
	GEOM_TYPE_UNDEFINED: { value: -1, writable: false },

	///////////////////////////////////////////////////////////////////////
	// Instance variables
	///////////////////////////////////////////////////////////////////////
	_world: { value: null, writable: true },
	_children: { value: null, writable: true },

	// stroke and fill colors
	_strokeColor: { value: [0,0,0,0], writable: true },
	_fillColor: { value: [0,0,0,0], writable: true },

	// array of materials
	_materials : { value: null, writable: true },

	///////////////////////////////////////////////////////////////////////
	// Property accessors
	///////////////////////////////////////////////////////////////////////
	geomType: {
		value: function() {
			return this.GEOM_TYPE_UNDEFINED;
		}
	},

	setWorld: {
		value: function(w) {
			this._world = w;
		}
	},

	getWorld: {
		value: function() {
			return this._world;
		}
	},

	///////////////////////////////////////////////////////////////////////
	// Methods
	///////////////////////////////////////////////////////////////////////
	addChild: {
		value: function(child) {
			if (!this._children)  this._children = [];

			this._children.push( child );
		}
	},

	importJSON: {
		value: function() {
		}
	},

	importMaterials: {
		value: function(jObj) {
			if (!jObj || !jObj.materials)  return;

			var nMaterials = jObj.nMaterials;
			var matArray = jObj.materials;
			for (var i=0;  i<nMaterials;  i++)
			{
				var mat;
				var matObj = matArray[i].material;
				var matNodeName = matArray[i].materialNodeName;
				var shaderName = matObj.material;
				switch (shaderName)
				{
					case "flat":			mat = Object.create(NinjaCvsRt.RuntimeFlatMaterial, {});			break;
					case "radialGradient":  mat = Object.create(NinjaCvsRt.RuntimeRadialGradientMaterial, {});	break;
					case "linearGradient":  mat = Object.create(NinjaCvsRt.RuntimeLinearGradientMaterial, {});  break;
					case "bumpMetal":		mat = Object.create(NinjaCvsRt.RuntimeBumpMetalMaterial, {});		break;
					case "uber":			mat = Object.create(NinjaCvsRt.RuntimeUberMaterial, {});			break;
					case "plasma":			mat = Object.create(NinjaCvsRt.RuntimePlasmaMaterial, {});			break;

					case "deform":
					case "water":
					case "paris":
					case "raiders":
					case "tunnel":
					case "reliefTunnel":
					case "squareTunnel":
					case "twist":
					case "fly":
					case "julia":
					case "mandel":
					case "star":
					case "zinvert":
					case "keleidoscope":
					case "radialBlur":
					case "pulse":
						mat = Object.create(NinjaCvsRt.RuntimePulseMaterial, {});
						break;

					case "twistVert":
						mat = Object.create(NinjaCvsRt.RuntimeTwistVertMaterial, {});
						break;
					
					case "flag":
						mat = Object.create(NinjaCvsRt.RuntimeFlagMaterial, {});
						break;

					default:
						console.log( "material type: " + shaderName + " is not supported" );
						break;
				}

				if (mat)
				{
					mat.importJSON( matObj );
					mat._materialNodeName = matNodeName;
					this._materials.push( mat );
				}
			}
		}
	},


	////////////////////////////////////////////////////////////////////
	// TODO - vector functions should be moved to their own class
	vecAdd: {
		value: function(dimen, a, b) {
			var rtnVec;
			if ((a.length < dimen) || (b.length < dimen))
			{
				throw new Error( "dimension error in vecAdd" );
			}

			rtnVec = [];
			for (var i=0;  i<dimen;  i++)
				rtnVec[i] = a[i] + b[i];

			return rtnVec;
		}
	},

	vecSubtract: {
		value: function(dimen, a, b) {
			var rtnVec;
			if ((a.length < dimen) || (b.length < dimen))
			{
				throw new Error( "dimension error in vecSubtract" );
			}

			rtnVec = [];
			for (var i=0;  i<dimen;  i++)
				rtnVec[i] = a[i] - b[i];

			return rtnVec;
		}
	},

	vecDot: {
		value: function(dimen, v0, v1) {
			if ((v0.length < dimen) || (v1.length < dimen))
			{
				throw new Error( "dimension error in vecDot" );
			}

			var sum = 0.0;
			for (var i=0;  i<dimen;  i++)
				sum += v0[i] * v1[i];

			return sum;
		}
	},

	vecMag: {
			value: function(dimen, vec) {
			var sum = 0.0;
			for (var i=0;  i<dimen;  i++)
				sum += vec[i]*vec[i];
			return Math.sqrt( sum );
		}
	},

	vecScale: {
		value: function(dimen, vec, scale) {
			for (var i=0;  i<dimen;  i++)
				vec[i] *= scale;

			return vec;
		}
	},

	vecNormalize: {
		value: function(dimen, vec, len) {
			var rtnVec;
			if (!len)  len = 1.0;

			var sum = 0.0, i = 0;
			for (i = 0;  i<dimen;  i++)
				sum += vec[i]*vec[i];
			sum = Math.sqrt( sum );

			if (Math.abs(sum) >= 0.001)
			{
				var scale = len/sum;
				rtnVec = [];
				for (i = 0;  i<dimen;  i++)
					rtnVec[i] = vec[i]*scale;
			}

			return rtnVec;
		}
	},

	transformPoint: {
		value: function(srcPt, mat) {
			var pt = srcPt.slice(0);
			var	x = this.vecDot(3,  pt, [mat[0], mat[4], mat[ 8]] ) + mat[12],
				y = this.vecDot(3,  pt, [mat[1], mat[5], mat[ 9]] ) + mat[13],
				z = this.vecDot(3,  pt, [mat[2], mat[6], mat[10]] ) + mat[14];

			return [x, y, z];
		}
	},

	MatrixIdentity: {
		value: function(dimen) {
			var mat = [];

			for (var i = 0; i<dimen*dimen; i++)  {
				mat.push(0);
			}

			var index = 0;
			for (var j = 0; j<dimen; j++) {
				mat[index] = 1.0;
				index += dimen + 1;
			}

			return mat;
		}
	},

	MatrixRotationZ: {
		value: function(angle) {
			var mat = this.MatrixIdentity(4);
			//glmat4.rotateZ(mat, angle);
			var sn = Math.sin(angle),
				cs = Math.cos(angle);
			mat[0] = cs;	mat[4] = -sn;
			mat[1] = sn;	mat[5] =  cs;

			return mat;
		}
	}
});


///////////////////////////////////////////////////////////////////////
// Class RuntimeRectangle
///////////////////////////////////////////////////////////////////////
NinjaCvsRt.RuntimeRectangle = Object.create(NinjaCvsRt.RuntimeGeomObj, {

	importJSON: {
		value: function(jObj) {
			this._xOffset			= jObj.xoff;
			this._yOffset			= jObj.yoff;
			this._width				= jObj.width;
			this._height			= jObj.height;
			this._strokeWidth		= jObj.strokeWidth;
			this._strokeColor		= jObj.strokeColor;
			this._fillColor			= jObj.fillColor;
			this._tlRadius			= jObj.tlRadius;
			this._trRadius			= jObj.trRadius;
			this._blRadius			= jObj.blRadius;
			this._brRadius			= jObj.brRadius;
			this._innerRadius		= jObj.innerRadius;
			this._strokeStyle		= jObj.strokeStyle;
			var strokeMaterialName	= jObj.strokeMat;
			var fillMaterialName	= jObj.fillMat;
			this.importMaterials( jObj.materials );
		}
	},

	renderPath: {
		value: function(inset, ctx) {
			// various declarations
			var pt,  rad,  ctr,  startPt, bPts;
			var width  = Math.round(this._width),
				height = Math.round(this._height),
				hw = 0.5*width,
				hh = 0.5*height;

			pt = [inset, inset];	// top left corner

			var tlRad = this._tlRadius; //top-left radius
			var trRad = this._trRadius;
			var blRad = this._blRadius;
			var brRad = this._brRadius;
			// limit the radii to half the rectangle dimension
			var minDimen = hw < hh ? hw : hh;
			if (tlRad > minDimen)  tlRad = minDimen;
			if (blRad > minDimen)  blRad = minDimen;
			if (brRad > minDimen)  brRad = minDimen;
			if (trRad > minDimen)  trRad = minDimen;

			var world = this.getWorld();
			var vpw = world.getViewportWidth(), vph = world.getViewportHeight();
			var cop = [0.5*vpw, 0.5*vph, 0.0];
			var xCtr = cop[0] + this._xOffset,					yCtr = cop[1] - this._yOffset;
			var xLeft = xCtr - 0.5*this._width,					yTop = yCtr - 0.5*this._height;
			var xDist = cop[0] - xLeft,							yDist = cop[1] - yTop;
			var xOff = 0.5*vpw - xDist,							yOff  = 0.5*vph - yDist;

			if ((tlRad <= 0) && (blRad <= 0) && (brRad <= 0) && (trRad <= 0))
			{
				ctx.rect(pt[0]+xOff, pt[1]+yOff, width - 2*inset, height - 2*inset);
			}
			else
			{
				// get the top left point
				rad = tlRad - inset;
				if (rad < 0)  rad = 0;
				pt[1] += rad;
				if (Math.abs(rad) < 0.001)  pt[1] = inset;
				ctx.moveTo( pt[0]+xOff,  pt[1]+yOff );

				// get the bottom left point
				pt = [inset, height - inset];
				rad = blRad - inset;
				if (rad < 0)  rad = 0;
				pt[1] -= rad;
				ctx.lineTo( pt[0]+xOff,  pt[1]+yOff );

				// get the bottom left curve
				if (rad > 0.001)
					ctx.quadraticCurveTo( inset+xOff, height-inset+yOff,  inset+rad+xOff, height-inset+yOff );

				// do the bottom of the rectangle
				pt = [width - inset,  height - inset];
				rad = brRad - inset;
				if (rad < 0)  rad = 0;
				pt[0] -= rad;
				ctx.lineTo( pt[0]+xOff, pt[1]+yOff );

				// get the bottom right arc
				if (rad > 0.001)
					ctx.quadraticCurveTo( width-inset+xOff, height-inset+yOff,  width-inset+xOff, height-inset-rad+yOff );

				// get the right of the rectangle
				pt = [width - inset,  inset];
				rad = trRad - inset;
				if (rad < 0)  rad = 0;
				pt[1] += rad;
				ctx.lineTo( pt[0]+xOff, pt[1]+yOff );

				// do the top right corner
				if (rad > 0.001)
					ctx.quadraticCurveTo( width-inset+xOff, inset+yOff,  width-inset-rad+xOff, inset+yOff );

				// do the top of the rectangle
				pt = [inset, inset];
				rad = tlRad - inset;
				if (rad < 0)  rad = 0;
				pt[0] += rad;
				ctx.lineTo( pt[0]+xOff, pt[1]+yOff);

				// do the top left corner
				if (rad > 0.001)
					ctx.quadraticCurveTo( inset+xOff, inset+yOff, inset+xOff, inset+rad+yOff );
				else
					ctx.lineTo( inset+xOff, 2*inset+yOff );
			}
		}
	},

	render: {
		value: function() {
			// get the world
			var world = this.getWorld();
			if (!world)  throw( "null world in rectangle render" );

			 // get the context
			var ctx = world.get2DContext();
			if (!ctx)  return;

			// get some dimensions
			var lw = this._strokeWidth;
			var	w = world.getViewportWidth(),
				h = world.getViewportHeight();

			var c,
				inset,
				gradient,
				colors,
				len,
				n,
				position,
				cs;
			// render the fill
			ctx.beginPath();
			if (this._fillColor) {
				inset = Math.ceil( lw ) - 0.5;

				if(this._fillColor.gradientMode) {
					if(this._fillColor.gradientMode === "radial") {
						var ww = w - 2*lw,  hh = h - 2*lw;
						gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(ww, hh)/2);
					} else {
						gradient = ctx.createLinearGradient(inset, h/2, w-inset, h/2);
					}
					colors = this._fillColor.color;

					len = colors.length;

					for(n=0; n<len; n++) {
						position = colors[n].position/100;
						cs = colors[n].value;
						gradient.addColorStop(position, "rgba(" + cs.r + "," + cs.g + "," + cs.b + "," + cs.a + ")");
					}

					ctx.fillStyle = gradient;

				} else {
					c = "rgba(" + 255*this._fillColor[0] + "," + 255*this._fillColor[1] + "," + 255*this._fillColor[2] + "," + this._fillColor[3] + ")";
					ctx.fillStyle = c;
				}

				ctx.lineWidth	= lw;
				this.renderPath( inset, ctx );
				ctx.fill();
				ctx.closePath();
			}

			// render the stroke
			ctx.beginPath();
			if (this._strokeColor) {
				inset = Math.ceil( 0.5*lw ) - 0.5;

				if(this._strokeColor.gradientMode) {
					if(this._strokeColor.gradientMode === "radial")
						gradient = ctx.createRadialGradient(w/2, h/2, 0,  w/2, h/2, Math.max(h, w)/2);
					else
						gradient = ctx.createLinearGradient(0, h/2, w, h/2);
					colors = this._strokeColor.color;

					len = colors.length;

					for(n=0; n<len; n++) {
						position = colors[n].position/100;
						cs = colors[n].value;
						gradient.addColorStop(position, "rgba(" + cs.r + "," + cs.g + "," + cs.b + "," + cs.a + ")");
					}

					ctx.strokeStyle = gradient;

				} else {
					c = "rgba(" + 255*this._strokeColor[0] + "," + 255*this._strokeColor[1] + "," + 255*this._strokeColor[2] + "," + this._strokeColor[3] + ")";
					ctx.strokeStyle = c;
				}

				ctx.lineWidth	= lw;
				this.renderPath( inset, ctx );
				ctx.stroke();
				ctx.closePath();
			}
		}
	}
});

///////////////////////////////////////////////////////////////////////
// Class RuntimeLine
///////////////////////////////////////////////////////////////////////
NinjaCvsRt.RuntimeLine = Object.create(NinjaCvsRt.RuntimeGeomObj, {

	importJSON: {
		value: function(jObj) {
			this._xOffset			= jObj.xoff;
			this._yOffset			= jObj.yoff;
			this._width				= jObj.width;
			this._height			= jObj.height;
			this._xAdj			    = jObj.xAdj;
			this._yAdj			    = jObj.yAdj;
			this._strokeWidth		= jObj.strokeWidth;
			this._slope 		    = jObj.slope;
			this._strokeStyle		= jObj.strokeStyle;
			this._strokeColor		= jObj.strokeColor;
			var strokeMaterialName	= jObj.strokeMat;
			this.importMaterials( jObj.materials );
		}
	},

	render: {
		value: function() {
			// get the world
			var world = this.getWorld();
			if (!world)  throw( "null world in buildBuffers" );

			 // get the context
			var ctx = world.get2DContext();
			if (!ctx)  return;

			// set up the stroke style
			var lineWidth = this._strokeWidth,
				w = this._width,
				h = this._height;

			var c,
				gradient,
				colors,
				len,
				n,
				position,
				cs;

			ctx.beginPath();
			ctx.lineWidth	= lineWidth;
			if (this._strokeColor) {
				if(this._strokeColor.gradientMode) {
					if(this._strokeColor.gradientMode === "radial") {
						gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w/2, h/2));
					} else {
						gradient = ctx.createLinearGradient(0, h/2, w, h/2);
					}
					colors = this._strokeColor.color;

					len = colors.length;

					for(n=0; n<len; n++) {
						position = colors[n].position/100;
						cs = colors[n].value;
						gradient.addColorStop(position, "rgba(" + cs.r + "," + cs.g + "," + cs.b + "," + cs.a + ")");
					}

					ctx.strokeStyle = gradient;

				} else {
					c = "rgba(" + 255*this._strokeColor[0] + "," + 255*this._strokeColor[1] + "," + 255*this._strokeColor[2] + "," + this._strokeColor[3] + ")";
					ctx.strokeStyle = c;
				}

				// get the points
				var p0,  p1;
				if(this._slope === "vertical") {
					p0 = [0.5*w, 0];
					p1 = [0.5*w, h];
				} else if(this._slope === "horizontal") {
					p0 = [0, 0.5*h];
					p1 = [w, 0.5*h];
				} else if(this._slope > 0) {
					p0 = [this._xAdj, this._yAdj];
					p1 = [w - this._xAdj,  h - this._yAdj];
				} else {
					p0 = [this._xAdj, h - this._yAdj];
					p1 = [w - this._xAdj,  this._yAdj];
				}

				// draw the line
				ctx.moveTo( p0[0],  p0[1] );
				ctx.lineTo( p1[0],  p1[1] );
				ctx.stroke();
			}
		}
	}
});

///////////////////////////////////////////////////////////////////////
// Class RuntimeOval
///////////////////////////////////////////////////////////////////////
NinjaCvsRt.RuntimeOval = Object.create(NinjaCvsRt.RuntimeGeomObj, {

	importJSON: {
		value: function(jObj) {
			this._xOffset			= jObj.xoff;
			this._yOffset			= jObj.yoff;
			this._width				= jObj.width;
			this._height			= jObj.height;
			this._strokeWidth		= jObj.strokeWidth;
			this._strokeColor		= jObj.strokeColor;
			this._fillColor			= jObj.fillColor;
			this._innerRadius		= jObj.innerRadius;
			this._strokeStyle		= jObj.strokeStyle;
			var strokeMaterialName	= jObj.strokeMat;
			var fillMaterialName	= jObj.fillMat;
			this.importMaterials( jObj.materials );
		}
	},

	render: {
		value: function() {
			// get the world
			var world = this.getWorld();
			if (!world)  throw( "null world in buildBuffers" );

			 // get the context
			var ctx = world.get2DContext();
			if (!ctx)  return;

			// declare some variables
			var p0, p1;
			var x0, y0, x1, y1;

			// create the matrix
			var lineWidth = this._strokeWidth;
			var innerRad  = this._innerRadius;
			var xScale = 0.5*this._width - lineWidth,
				yScale = 0.5*this._height - lineWidth;

			// translate
			var xCtr = 0.5*world.getViewportWidth() + this._xOffset,
				yCtr = 0.5*world.getViewportHeight() + this._yOffset;
			var mat = this.MatrixIdentity( 4 );
			mat[0] = xScale;					mat[12] = xCtr;
							mat[5] = yScale;	mat[13] = yCtr;
			/*
			var mat = [
								[ xScale,     0.0,  0.0,  xCtr],
								[    0.0,  yScale,  0.0,  yCtr],
								[    0.0,     0.0,  1.0,   0.0],
								[    0.0,     0.0,  0.0,   1.0]
							];
			*/

			// get a bezier representation of the circle
			var bezPts = this.circularArcToBezier( [0,0,0],  [1,0,0], 2.0*Math.PI );
			if (bezPts)
			{
				var n = bezPts.length;
				var gradient,
					colors,
					len,
					j,
					position,
					cs,
					c;

				// set up the fill style
				ctx.beginPath();
				ctx.lineWidth = 0;
				if (this._fillColor) {
					if(this._fillColor.gradientMode) {
						if(this._fillColor.gradientMode === "radial") {
							gradient = ctx.createRadialGradient(xCtr, yCtr, 0,
																xCtr, yCtr, Math.max(this._width, this._height)/2 - lineWidth);
						} else {
							gradient = ctx.createLinearGradient(lineWidth, this._height/2, this._width-lineWidth, this._height/2);
						}
						colors = this._fillColor.color;

						len = colors.length;

						for(j=0; j<len; j++) {
							position = colors[j].position/100;
							cs = colors[j].value;
							gradient.addColorStop(position, "rgba(" + cs.r + "," + cs.g + "," + cs.b + "," + cs.a + ")");
						}

						ctx.fillStyle = gradient;

					} else {
						c = "rgba(" + 255*this._fillColor[0] + "," + 255*this._fillColor[1] + "," + 255*this._fillColor[2] + "," + this._fillColor[3] + ")";
						ctx.fillStyle = c;
					}
					// draw the fill
		//				ctx.beginPath();
					var p = this.transformPoint( bezPts[0],   mat );
					ctx.moveTo( p[0],  p[1] );
					var index = 1;
					while (index < n) {
						p0   = this.transformPoint( bezPts[index],  mat );
						p1 = this.transformPoint( bezPts[index+1],  mat );

						x0 = p0[0];  y0 = p0[1];
						x1 = p1[0];  y1 = p1[1];
						ctx.quadraticCurveTo( x0,  y0,  x1, y1 );
						index += 2;
					}

					if (innerRad > 0.001) {
						xScale = 0.5*innerRad*this._width;
						yScale = 0.5*innerRad*this._height;
						mat[0] = xScale;
						mat[5] = yScale;

						// get the bezier points
						var bezPtsInside = this.circularArcToBezier( [0,0,0], [1,0,0], -2.0*Math.PI );
						if (bezPtsInside) {
							n = bezPtsInside.length;
							p = this.transformPoint( bezPtsInside[0],   mat );
							ctx.moveTo( p[0],  p[1] );
							index = 1;
							while (index < n) {
								p0 = this.transformPoint( bezPtsInside[index],    mat );
								p1 = this.transformPoint( bezPtsInside[index+1],  mat );

								x0 = p0[0];
								y0 = p0[1];
								x1 = p1[0];
								y1 = p1[1];
								ctx.quadraticCurveTo( x0,  y0,  x1, y1 );
								index += 2;
							}
						}
					}

					// fill the path
					ctx.fill();
				}

				// calculate the stroke matrix
				xScale = 0.5*this._width  - 0.5*lineWidth;
				yScale = 0.5*this._height - 0.5*lineWidth;
				mat[0] = xScale;
				mat[5] = yScale;

				// set up the stroke style
				ctx.beginPath();
				ctx.lineWidth	= lineWidth;
				if (this._strokeColor) {
					if(this._strokeColor.gradientMode) {
						if(this._strokeColor.gradientMode === "radial") {
							gradient = ctx.createRadialGradient(xCtr, yCtr, 0,
																xCtr, yCtr, 0.5*Math.max(this._height, this._width));
						} else {
							gradient = ctx.createLinearGradient(0, this._height/2, this._width, this._height/2);
						}
						colors = this._strokeColor.color;

						len = colors.length;

						for(j=0; j<len; j++) {
							position = colors[j].position/100;
							cs = colors[j].value;
							gradient.addColorStop(position, "rgba(" + cs.r + "," + cs.g + "," + cs.b + "," + cs.a + ")");
						}

						ctx.strokeStyle = gradient;

					} else {
						c = "rgba(" + 255*this._strokeColor[0] + "," + 255*this._strokeColor[1] + "," + 255*this._strokeColor[2] + "," + this._strokeColor[3] + ")";
						ctx.strokeStyle = c;
					}
					// draw the stroke
					p = this.transformPoint( bezPts[0],   mat );
					ctx.moveTo( p[0],  p[1] );
					index = 1;
					while (index < n) {
						p0   = this.transformPoint( bezPts[index],  mat );
						p1 = this.transformPoint( bezPts[index+1],  mat );

						x0 = p0[0];
						y0 = p0[1];
						x1 = p1[0];
						y1 = p1[1];
						ctx.quadraticCurveTo( x0,  y0,  x1, y1 );
						index += 2;
					}

					if (innerRad > 0.001) {
						// calculate the stroke matrix
						xScale = 0.5*innerRad*this._width  - 0.5*lineWidth;
						yScale = 0.5*innerRad*this._height - 0.5*lineWidth;
						mat[0] = xScale;
						mat[5] = yScale;

						// draw the stroke
						p = this.transformPoint( bezPts[0],   mat );
						ctx.moveTo( p[0],  p[1] );
						index = 1;
						while (index < n) {
							p0   = this.transformPoint( bezPts[index],  mat );
							p1 = this.transformPoint( bezPts[index+1],  mat );

							x0 = p0[0];
							y0 = p0[1];
							x1 = p1[0];
							y1 = p1[1];
							ctx.quadraticCurveTo( x0,  y0,  x1, y1 );
							index += 2;
						}
					}

					// render the stroke
					ctx.stroke();
				}
			}
		}
	},

	///////////////////////////////////////////////////////////////////////
	// this function returns the quadratic Bezier approximation to the specified
	// circular arc.  The input can be 2D or 3D, determined by the minimum dimension
	// of the center and start point.
	// includedAngle is in radians, can be positiveor negative
	circularArcToBezier: {
		value: function(ctr_, startPt_, includedAngle) {
			var dimen = 3;
			var ctr = ctr_.slice();
			var startPt = startPt_.slice();

			// make sure the start point is good
			var pt = this.vecSubtract(dimen, startPt, ctr);
			var rad = this.vecMag(dimen, pt);

			if ((dimen != 3) || (rad <= 0) || (includedAngle === 0))
			{
				if (dimen != 3)  console.log( "circularArcToBezier works for 3 dimensional points only.  Was " + dimen );
				return [ startPt.slice(0), startPt.slice(0), startPt.slice(0) ];
			}

			// determine the number of segments.  45 degree span maximum.
			var nSegs = Math.ceil( Math.abs(includedAngle)/(0.25*Math.PI) );
			if (nSegs <= 0)  return [ startPt.slice(0), startPt.slice(0), startPt.slice(0) ];
			var dAngle = includedAngle/nSegs;

			// determine the length of the center control point from the circle center
			var cs = Math.cos( 0.5*Math.abs(dAngle) ),  sn = Math.sin( 0.5*Math.abs(dAngle) );
			var  c = rad*sn;
			var  h = c*sn/cs;
			var  d = rad*cs + h;

			var rtnPts = [ this.vecAdd(dimen, pt, ctr) ];
			var rotMat = this.MatrixRotationZ( dAngle );
			for ( var i=0;  i<nSegs;  i++)
			{
				// get the next end point
				var pt2 = this.transformPoint( pt, rotMat );

				// get the next center control point
				var midPt = this.vecAdd(3, pt, pt2);
				this.vecScale(dimen, midPt, 0.5);
				midPt = this.vecNormalize( dimen, midPt, d );

				// save the next segment
				rtnPts.push( this.vecAdd(dimen, midPt, ctr) );
				rtnPts.push( this.vecAdd(dimen,   pt2, ctr) );

				// advance for the next segment
				pt = pt2;
			}
			return rtnPts;
		}
	}
});


///////////////////////////////////////////////////////////////////////
// Class RuntimeMaterial
//      Runtime representation of a material.
///////////////////////////////////////////////////////////////////////
NinjaCvsRt.RuntimeMaterial = Object.create(Object.prototype, {
	///////////////////////////////////////////////////////////////////////
	// Instance variables
	///////////////////////////////////////////////////////////////////////
	_name: { value: "GLMaterial", writable: true },
	_shaderName: { value: "undefined", writable: true },

	// variables for animation speed
	_time: { value: 0.0, writable: true },
	_dTime: { value: 0.01, writable: true },

	// RDGE variables
	_shader: { value: undefined, writable: true },
	_materialNode: { value: undefined, writable: true },

	///////////////////////////////////////////////////////////////////////
	// Property Accessors
	///////////////////////////////////////////////////////////////////////

	// a material can be animated or not. default is not.  
	// Any material needing continuous rendering should override this method
	isAnimated: { value: function() { return false; }},

	///////////////////////////////////////////////////////////////////////
	// Methods
	///////////////////////////////////////////////////////////////////////
	init: { value: function(world) { }},

	update: { value: function(time) { }},

	importJSON: { value: function(jObj) { }}
});

NinjaCvsRt.RuntimeFlatMaterial = Object.create(NinjaCvsRt.RuntimeMaterial, {
	_name: { value: "FlatMaterial", writable: true },
	_shaderName: { value: "flat", writable: true },

	// assign a default color
	_color: { value: [1,0,0,1], writable: true },

	importJSON: {
		value: function(jObj) {
			this._color = jObj.color;
		}
	},

	init: {
		value: function(world) {
			if (this._shader) {
				 this._shader.colorMe["color"].set( this._color );
			}
		}
	}

});


NinjaCvsRt.RuntimeTwistVertMaterial = Object.create(NinjaCvsRt.RuntimeMaterial, {
	_name: { value: "TwistVertMaterial", writable: true },
	_shaderName: { value: "twistVert", writable: true },

	_tex0: { value: 'assets/images/cubelight.png', writable: true },
	_tex1: { value: 'assets/images/cubelight.png', writable: true },

	_dTime: { value: 0.01, writable: true },
	_twistAmount: { value: 0.0, writable: true },
	_angle: { value: 0.0, writable: true },


	isAnimated: { value: function() { return true; }},

	importJSON: {
		value: function(jObj) {
			this._tex0 = jObj.tex0;
			this._tex1 = jObj.tex1;

			this._speed = jObj.speed;

			this._limit1 = jObj.limit1;
			this._limit2 = jObj.limit2;
			this._twistAmount = jObj.angle;
	   }
	},

	init: {
		value: function(world) {
			var material = this._materialNode;
			if (material)
			{
				var technique = material.shaderProgram["twistMe"];
				var renderer = RDGE.globals.engine.getContext().renderer;
				if (renderer && technique)
				{
					var wrap = 'REPEAT',  mips = true;
					var tex = renderer.getTextureByName(this._tex0, wrap, mips );
					if (tex)  technique.u_tex0.set( tex );
					tex = renderer.getTextureByName(this._tex1, wrap, mips );
					if (tex)  technique.u_tex1.set( tex );

					technique.u_twistAmount.set( [this._angle] );
					technique.u_limit1.set( [this._limit1] );
					technique.u_limit2.set( [this._limit2] );
				}
			}
	   }
	},

	// several materials inherit from pulse.
	// they may share this update method
	update: {
		value: function(time) {
		   
			var angle = this._angle;
			angle += this._dTime * this._speed;
			if (angle > this._twistAmount)
			{
				angle = this._twistAmount;
				this._dTime = -this._dTime;
			}
			else if (angle < 0.0)
			{
				angle = 0;
				this._dTime = -this._dTime;
			}
			this._angle = angle;
			this._shader.twistMe["u_twistAmount"].set([angle]);
	   }
	}
});

//////////////////////////////////////////////////////

NinjaCvsRt.RuntimeTaperMaterial = Object.create(NinjaCvsRt.RuntimeMaterial, {
	_name: { value: "TaperMaterial", writable: true },
	_shaderName: { value: "taper", writable: true },

	_dTime: { value: 0.01, writable: true },
	_twistAmount: { value: 0.0, writable: true },
	_angle: { value: 0.0, writable: true },


	isAnimated: { value: function() { return true; }},

	importJSON: {
		value: function(jObj) {
			this._tex0 = jObj.tex0;
			this._tex1 = jObj.tex1;

			this._speed = jObj.speed;

			this._limit1 = jObj.limit1;
			this._limit2 = jObj.limit2;
			this._twistAmount = jObj.angle;
	   }
	},

	init: {
		value: function(world) {
			var material = this._materialNode;
			if (material)
			{
				var technique = material.shaderProgram["colorMe"];
				var renderer = RDGE.globals.engine.getContext().renderer;
				if (renderer && technique)
				{
					var wrap = 'REPEAT',  mips = true;
					var tex = renderer.getTextureByName(this._tex0, wrap, mips );
					if (tex)  technique.u_tex0.set( tex );
					tex = renderer.getTextureByName(this._tex1, wrap, mips );
					if (tex)  technique.u_tex1.set( tex );

					technique.u_twistAmount.set( [this._angle] );
					technique.u_limit1.set( [this._limit1] );
					technique.u_limit2.set( [this._limit2] );
				}
			}
	   }
	},

	// several materials inherit from pulse.
	// they may share this update method
	update: {
		value: function(time) {
		   
			var angle = this._angle;
			angle += this._dTime * this._speed;
			if (angle > this._twistAmount)
			{
				angle = this._twistAmount;
				this._dTime = -this._dTime;
			}
			else if (angle < 0.0)
			{
				angle = 0;
				this._dTime = -this._dTime;
			}
			this._angle = angle;
			this._shader.twistMe["u_twistAmount"].set([angle]);
	   }
	}
});


NinjaCvsRt.RuntimePulseMaterial = Object.create(NinjaCvsRt.RuntimeMaterial, {
	_name: { value: "PulseMaterial", writable: true },
	_shaderName: { value: "pulse", writable: true },

	_texMap: { value: 'assets/images/cubelight.png', writable: true },

	isAnimated: { value: function() { return true; }},

	importJSON: {
		value: function(jObj) {
			this._texMap = jObj.u_tex0;
			if (jObj.dTime)  this._dTime = jObj.dTime;
		}
	},

	init: {
		value: function(world) {
			var material = this._materialNode;
			if (material)
			{
				var technique = material.shaderProgram["default"];
				var renderer = RDGE.globals.engine.getContext().renderer;
				if (renderer && technique)
				{
					if (this._shader && this._shader["default"])
					{
						var res = [ renderer.vpWidth,  renderer.vpHeight ];
						technique.u_resolution.set( res );

						var wrap = 'REPEAT',  mips = true;
						var tex = renderer.getTextureByName(this._texMap, wrap, mips );
						if (tex)
							technique.u_tex0.set( tex );

						this._shader["default"].u_speed.set( [1.0] );
						this._shader["default"].u_time.set( [this._time] );
					}
				}
			}
		}
	},

	// several materials inherit from pulse.
	// they may share this update method
	update: {
		value: function(time) {
			var material = this._materialNode;
			if (material)
			{
				var technique = material.shaderProgram["default"];
				var renderer = RDGE.globals.engine.getContext().renderer;
				if (renderer && technique)
				{
					if (this._shader && this._shader["default"])
						this._shader["default"].u_time.set( [this._time] );
					this._time += this._dTime;
					if (this._time > 200.0)  this._time = 0.0;
				}
			}
		}
	}
});


NinjaCvsRt.RuntimeFlagMaterial = Object.create(NinjaCvsRt.RuntimeMaterial, {
	_name: { value: "FlagMaterial", writable: true },
	_shaderName: { value: "flag", writable: true },

	// default values
	_texMap: { value: 'assets/images/cubelight.png', writable: true },
	_speed: { value: 1.0, writable: true },
	_waveWidth: { value: 1.0, writable: true },
	_waveHeight: { value: 1.0, writable: true },
	_dTime: { value: 0.1, writable: true },

	importJSON: {
		value: function(jObj) {
			this._texMap	 = jObj.texMap;
			this._waveWidth  = jObj.waveWidth;
			this._waveHeight = jObj.waveHeight;
			this._speed		 = jObj.speed;
		}
	},

	init: {
		value: function(world) {
			if (this._shader) {
				var material = this._materialNode;
				if (material)
				{
					var technique = material.shaderProgram['default'];
					var renderer = RDGE.globals.engine.getContext().renderer;
					if (renderer && technique)
					{

						if (this._shader && this._shader['default']) {
							var wrap = 'REPEAT',  mips = true;
							var tex = renderer.getTextureByName(this._texMap, wrap, mips );
							if (tex)  technique.u_tex0.set( tex );

							technique.u_speed.set( [this._speed] );
							technique.u_waveWidth.set( [this._waveWidth] );
							technique.u_waveHeight.set( [this._waveHeight] );
						}
					}
				}
			}
		}
	},

	update: {
		value: function(time) {
			var material = this._materialNode;
			if (material)
			{
				var technique = material.shaderProgram['default'];
				var renderer = RDGE.globals.engine.getContext().renderer;
				if (renderer && technique)
				{
					if (this._shader && this._shader['default']) {
						this._shader['default'].u_time.set( [this._time] );
					}
					this._time += this._dTime * this._speed;
				}
			}
		}
	}
});

NinjaCvsRt.RuntimeRadialGradientMaterial = Object.create(NinjaCvsRt.RuntimeMaterial, {
	_name: { value: "RadialGradientMaterial", writable: true },
	_shaderName: { value: "radialGradient", writable: true },

	// setup default values
	_color1: { value: [1,0,0,1], writable: true },
	_color2: { value: [0,1,0,1], writable: true },
	_color3: { value: [0,0,1,1], writable: true },
	_color4: { value: [0,1,1,1], writable: true },

	_colorStop1: { value: 0.0, writable: true },
	_colorStop2: { value: 0.3, writable: true },
	_colorStop3: { value: 0.6, writable: true },
	_colorStop4: { value: 1.0, writable: true },

	_textureTransform: { value: [1,0,0,  0,1,0,  0,0,1], writable: true },

	init: {
		value: function(world) {
			var material = this._materialNode;
			if (material)
			{
				var technique = material.shaderProgram["default"];
				var renderer = RDGE.globals.engine.getContext().renderer;
				if (renderer && technique)
				{
					if (this._shader && this._shader["default"])
					{
						this._shader["default"].u_color1.set( this._color1 );
						this._shader["default"].u_color2.set( this._color2 );
						this._shader["default"].u_color3.set( this._color3 );
						this._shader["default"].u_color4.set( this._color4 );

						this._shader["default"].u_colorStop1.set( [this._colorStop1] );
						this._shader["default"].u_colorStop2.set( [this._colorStop2] );
						this._shader["default"].u_colorStop3.set( [this._colorStop3] );
						this._shader["default"].u_colorStop4.set( [this._colorStop4] );

						this._shader["default"].u_texTransform.set( this._textureTransform );

						if (this._angle !== undefined)
							this._shader["default"].u_cos_sin_angle.set([Math.cos(this._angle), Math.sin(this._angle)]);
					}
				}
			}
		}
	},

	importJSON: {
		value: function(jObj) {
			this._color1	= jObj.color1;
			this._color2	= jObj.color2;
			this._color3	= jObj.color3;
			this._color4	= jObj.color4;
			this._colorStop1	= jObj.colorStop1;
			this._colorStop2	= jObj.colorStop2;
			this._colorStop3	= jObj.colorStop3;
			this._colorStop4	= jObj.colorStop4;

			this._textureTransform = jObj.textureTransform;

			if (this._angle !== undefined)
				this._angle = jObj.angle;
		}
	}
});

NinjaCvsRt.RuntimeLinearGradientMaterial = Object.create(NinjaCvsRt.RuntimeRadialGradientMaterial, {
	_name: { value: "LinearGradientMaterial", writable: true },
	_shaderName: { value: "linearGradient", writable: true },

	// the only difference between linear & radial gradient is the existence of an angle for linear.
	_angle: { value: 0.0, writable: true }
});

NinjaCvsRt.RuntimeBumpMetalMaterial = Object.create(NinjaCvsRt.RuntimeMaterial, {
	_name: { value: "BumpMetalMaterial", writable: true },
	_shaderName: { value: "bumpMetal", writable: true },

	_lightDiff: { value: [0.3, 0.3, 0.3, 1.0], writable: true },

	_diffuseTexture: { value: "assets/images/metal.png", writable: true },
	_specularTexture: { value: "assets/images/silver.png", writable: true },
	_normalTexture: { value: "assets/images/normalMap.png", writable: true },

	importJSON: {
		value: function(jObj) {
			this._lightDiff			= jObj.lightDiff;
			this._diffuseTexture	= jObj.diffuseTexture;
			this._specularTexture	= jObj.specularTexture;
			this._normalTexture		= jObj.normalMap;
		}
	},

	init: {
		value: function(world) {
			var material = this._materialNode;
			if (material)
			{
				var technique = material.shaderProgram["default"];
				var renderer = RDGE.globals.engine.getContext().renderer;
				if (renderer && technique)
				{
					if (this._shader && this._shader["default"])
					{
						technique.u_light0Diff.set( this._lightDiff );

						var tex;
						var wrap = 'REPEAT',  mips = true;
						if (this._diffuseTexture)
						{
							tex = renderer.getTextureByName(this._diffuseTexture, wrap, mips );
							if (tex)  technique.u_colMap.set( tex );
						}
						if (this._normalTexture)
						{
							tex = renderer.getTextureByName(this._normalTexture, wrap, mips );
							if (tex)  technique.u_normalMap.set( tex );
						}
						if (this._specularTexture)
						{
							tex = renderer.getTextureByName(this._specularTexture, wrap, mips );
							technique.u_glowMap.set( tex );
						}
					}
				}
			}
		}
	}
});

NinjaCvsRt.RuntimeUberMaterial = Object.create(NinjaCvsRt.RuntimeMaterial, {
//    _name: { value: "UberMaterial", writable: true },
//    _shaderName: { value: "uber", writable: true },

	_MAX_LIGHTS: { value: 4, writable: false },

	init: {
		value: function(world) {
			var material = this._materialNode;
			if (material)
			{
				var technique = material.shaderProgram.defaultTechnique;
				var renderer = RDGE.globals.engine.getContext().renderer;
				if (renderer && technique)
				{
					if (this._shader && this._shader.defaultTechnique)
					{
						if (this._ambientColor  && technique.u_ambientColor)   technique.u_ambientColor.set(this._ambientColor );
						if (this._diffuseColor  && technique.u_diffuseColor )   technique.u_diffuseColor.set(this._diffuseColor  );
						if (this._specularColor && technique.u_specularColor)   technique.u_specularColor.set(this._specularColor);
						if (this._specularPower && technique.u_specularPower)   technique.u_specularPower.set([this._specularPower]);

						if (this._lights)
						{
							for(var i = 0; i < 4; ++i)
							{
								var light = this._lights[i];
								if (light)
								{
									if(light.type == 'directional')
									{
										technique['u_light'+i+'Dir'].set( light.direction || [ 0, 0, 1 ]);
									}
									else if(light.type == 'spot')
									{
										var deg2Rad = Math.PI / 180;
										technique['u_light'+i+'Atten'].set(light.attenuation || [ 1,0,0 ]);
										technique['u_light'+i+'Pos'].set(light.position || [ 0, 0, 0 ]);
										technique['u_light'+i+'Spot'].set([ Math.cos( ( light.spotInnerCutoff || 45.0 )  * deg2Rad ),
																			Math.cos( ( light.spotOuterCutoff || 90.0 ) * deg2Rad )]);
									}
									else
									{
										technique['u_light'+i+'Pos'].set(light.position || [ 0, 0, 0 ]);
										technique['u_light'+i+'Atten'].set(light.attenuation || [ 1,0,0 ]);
									}

									// set the common light properties
									technique['u_light'+i+'Color'].set(light.diffuseColor || [ 1,1,1,1 ]);
									technique['u_light'+i+'Specular'].set(light.specularColor || [ 1, 1, 1, 1 ]);
								}
							}
						}

						// currently not exported
						var uvTransform = [ 2.0, 0, 0, 0, 0, 2.0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1];
						technique.u_uvMatrix.set(uvTransform);

						var tex = null;
						if (this._diffuseMap)
						{
							tex = renderer.getTextureByName(this._diffuseMap, 'REPEAT');
							technique.s_diffuseMap.set( tex );
						}

						if (this._normalMap)
						{
							tex = renderer.getTextureByName(this._normalMap, 'REPEAT');
							technique.s_normalMap.set( tex );
						}

						if (this._specularMap)
						{
							tex = renderer.getTextureByName(this._specularMap, 'REPEAT');
							technique.s_specMap.set( tex );
						}

						if(this._environmentMap)
						{
							tex = renderer.getTextureByName(this._environmentMap, 'CLAMP');
							technique.s_envMap.set( tex );
							if (this._environmentAmount)
								technique.u_envReflection.set([ this._environmentAmount ] );
						}
					}
				}
			}
		}
	},

	update: {
		value: function(time) {
		}
	},

	importJSON: {
		value: function(jObj) {
			if (jObj.materialProps)
			{
				this._ambientColor  = jObj.materialProps.ambientColor;
				this._diffuseColor  = jObj.materialProps.diffuseColor;
				this._specularColor = jObj.materialProps.specularColor;
				this._specularPower = jObj.materialProps.specularPower;
			}

			var lightArray = jObj.lights;
			if (lightArray)
			{
				this._lights = [];
				for (var i=0;  i<this._MAX_LIGHTS;  i++)
				{
					var lightObj = lightArray[i];
					if (lightObj)
					{
						var type = lightObj['light'+i];
						if (type)
						{
							var light = new Object;
							switch (type)
							{
								case "directional":
									light.direction = lightObj['light' + i + 'Dir'];
									break;

								case "spot":
									light.position = lightObj['light' + i + 'Pos'];
									light['spotInnerCutoff'] = lightObj['light' + i + 'OuterSpotCutoff'];
									light['spotOuterCutoff'] = lightObj['light' + i + 'InnerSpotCutoff'];
									break;

								case "point":
									light.position = lightObj['light' + i + 'Pos'];
									light.attenuation = lightObj['light' + i + 'Attenuation'];
									break;

								default:
									throw new Error( "unrecognized light type on import: " + type );
									break;
							}

							// common to all lights
							light.diffuseColor  = lightObj['light' + i + 'Color'];
							light.specularColor = lightObj['light' + i + 'SpecularColor'];

							// push the light
							this._lights.push( light );
						}
						else
							this._lights[i] = 'undefined';
					}
				}
			}

			this._diffuseMap		= jObj['diffuseMap'];
			this._normalMap			= jObj['normalMap'];
			this._specularMap		= jObj['specularMap'];
			this._environmentMap	= jObj['environmentMap'];
			if (this._environmentMap)
				this._environmentAmount = jObj['environmentAmount'];
		}
	}
});

NinjaCvsRt.RuntimePlasmaMaterial = Object.create(NinjaCvsRt.RuntimeMaterial, {
	_name: { value: "PlasmaMaterial", writable: true },
	_shaderName: { value: "plasma", writable: true },

	_speed: { value: 1.0, writable: true },

	isAnimated: { value: function() { return true; }},

	init: {
		value: function(world) {
			this.update();
		}
	},

	importJSON: {
		value: function(jObj) {
			this._speed = jObj.speed;
			this._dTime = jObj.dTime;
		}
	},

	update: {
		value: function(time) {
			var material = this._materialNode;
			if (material)
			{
				var technique = material.shaderProgram["default"];
				var renderer = RDGE.globals.engine.getContext().renderer;
				if (renderer && technique)
				{
					if (this._shader && this._shader["default"])
						this._shader["default"].u_time.set( [this._time] );
					this._time += this._dTime;
					if (this._time > 200.0)  this._time = 0.0;
				}
			}
		}
	}
});


