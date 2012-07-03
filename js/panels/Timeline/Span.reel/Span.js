/* <copyright>
 This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
 No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
 (c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
 </copyright> */

var Montage = require("montage/core/core").Montage,
	Component = require("montage/ui/component").Component;

var Span = exports.Span = Montage.create(Component, {

    hasTemplate:{
        value: true
    },

	// BEGIN: Models
    _spanWidth:{
        value:0
    },
    spanWidth:{
        serializable:true,
        get:function () {
            return this._spanWidth;
        },
        set:function (value) {
            this._spanWidth = value;
            this.needsDraw = true;
        }
    },
    
    _isHighlighted: {
    	value: false
    },
    isHighlighted: {
    	get: function() {
    		return this._isHighlighted;
    	},
    	set: function(newVal) {
    		if (newVal !== this._isHighlighted) {
    			this._isHighlighted = newVal;
    			this.needsDraw = true;
    		}
    	}
    },
    
    _areChoicesVisible: {
    	value: false
    },
    areChoicesVisible: {
    	get: function() {
    		return this._areChoicesVisible;
    	},
    	set: function(newVal) {
    		if (newVal !== this._areChoicesVisible) {
    			this._areChoicesVisible = newVal;
    			this.needsDraw = true;
    		}
    	}
    },
    
    _easing: {
    	value: "none"
    },
    easing: {
    	get: function() {
    		return this._easing;
    	},
    	set: function(newVal) {
    		if (newVal !== this._easing) {
    			if (typeof(newVal) === "undefined") {
    				newVal = "none";
    			}
    			this._easing = newVal;
                this.parentTween = this.parentComponent;
                this.parentTween.easing = this.easing;
                this.parentTween.tweenData.easing = this.easing;
                this.parentTween.setKeyframeEase(newVal);
    			this.needsDraw = true;
    		}
    	}
    },
	
	// BEGIN: draw cycle
	prepareForDraw: {
		value: function() {
			this.init();
		}
	},
	
    draw:{
        value: function(){
            var containerWidth , choiceWidth;
            this.element.style.width = this.spanWidth + "px";

            if ((this.spanWidth <= 70) && (this.spanWidth >0)) {
            	    containerWidth = this.spanWidth -18
            	if (containerWidth < 0) {
            		containerWidth = 0;
            	}
            	choiceWidth = containerWidth -3;
            	if (choiceWidth < 0) {
            		choiceWidth = 0;
            	}
            	this.container_easing.style.width = containerWidth + "px";
            	this.easing_choice.style.width = choiceWidth + "px";
            	this.easing_choice.style.overflow = "hidden";
            }
			if (this.spanWidth > 70) {
            	this.container_easing.setAttribute("style", "");
            	this.easing_choice.setAttribute("style", "");
            }
            
            if (this.isHighlighted === true) {
            	this.element.classList.add("spanHighlight");
            } else {
            	this.element.classList.remove("spanHighlight");
            }

            if (this.easing_choice.innerText !== this.easing) {
            	this.easing_choice.innerText = this.easing;
            }
            
        }
    },

	// BEGIN: Controllers
	init: {
		value: function() {
			this.easing_choice.addEventListener("click", this.handleEasingChoiceClick.bind(this), false);
		}
	},
	
    highlightSpan:{
        value: function(){
            this.isHighlighted = true;
        }
    },
    
    handleEasingChoiceClick: {
    	value: function(event) {
            var objPos;
    		event.stopPropagation();
    		this.application.ninja.timeline.easingMenu.anchor = this.easing_choice;
    		this.application.ninja.timeline.easingMenu.currentChoice = event.currentTarget.innerText;

    		function findPos(obj) {
    			var objReturn = {};
    			objReturn.top = 0;
    			objReturn.left = 0;

				if (obj.offsetParent) {

					do {
						objReturn.left += obj.offsetLeft;
						objReturn.top += obj.offsetTop;
	
					} while (obj = obj.offsetParent);
				}
				return objReturn;
			}
			objPos = findPos(event.target);
    		this.application.ninja.timeline.easingMenu.top = objPos.top +38 - (this.application.ninja.timeline.layout_tracks.scrollTop);
    		this.application.ninja.timeline.easingMenu.left = objPos.left+18 - (this.application.ninja.timeline.layout_tracks.scrollLeft);
    		this.application.ninja.timeline.easingMenu.show();
    		this.application.ninja.timeline.easingMenu.callingComponent = this;
    	}
    },
    handleEasingChoicesClick: {
    	value: function(event) {
    		event.stopPropagation();
			
    		this.application.ninja.timeline.easingMenu.popup.contentEl.querySelector(".easing-selected").classList.remove("easing-selected");
    		event.target.classList.add("easing-selected");
    		
    		// Set the easing 
    		this.easing = event.target.dataset.ninjaEase;
            this.parentTween.easing = this.easing;
            this.parentTween.tweenData.easing = this.easing;
    		
    		// Unbind the event handler
    		this.application.ninja.timeline.easingMenu.popup.contentEl.removeEventListener("click");
    		this.hideEasingMenu();
    	}
    },
    hideEasingMenu: {
    	value: function() {
    		this.application.ninja.timeline.easingMenu.hide();
    	}
    }
});
