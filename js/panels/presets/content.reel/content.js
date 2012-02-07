/* <copyright>
This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
(c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
</copyright> */

var Montage = require("montage/core/core").Montage,
    Component = require("montage/ui/component").Component;

exports.content = Montage.create(Component, {
    hasTemplate: {
        value: true
    },
    contentPanel : {
        value: "presets" // get from local storage
    },
    templateDidLoad : {
        value: function() {
            console.log('deserialized');
        }
    },
    prepareForDraw : {
        value: function() {
            this.activeTab = this.tabs[this.activeTabIndex];

            this.tabBar.addEventListener('click', this, false);
        }
    },
    handleClick : {
        value: function(e) {
            var tabObject = this.tabs.filter(function(item) {
                return item.tab === e._event.target;
            });

            if(tabObject[0]) {
                this.activeTab = tabObject[0];
            }

        }
    },
    _activeTab : {
        value: null,
        enumerable: false
    },
    activeTab : {
        get: function() {
            return this._activeTab;
        },
        set: function(tabObject) {
            this.contentPanel = tabObject.key;

            if(this.activeTab) {
                this._activeTab.tab.classList.remove('active-tab');
            }

            tabObject.tab.classList.add('active-tab');
            this._activeTab = tabObject;
        }
    },
    treeList : {
        value : null
    },
    data2: {
       value: {
        "meta": "Blah",
        "status": "OK",
        "text" : "Root",
        "data" : {
            "date": "1.1.01",
            "text": "Root",
            "children": [{
                "date": "3.3.01",
                "text": "Child 1"
            },
                {
                    "date": "3.3.01",
                    "text": "Child 2",
                    "children": [{
                        "date": "3.4.01",
                        "text": "Grand Child 1",
                        "children": [{
                            "date": "4.4.01",
                            "text": "Great Grand Child 1"
                        }]
                    }]

                },{
                    "date": "5.5.01",
                    "text": "Child 3"
                }]
        }
       }
    },

    didDraw: {
        value : function() {
            console.log('Presets Panel prepare for draw.');
//            this.treeList.items.push({
//                label : "Box Style",
//                type : 'leaf'
//            });
        }
    }


});
