/* <copyright>
This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
(c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
</copyright> */

var Montage = require("montage/core/core").Montage,
    Component   = require("montage/ui/component").Component,
    MaterialsModel = require("js/models/materials-model").MaterialsModel;

////////////////////////////////////////////////////////////////////////
//Exporting as MaterialsPopup
exports.MaterialsPopup = Montage.create(Component, {
    ////////////////////////////////////////////////////////////////////
	// Material Properties
    _materialName: {
        enumerable: true,
        value: ""
    },

	_useSelection: {  value: false,  enumerable: true },
	_whichMaterial: { value: "fill", enumerable: true },

	captureAction: {
		value:function(event) {
			switch(event._currentTarget.label)
			{
				case "Cancel":
					console.log("Cancel material edit");
					break;
				case "OK":
					console.log("Committing material with the following values:");
                    for(var i=0, len=this.materialsProperties.childComponents.length; i< len; i++)
                    {
                        var childControl = this.materialsProperties.childComponents[i];
                        var childValue = childControl._control[childControl._prop];

                        if(typeof childValue === "object")
                        {
                            console.log(childControl.label + " is ");
                            console.dir(childValue);
                        }
                        else
                        {
                            console.log(childControl.label + " is " + childValue);
                        }
                        console.log("--------------");

                    }
					break;
			}

            // Notify Materials Library to close popup
            NJevent("hideMaterialPopup");
		}
	},

    updatePreview:
    {
        value: function(event)
        {
            if(event.type === "propertyChanging")
            {
                this._handlePropertyChanging(event);
            }
            else
            {
                this._handlePropertyChange(event);
            }
        }
    },

    _handlePropertyChanging:
    {
        value: function(event)
        {
            if(typeof event.propertyValue === "object")
            {
                console.log(event.propertyLabel + " changing to ");
                console.dir(event.propertyValue);
            }
            else
            {
                console.log(event.propertyLabel + " changing to " + event.propertyValue);
            }

			if (event.propertyLabel && event.propertyValue)
				this.applyProperty( event.propertyLabel,  event.propertyValue );
        }
    },

    _handlePropertyChange:
    {
        value: function(theEvent)
        {
			var event = theEvent._event;
            if(typeof event.propertyValue === "object")
            {
                console.log(event.propertyLabel + " changed to ");
                console.dir(event.propertyValue);
            }
            else
            {
                console.log(event.propertyLabel + " changed to " + event.propertyValue);
            }

			if (event.propertyLabel)
				this.applyProperty( event.propertyLabel,  event.propertyValue );
        }
    },

	applyProperty:
	{
		value: function( propLabel, propValue)
		{
			// find the property lable in the array
			// This assumes no duplication in labels
			if (this._propLabels)
			{
				// the label cones through with a trailing ':'.  remove that
				var ch = propLabel[ propLabel.length - 1];
				if (ch == ':')
					propLabel = propLabel.substr(0, propLabel.length - 1);
				
				var index;
				var nProps = this._propLabels.length;
				for (var i=0;  i<nProps;  i++)
				{
					if (this._propLabels[i] == propLabel)
					{
						index = i;
						break;
					}
				}
				if ((index != null) && this._material)
				{
					var value = this.decodeValue( this._propTypes[index],  propValue );
					this._material.setProperty( this._propNames[index],  value );
				}

				if (this._useSelection)
				{
					console.log( "apply to selection" );

					var selection = this.application.ninja.selectedElements;
					if (selection && (selection.length > 0))
					{
						var canvas = selection[0];
						var obj;
						if (canvas.elementModel && canvas.elementModel.shapeModel)  obj = canvas.elementModel.shapeModel.GLGeomObj;
						if (obj)
						{
							var world = obj.getWorld();
							if (world)
								world.restartRenderLoop();
						}
					}
				}
			}
		}
	},

	decodeValue:
	{
		value: function( type,  value )
		{
			var rtnValue;
			switch (type)
			{
				case "color":
					rtnValue = [ value['r']/255.0,  value['g']/255.0,  value['b']/255.0, value['a'] ];
					break;

				case "vector2d":
				case "vector3d":
					rtnValue = [];
					for (var i in value)  rtnValue.push( value[i] );
					break;

				case "float":
					rtnValue = value;
					break;

				case "angle":
					rtnValue = value*3.14159/180.0;
					break;

				case "file":
					if (value && (value.length > 0))
					{
						var index = value.lastIndexOf( "/" );
						if (index < 0)  index = value.lastIndexOf( "\\" );
						if (index >= 0)
						{
							value = value.substr( index+1 );
							value = "assets/images/" + value;
						}
						rtnValue = value.slice(0);
					}
					break;

				case "checkbox":
					rtnValue = value;
					break;

				default:
					console.log( "unrecognized material control type: " + type );
					break;
			}
			return rtnValue;
		}
	},

    ////////////////////////////////////////////////////////////////////
	//
	prepareForDraw: {
		enumerable: false,
		value: function() {
            this.cancelButton.addEventListener("action", this, true);

            this.okButton.addEventListener("action", this, true);
        }
    },
	////////////////////////////////////////////////////////////////////
	//
	didDraw: {
		enumerable: false,
		value: function() {
           this.materialTitle.innerHTML = this._materialName;
		}
	},

	//Garbage collection (Manual method)
	destroy: {
		enumerable: false,
		value: function() {
			// add cleanup routines here
		}
	},

	loadMaterials:
	{
		enumerable: true,
		value: function(materialID,  useSelection,  whichMaterial)
		{
			//TODO - Hack to force repetition to draw. Setting .length = 0 did not work.
			this.materialsData = [];

			var material;
			this._materialName = materialID;
			if (useSelection)
			{
				this._useSelection = true;
				var selection = this.application.ninja.selectedElements;
				if (selection && (selection.length > 0))
				{
					var canvas = selection[0];
					var obj;
					this._whichMaterial = whichMaterial;
					if (canvas.elementModel && canvas.elementModel.shapeModel)  obj = canvas.elementModel.shapeModel.GLGeomObj;
					if (obj)
						material = (whichMaterial === 'stroke') ? obj.getStrokeMaterial() : obj.getFillMaterial();
				}
			}
			else
			{
				this._useSelection = false;

				if(
						(materialID ===  "BumpMetalMaterial")		||
						(materialID ===  "DeformMaterial")			||
						(materialID ===  "FlatMaterial")			||
						(materialID ===  "FlagMaterial")			||
						(materialID ===  "FlyMaterial")				||
						(materialID ===  "JuliaMaterial")			||
						(materialID ===  "KeleidoscopeMaterial")	||
						(materialID ===  "LinearGradientMaterial")	||
						(materialID ===  "MandelMaterial")			||
						(materialID ===  "PlasmaMaterial")			||
						(materialID ===  "PulseMaterial")			||
						(materialID ===  "RadialBlurMaterial")		||
						(materialID ===  "RadialGradientMaterial")	||
						(materialID ===  "ReliefTunnelMaterial")	||
						(materialID ===  "SquareTunnelMaterial")	||
						(materialID ===  "StarMaterial")			||
						(materialID ===  "TaperMaterial")			||
						(materialID ===  "TunnelMaterial")			||
						(materialID ===  "TwistMaterial")			||
						(materialID ===  "TwistVertMaterial")		||
						(materialID ===  "UberMaterial")			||
						(materialID ===  "WaterMaterial")			||
						(materialID ===  "ZInvertMaterial")
					)
				{
					material = MaterialsModel.getMaterial( materialID );
				}
			}
				
			if (material)
			{
				this._material = material;
				this.materialsData = this.getMaterialData( material );
			}
			else
			{
				this.materialsData = this[materialID];
			}
			this.needsDraw = true;
		}
	},

	getMaterialData:
	{
		value: function( material )
		{
			// declare the array to hold the results
			var rtnArray = [];

			var propNames = [],  propValues = [],  propTypes = [],  propLabels = [];
			this._propNames = propNames;
			this._propValues = propValues;
			this._propTypes = propTypes;
			this._propLabels = propLabels;
			material.getAllProperties( propNames,  propValues,  propTypes,  propLabels);
			var n = propNames.length;
			for (var i=0;  i<n;  i++)
			{
				var obj;
				switch (propTypes[i])
				{
					case "color":
						obj = this.createColorData( propLabels[i], propValues[i] );
						break;

					case "vector2d":
						obj = this.createVectorData( 2, propLabels[i], propValues[i] );
						break;

					case "vector3d":
						obj = this.createVectorData( 3, propLabels[i], propValues[i] );
						break;

					case "float":
						obj = this.createFloatData( propLabels[i], propValues[i] );
						break;

					case "angle":
						obj = this.createFloatData( propLabels[i], propValues[i]*180.0/3.14159 );
						break;

					case "file":
						obj = this.createFileData( propLabels[i], propValues[i] );
						break;

					case "checkbox":
						obj = this.createCheckboxData( propLabels[i], propValues[i] );
						break;

					default:
						console.log( "unrecognized material control type: " + propType[i] );
						break;
				}

				if (obj)
				{
					rtnArray.push( obj );
					obj = null;
				}
			}

			return rtnArray;
		}
	},

	createColorData:
	{
		value:  function( label,  color )
		{
            var css = 'rgba(' + Math.floor(color[0]*255) + ',' + Math.floor(color[1]*255) + ',' + Math.floor(color[2]*255) + ',' + color[3] + ')';
            var colorObj = this.application.ninja.colorController.getColorObjFromCss(css)
			var obj =
			{
				"label":		label,
				"description":	"a color",
				"controlType":	"ColorChip",
                "defaults":
                {
					"color":	colorObj
				}
			};

			return obj;
		}
	},

	createFloatData:
	{
		value: function( label, value )
		{
			var obj =
			{
                "label":         label,
                "description":   "floating point value",
                "controlType":   "HotText",
                "defaults":
                {
                    "minValue": 0,
                    "maxValue": 400,
                    "decimalPlace": 100,
					"value": value
                }
			}

			return obj;
		}
	},
	
	createCheckboxData:
	{
		value: function( label, value )
		{
			var obj =
			{
                "label":         label,
                "description":   "checkbox",
                "controlType":   "Button",
                "defaults":
                {
                    "isToggleButton": true,
					"value": value
                }
			}

			return obj;
		}
	},

	createFileData:
	{
		value: function( label, value )
		{
			var obj =
			{
                "label":         label,
                "description":   "Image file",
                "controlType":   "FileInput",
                "defaults":
                {
                    "filePath": value
                }
            };

			return obj;
		}
	},

	createVectorData:
	{
		value: function( dimen, label, value )
		{
			var obj = 
			{
                "label":         label,
                "description":   "a vector",
                "controlType":   "InputGroup",
                "defaults":
                {
                    data:[
                        {
                            "label":         "X",
                            "description":   "X value",
                            "controlType":   "HotText",
                            "defaults":
                            {
								"decimalPlace": 100,
								"minValue": -10,
                                "maxValue":  10,
                                "value": value[0]
                            }
                        },
                        {
                            "label":         "Y",
                            "description":   "Y value",
                            "controlType":   "HotText",
                            "defaults":
                            {
								"decimalPlace": 100,
								"minValue": -100,
                                "maxValue":  100,
								"value":	value[1]
                           }
                        }
                    ]
                }
			}

			if (dimen > 2)
			{
				obj["defaults"]["data"][2] =
				{
					"label":         "Z",
					"description":   "Z value",
					"controlType":   "HotText",
					"defaults":
					{
						"minValue": -1.e8,
						"maxValue":  1.e8,
						"value":	value[2]
					}
				}
			}

			return obj;
		}
	},

    // _dummyData1
    CheckerBoard: {
        value: [
            {
                "label":         "Texture1",
                "description":   "Texture1 value",
                "controlType":   "FileInput",
                "defaults":
                {
                    "filePath": "http://localhost/"
                }
            },
            {
                "label":         "Diffuse",
                "description":   "Diffuse value",
                "controlType":   "ColorChip",
                "defaults":
                {
                }
            },
            {
                "label":         "Specular",
                "description":   "Specular value",
                "controlType":   "Button",
                "defaults":
                {
                    "isToggleButton": true
                }
            },
            {
                "label":         "Shininess",
                "description":   "Shininess value",
                "controlType":   "HotText",
                "defaults":
                {
                    "minValue": 0,
                    "maxValue": 128,
                    "decimalPlace": 100
                }
            },
            {
                "label":         "RGB",
                "description":   "RGB value",
                "controlType":   "InputGroup",
                "defaults":
                {
                    data:[
                        {
                            "label":         "R",
                            "description":   "R value",
                            "controlType":   "HotText",
                            "defaults":
                            {
                                "minValue": 0,
                                "maxValue": 255,
                                "value": 255
                            }
                        },
                        {
                            "label":         "G",
                            "description":   "G value",
                            "controlType":   "HotText",
                            "defaults":
                            {
                                "minValue": 0,
                                "maxValue": 255
                            }
                        },
                        {
                            "label":         "B",
                            "description":   "B value",
                            "controlType":   "HotText",
                            "defaults":
                            {
                                "minValue": 0,
                                "maxValue": 255
                            }
                        }
                    ]
                }
            },
            {
                "label":         "XYZ",
                "description":   "XYZ value",
                "controlType":   "InputGroup",
                "defaults":
                {
                    data:[
                        {
                            "label":         "X",
                            "description":   "X value",
                            "controlType":   "TextField",
                            "defaults":
                            {
                                "text": "0"
                            }
                        },
                        {
                            "label":         "Y",
                            "description":   "Y value",
                            "controlType":   "TextField",
                            "defaults":
                            {
                                "text": "0"
                            }
                        },
                        {
                            "label":         "Z",
                            "description":   "Z value",
                            "controlType":   "TextField",
                            "defaults":
                            {
                                "text": "1"
                            }
                        }
                    ]
                }
            },
            {
                "label":         "Foo",
                "description":   "Foo value",
                "controlType":   "Slider",
                "defaults":
                {
                    "minValue":    0,
                    "maxValue":    100,
                    "value":    50,
                    "allowTrackClick": true
                }
            },
            {
                "label":         "Bar",
                "description":   "Bar value",
                "controlType":   "HotTextUnit",
                "defaults":
                {
                    "acceptableUnits": ["%"],
                    "value":    50,
                    "units": "%"
                }
            }
        ]
    },

    // _dummyData2
    ShinyMetal: {
        value: [
                    {
                        "label":         "Diffuse",
                        "description":   "Diffuse value",
                        "controlType":   "ColorChip",
                        "defaults":
                        {
                        }
                    },
                    {
                        "label":         "Ambient",
                        "description":   "Ambient value",
                        "controlType":   "ColorChip",
                        "defaults":
                        {
                        }
                    },
                    {
                        "label":         "Specular",
                        "description":   "Specular value",
                        "controlType":   "ColorChip",
                        "defaults":
                        {
                        }
                    },
                    {
                        "label":         "Shininess",
                        "description":   "Shininess value",
                        "controlType":   "HotText",
                        "defaults":
                            {
                                "minValue": 0,
                                "maxValue": 128
                            }
                    }
                ]
    },

    materialsProperties: {
        serializable: true,
        value: null
    },
    
    _materialsData: {
		enumerable: true,
        serializable: true,
	    value: []
    
	},

    materialsData: {
        enumerable: true,
        serializable: true,
        get: function() {
                return this._materialsData;
            },
        set: function(data) {
            this._materialsData = data;
            if(this.materialsProperties && data.length)
            {
                this.materialsProperties.needsDraw = true;
            }
        }
    }


});
