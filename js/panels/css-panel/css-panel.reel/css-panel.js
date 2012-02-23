/* <copyright>
 This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
 No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
 (c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
 </copyright> */

var Montage = require("montage/core/core").Montage,
    Component = require("montage/ui/component").Component;

exports.CSSPanelNew = Montage.create(Component, {
    hasTemplate: {
        value: true
    },
    condition: {
        value: false
    },
    templateDidLoad : {
        value: function() {
            console.log("css panel : template did load");
            //this.condition = true;
        }
    },
    prepareForDraw : {
        value: function() {
            console.log("css panel : prepare for draw");
        }
    },
    draw : {
        value: function() {
            console.log("css panel : draw");
        }
    }
});
