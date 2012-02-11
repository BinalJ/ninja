/* ComputedStyleSubPanel.js */
var Montage   = require("montage").Montage,
    Component = require("montage/ui/component").Component;


/*

EDITABLE - Methods
- startEdit
- stopEdit
- value
- 
- _suggest
- _suggestNext
- _suggestPrev
- _clearSuggest
- _accept
- _revert
- _setCaret

*/


exports.Editable = Montage.create(Component, {
    hasTemplate: { value: false },

    _element : { value : null },
    element : {
        get : function() {
            return this._element;
        },
        set : function(el) {
            this._element = el;
            this._element.addEventListener('keydown', this, false);
            this._element.addEventListener('input', this, false);
            
            if(this.startOnEvent) {
                this._element.addEventListener(this.startOnEvent, this, false);
            }
            
        }
    },
    _readOnly : {
        value: false
    },
    readOnly : {
        get : function() { return this._readOnly; },
        set : function(makeReadOnly) {
            var action = makeReadOnly ? 'add' : 'remove';
            
            this._element.classList[action](this.readOnlyClass);
            
            if(this.isEditable) {
                this.stop();
            }
            this._readOnly = makeReadOnly;
        }
    },
    _isEditable : {
        value : false
    },
    isEditable : {
        get : function() {
            return this._isEditable;
        },
        set: function(makeEditable) {
            if(this._readOnly && makeEditable) { return false; }
            this._isEditable = makeEditable;
        }
    },
    _isDirty : {
        value: false
    },
    isDirty : {
        get : function() {
            return this._isDirty;
        },
        set : function(setDirty) {
            if(setDirty) {
                this._isDirty = true;
                this._sendEvent('dirty');
            } else {
                this._isDirty = false;
            }
        }
    },
    value : {
        get: function() {
            return this._element.textContent;
        },
        set: function(str) {
            this._element.textContent = str;
        }
    },

    ///// Pre Edit Value
    ///// Value stored when editing starts
    ///// Useful for reverting to previous value
    
    _preEditValue : {
        value : null
    },
    start : {
        value: function() {
            if(!this._readOnly) {
                this._isEditable = this._element.contentEditable = true;
                this._element.classList.add(this.editingClass);
                
                ///// Save the preEditValue
                this._preEditValue = this.value;
                
                if(this.selectOnStart) {
                    this.selectAll();
                }
                
                if(this.stopOnBlur) {
                    console.log('adding mousedown event listener');
                    ///// Simulate blur on editable node by listening to the doc
                    document.addEventListener('mouseup', this, false);
                }
                
                this._sendEvent('start');
            }
            
        }
    },
    stop : {
        value: function() {
            this._isEditable = this._element.contentEditable = false;
            this._element.classList.remove(this.editingClass);
            
            this._sendEvent('stop');
            
            ///// if value is different than pre-edit val, call onchange method
            if(this._preEditValue !== this.value) {
                this._sendEvent('change');
            }
        }
    },
    selectAll : {
        value : function() {
            var range = document.createRange(),
                sel   = window.getSelection();
                
            sel.removeAllRanges();
            range.selectNodeContents(this._element);
            sel.addRange(range);
        }
    },
    setCursor : {
        value : function(position) {
            var index = position,
                range, node, sel;

            ///// argument can be "end" or an index
            if(typeof position === 'string' && position === 'end') {
                index = this.value.length;
            }

            sel = window.getSelection();
            sel.removeAllRanges();
            //debugger;
            node = this._getFirstTextNode();
            range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index);
            sel.addRange(range);
        }
    },
    blur : {
        value : function() {
            if(this._hint) {
                this.accept();
            }
            this.stop();
            document.removeEventListener('mouseup', this, false);
            this._sendEvent('blur');
        }
    },
    
    /* -------------------- User Event Handling -------------------- */
    
    handleKeydown : {
        value : function(e) {
            var k = e.keyCode;
            console.log('keyCode:  ' + k);
        }
    },
    ///// Text input has changed values
    handleInput : {
        value : function(e) {
            if(!this.isDirty) {
                 this.isDirty = true;
             }
            
            this._sendEvent('input');
        }
    },
    handleMouseup : {
        value : function(e) {
            console.log('handle mouse down');
            ///// Listen for simulated blur event
            if(this.stopOnBlur && e._event.target !== this._element) {
                this.blur();
            }
        }
    },
    handleEvent : {
        value : function(e) {
            console.log("event type : " + e._event.type);
            ///// If configured, start on specified event
            if(e._event.type === this.startOnEvent) {
                this.start();
            }
        }
    },
    _sendEvent : {
        value : function(type) {
            var evt = document.createEvent("CustomEvent");
            evt.initCustomEvent(type, true, true);
            this.dispatchEvent(evt);
        }
    },

    /* -------------------- CONFIG -------------------- */
    
    editingClass : {
        value : 'editable'
    },
    readOnlyClass : {
        value : 'readOnly'
    },
    selectOnStart : {
        value : true
    },
    startOnEvent : {
        value : 'dblclick'
    },
    stopOnBlur : {
        value : true
    },
    keyActions : { 
        value : {
            stop   : [27,9,13,186],
            revert : [27],
            backsp : [8]
        }
    }
    
});