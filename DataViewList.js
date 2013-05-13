define([
	"dojo/_base/kernel", // kernel.isAsync
	"dojo/_base/array", // array.forEach array.indexOf array.map
	"dojo/_base/declare", // declare
	"dojo/_base/html", // Deferred
	"dojo/_base/connect",
	"dojo/_base/event", // event.stop
	"dojo/_base/lang", // lang.mixin lang.hitch
	"dojo/_base/window",
	"dojo/_base/json",
	"dojo/query", // Query
	"dojo/dom", // attr.set
	"dojo/dom-attr", // attr.set
	"dojo/dom-class", // domClass.add domClass.contains
	"dojo/dom-style", // domStyle.set
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/i18n", // i18n.getLocalization
	"dojo/keys",
	"dojo/on",
	"dojo/ready",
	"dojo/cache",
	"dojo/text",
	"dojo/data/util/filter", 
	"dojo/date/locale",
	"dojo/data/ItemFileWriteStore",
	"dojo/store/DataStore",
	"dojo/_base/fx", 
	"dojo/fx",
	"dojo/fx/easing", 
	"dojox/fx",
	"dojox/fx/flip",
	"dijit/_base/wai",
	"dijit/_base/manager",	// manager.defaultDuration
	"dijit/a11y",
	"dijit/focus",
	"dijit/_Widget",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/_CssStateMixin",
	"dijit/_Container",
	"dijit/layout/ContentPane",
	"dijit/TitlePane", 
	"dijit/form/Button",
	"dijit/form/TextBox",
	"dijit/form/Select",
	"dojo/text!./templates/DataViewList.html",
	"dojo/text!./templates/DataViewListItem.html"
], function(kernel, array, declare, htmlUtil, connectUtil, event, lang, winUtil, json,
		query, dom, domAttr, domClass, domStyle, domConstruct, domGeom, 
		i18n, keys, on, ready, cache, text, filterUtil, locale, ItemFileWriteStore, DataStore,
		baseFx, coreFx, easingUtil, dojoxFx, flip, wai, manager, a11y, focus, 
		_Widget, _TemplatedMixin, _WidgetsInTemplateMixin, _CssStateMixin, _Container, ContentPane, TitlePane, 
		Button, TextBox, Select,
		template, itemTemplate){
	
	var _Animation = {};
	lang.mixin(_Animation, {
		_split: function(/*Object*/ args){
			args.rows = args.rows || 3;
			args.columns = args.columns || 3;
			args.duration = args.duration || 1000;
	
			var node = args.node = dom.byId(args.node),
				parentNode = node.parentNode,
				pNode = parentNode,
				body = winUtil.body(),
				_pos = "position";
	
			while(pNode && pNode != body && htmlUtil.style(pNode, _pos) == "static"){
				pNode = pNode.parentNode;
			}
	
			var pCoords = pNode != body ? domGeom.position(pNode, true) : { x: 0, y: 0 },
				coords = domGeom.position(node, true),
				nodeHeight = htmlUtil.style(node, "height"),
				nodeWidth = htmlUtil.style(node, "width"),
				hBorder = htmlUtil.style(node, "borderLeftWidth") + htmlUtil.style(node, "borderRightWidth"),
				vBorder = htmlUtil.style(node, "borderTopWidth") + htmlUtil.style(node, "borderBottomWidth"),
				pieceHeight = Math.ceil(nodeHeight / args.rows),
				pieceWidth = Math.ceil(nodeWidth / args.columns),
				container = domConstruct.create(node.tagName, {
					style: {
						position: "absolute",
						padding: 0,
						margin: 0,
						border:"none",
						top: coords.y - pCoords.y + "px",
						left: coords.x - pCoords.x + "px",
						height: nodeHeight + vBorder + "px",
						width: nodeWidth + hBorder + "px",
						background: "none",
						overflow: args.crop ? "hidden" : "visible",
						zIndex: htmlUtil.style(node, "zIndex")
					}
				}, node, "after"),
				animations = [],
				pieceHelper = domConstruct.create(node.tagName, {
					style: {
						position: "absolute",
						border: "none",
						padding: 0,
						margin: 0,
						height: pieceHeight + hBorder + "px",
						width: pieceWidth + vBorder + "px",
						overflow: "hidden"
					}
				});
	
			for(var y = 0, ly = args.rows; y < ly; y++){
				for(var x = 0, lx = args.columns; x < lx; x++){
					var piece = lang.clone(pieceHelper),
						pieceContents = lang.clone(node),
						pTop = y * pieceHeight,
						pLeft = x * pieceWidth;
	
					pieceContents.style.filter = "";
					domAttr.remove(pieceContents, "id");
	
					htmlUtil.style(piece, {
						border: "none",
						overflow: "hidden",
						top: pTop + "px",
						left: pLeft + "px"
					});
					htmlUtil.style(pieceContents, {
						position: "static",
						opacity: "1",
						marginTop: -pTop + "px",
						marginLeft: -pLeft + "px"
					});
					piece.appendChild(pieceContents);
					container.appendChild(piece);
	
					var pieceAnimation = args.pieceAnimation(piece, x, y, coords);
					if(lang.isArray(pieceAnimation)){
						animations = animations.concat(pieceAnimation);
					}else{
						animations.push(pieceAnimation);
					}
				}
			}
			var anim = coreFx.combine(animations);
			connectUtil.connect(anim, "onEnd", anim, function(){
				container.parentNode.removeChild(container);
			});
			if(args.onPlay){
				connectUtil.connect(anim, "onPlay", anim, args.onPlay);
			}
			if(args.onEnd){
				connectUtil.connect(anim, "onEnd", anim, args.onEnd);
			}
			return anim;
		},
		
		blockFadeOut: function(/*Object*/ args){
			var node = args.node = dom.byId(args.node);
	
			args.rows = args.rows || 5;
			args.columns = args.columns || 5;
			args.duration = args.duration || 1000;
			args.interval = args.interval || args.duration / (args.rows + args.columns * 2);
			args.random = args.random || 0;
			var random = Math.abs(args.random),
				duration = args.duration - (args.rows + args.columns) * args.interval;
	
			args.pieceAnimation = function(piece, x, y, coords){
				var randomDelay = Math.random() * args.duration,
					uniformDelay = (args.reverseOrder) ?
						(((args.rows + args.columns) - (x + y)) * Math.abs(args.interval)) :
						((x + y) * args.interval),
					delay = randomDelay * random + Math.max(1 - random, 0) * uniformDelay,
					pieceAnimation = baseFx.animateProperty({
						node: piece,
						duration: duration,
						delay: delay,
						easing: (args.easing || easingUtil.sinInOut),
						properties: {
							opacity: (args.unhide ? {start: "0", end: "1"} : {start: "1", end: "0"})
						},
						beforeBegin: (args.unhide ? function(){ htmlUtil.style(piece, { opacity: "0" });} : function(){ piece.style.filter = ""; })
					});
	
				return pieceAnimation;
			};
			var anim = _Animation._split(args);
			if(args.unhide){
				connectUtil.connect(anim, "onEnd", anim, function(){
					htmlUtil.style(node, { opacity: "1" });
				});
			}else{
				connectUtil.connect(anim, "onPlay", anim, function(){
					htmlUtil.style(node, { opacity: "0" });
				});
			}
			return anim;
		},
	
		blockFadeIn: function(/*Object*/ args){
			args.unhide = true;
			return _Animation.blockFadeOut(args);
		}
	});
	
	var _ComplexStore = declare("dataview/ComplexStore", [ItemFileWriteStore], {
	
		_containsValue: function(/*dojo/data/api/Item*/ item, /*attribute-name-string */ attribute, /*anything*/ value,
				/*String|RegExp?*/ regexp){
			return array.some(this.getValues(item, attribute), function(possibleValue){
				if(lang.isString(regexp)){
					return eval(regexp);
				}else if(possibleValue !== null && !lang.isObject(possibleValue) && regexp){
					if(possibleValue.toString().match(regexp)){
						return true; // Boolean
					}
				} else if(value === possibleValue){
					return true; // Boolean
				} else {
					return false;
				}
			});
		},
	
		filter: function(requestArgs, arrayOfItems, findCallback){
			var items = [];
			if(requestArgs.query){
				var query = json.fromJson(json.toJson(requestArgs.query));
				if(typeof query == "object" ){
					var count = 0;
					var p;
					for(p in query){
						count++;
					}
					if(count > 1 && query.complexQuery){
						var cq = query.complexQuery;
						var wrapped = false;
						for(p in query){
							if(p !== "complexQuery"){
								if(!wrapped){
									cq = "( " + cq + " )";
									wrapped = true;
								}
								var v = requestArgs.query[p];
								if(lang.isString(v)){
									v = "'" + v + "'";
								}
								cq += " AND " + p + ":" + v;
								delete query[p];
							}
						}
						query.complexQuery = cq;
					}
				}
	
				var ignoreCase = requestArgs.queryOptions ? requestArgs.queryOptions.ignoreCase : false;
				if(typeof query != "string"){
					query = json.toJson(query);
					query = query.replace(/\\\\/g,"\\"); //counter toJson expansion of backslashes, e.g., foo\\*bar test.
				}
				query = query.replace(/\\"/g,"\"");   //ditto, for embedded \" in lieu of " availability.
				var complexQuery = lang.trim(query.replace(/{|}/g,"")); //we can handle these, too.
				var pos2, i;
				if(complexQuery.match(/"? *complexQuery *"?:/)){ //case where widget required a json object, so use complexQuery:'the real query'
					complexQuery = lang.trim(complexQuery.replace(/"?\s*complexQuery\s*"?:/,""));
					var quotes = ["'",'"'];
					var pos1,colon;
					var flag = false;
					for(i = 0; i<quotes.length; i++){
						pos1 = complexQuery.indexOf(quotes[i]);
						pos2 = complexQuery.indexOf(quotes[i],1);
						colon = complexQuery.indexOf(":",1);
						if(pos1 === 0 && pos2 != -1 && colon < pos2){
							flag = true;
							break;
						} //first two sets of quotes don't occur before the first colon.
					}
					if(flag){	//dojo.toJson, and maybe user, adds surrounding quotes, which we need to remove.
						complexQuery = complexQuery.replace(/^\"|^\'|\"$|\'$/g,"");
					}
				} //end query="{complexQuery:'id:1* || dept:Sales'}" parsing (for when widget required json object query).
				var complexQuerySave = complexQuery;
				//valid logical operators.
				var begRegExp = /^>=|^<=|^<|^>|^,|^NOT |^AND |^OR |^\(|^\)|^!|^&&|^\|\|/i; //trailing space on some tokens on purpose.
				var sQuery = ""; //will be eval'ed for each i-th candidateItem, based on query components.
				var op = "";
				var val = "";
				var pos = -1;
				var err = false;
				var key = "";
				var value = "";
				var tok = "";
				pos2 = -1;
				for(i = 0; i < arrayOfItems.length; ++i){
					var match = true;
					var candidateItem = arrayOfItems[i];
					if(candidateItem === null){
						match = false;
					}else{
						complexQuery = complexQuerySave; //restore query for next candidateItem.
						sQuery = "";
						while(complexQuery.length > 0 && !err){
							op = complexQuery.match(begRegExp);
							while(op && !err){ //look for leading logical operators.
								complexQuery = lang.trim(complexQuery.replace(op[0],""));
								op = lang.trim(op[0]).toUpperCase();
								//convert some logical operators to their javascript equivalents for later eval.
								op = op == "NOT" ? "!" : op == "AND" || op == "," ? "&&" : op == "OR" ? "||" : op;
								op = " " + op + " ";
								sQuery += op;
								op = complexQuery.match(begRegExp);
							}//end op && !err
							if(complexQuery.length > 0){
								var opsRegex = /:|>=|<=|>|</g,
									matches = complexQuery.match(opsRegex),
									match = matches && matches.shift(),
									regex;
	
								pos = complexQuery.indexOf(match);
								if(pos == -1){
									err = true;
									break;
								}else{
									key = lang.trim(complexQuery.substring(0,pos).replace(/\"|\'/g,""));
									complexQuery = lang.trim(complexQuery.substring(pos + match.length));
									tok = complexQuery.match(/^\'|^\"/);	//quoted?
									if(tok){
										tok = tok[0];
										pos = complexQuery.indexOf(tok);
										pos2 = complexQuery.indexOf(tok,pos + 1);
										if(pos2 == -1){
											err = true;
											break;
										}
										value = complexQuery.substring(pos + match.length,pos2);
										if(pos2 == complexQuery.length - 1){ //quote is last character
											complexQuery = "";
										}else{
											complexQuery = lang.trim(complexQuery.substring(pos2 + 1));
										}
										if (match != ':') {
											regex = this.getValue(candidateItem, key) + match + value;
										} else {
											regex = filterUtil.patternToRegExp(value, ignoreCase);
										}
										sQuery += this._containsValue(candidateItem, key, value, regex);
									}
									else{ //not quoted, so a space, comma, or closing parens (or the end) will be the break.
										tok = complexQuery.match(/\s|\)|,/);
										if(tok){
											var pos3 = new Array(tok.length);
											for(var j = 0;j<tok.length;j++){
												pos3[j] = complexQuery.indexOf(tok[j]);
											}
											pos = pos3[0];
											if(pos3.length > 1){
												for(var j=1;j<pos3.length;j++){
													pos = Math.min(pos,pos3[j]);
												}
											}
											value = lang.trim(complexQuery.substring(0,pos));
											complexQuery = lang.trim(complexQuery.substring(pos));
										}else{ //not a space, so must be at the end of the complexQuery.
											value = lang.trim(complexQuery);
											complexQuery = "";
										} //end  inner if(tok) else
										if (match != ':') {
											regex = this.getValue(candidateItem, key) + match + value;
										} else {
											regex = filterUtil.patternToRegExp(value, ignoreCase);
											console.log("regex value: ", value, " regex pattern: ", regex);
										}
										sQuery += this._containsValue(candidateItem, key, value, regex);
									} //end outer if(tok) else
								} //end found ":"
							} //end if(complexQuery.length > 0)
						} //end while complexQuery.length > 0 && !err, so finished the i-th item.
						match = eval(sQuery);
					} //end else is non-null candidateItem.
					if(match){
						items.push(candidateItem);
					}
				} //end for/next of all items.
				if(err){
					//soft fail.
					items = [];
					console.log("The store's _fetchItems failed, probably due to a syntax error in query.");
				}
			}else{
				for(var i = 0; i < arrayOfItems.length; ++i){
					var item = arrayOfItems[i];
					if(item !== null){
						items.push(item);
					}
				}
			} //end if there is a query.
			findCallback(items, requestArgs);
		} //end filter function
	
	});
	
	var _DataViewListItem = declare("dataview/_DataViewListItem", [_Widget, _TemplatedMixin, _CssStateMixin], {
		
		templateString: null,
		selected: false,
		baseClass: "dataViewListItem",
		
		animating: false,
		
		postMixInProperties: function(){
			this.inherited(arguments);
		},

		postCreate: function(){
			this.inherited(arguments);
			domStyle.set(this.domNode, "zIndex", 1000);
		},
		
		getSelected: function(){
			return this.selected;
		},
		
		_onFocus: function(){
			//TODO
		},
		
		_onBlur: function(){
			// this.selected = false;
			// this.updateParent(false);
		},
		
		_onClick: function(e){
			this.selected = !this.selected;
			
			var dataViewList = this.getParent();
			if(dataViewList.singleSelection){
				var cItems = dataViewList.getChildren();
				array.forEach(cItems, lang.hitch(this, function(cItem){
					(cItem != this) && cItem.set("selected", false);
				}));
				if(this.selected){
					dataViewList.selectedItems = [this];
				}else{
					dataViewList.selectedItems = [];
				}
			}else{
				if(this.selected){
					dataViewList.selectedItems.push(this);
				}else{
					dataViewList.selectedItems = array.filter(dataViewList.selectedItems, lang.hitch(this, function(item){
				      return item != this;
				    }));
				}
			}
			
			this.updateParent(this.selected);
		},
		
		_onGotoDetailClick: function(e){
			var parentWidget = this.getParent();
			if(this.animating || !parentWidget.itemAnimation){return;}
			this.animating = true;
			domStyle.set(this.domNode, "zIndex", 2000);
			var anim = flip[parentWidget.itemAnimation]({ 
				node: this.domNode,
				dir: "right",
				depth: .5,
				duration: 500
			});
			connectUtil.connect(anim, "onEnd", this, function(){ 
				//TODO
				domStyle.set(this.dataViewMainNode, "display", "none");
				domStyle.set(this.dataViewDetailDescNode, "display", "");
				
				this.animating = false;
			});
			anim.play();
			event.stop(e);
		},
		
		_onGotoMainClick: function(e){
			var parentWidget = this.getParent();
			if(this.animating || !parentWidget.itemAnimation){return;}
			this.animating = true;
			domStyle.set(this.domNode, "zIndex", 1000);
			var anim = flip[parentWidget.itemAnimation]({ 
				node: this.domNode,
				dir: "left",
				depth: .5,
				duration: 500
			});
			connectUtil.connect(anim, "onEnd", this, function(){ 
				//TODO
				domStyle.set(this.dataViewMainNode, "display", "");
				domStyle.set(this.dataViewDetailDescNode, "display", "none");
				
				this.animating = false;
			});
			anim.play();
			event.stop(e);
		},
		
		updateParent: function(showDetailPopup){
			var dataViewList = this.getParent();
			dataViewList.updateWidget(this, showDetailPopup);
		}
	});

	return declare("dataview/DataViewList", [TitlePane, _Container], {
		url: "",
		data: null,
		store: null,
		items: null,
		queryParams: {},
		sortParams: [],
		
		animation: false,
		
		filterProps: ["name"],
		customFilterNode: "",
		
		sortProps: ["name"],
		customSortNode: "",
		
		selectedItems: [],
		singleSelection: false,
		
		contentHeight: 500,
		showPopupDetails: false,
		
		itemTemplate: itemTemplate,
		itemWidth: 150,
		itemHeight: 100,
		itemGap: 20,
		itemPositions: {},
		itemAnimation: "", //"", "flip", "flipCube"
		
		switchModeBatch: false,

		templateString: template,
		
		postMixInProperties: function(){
			this.inherited(arguments);
			if(this.url){
				this.store = new _ComplexStore({url:this.url});
			}else if(this.data){
				this.store = new _ComplexStore({data:this.data});
			}else{
				this.store = new _ComplexStore({data: {
				    "items": []
				}});
			}
			
			this.currentSortProp = "";
			this.currentSortMode = "normal";
		},
		
		buildRendering: function(){
			this.inherited(arguments);
		},

		postCreate: function(){
			this.inherited(arguments);
			
			//title
			domAttr.set(this.titleDescNode, "innerHTML", "(No item selected)");
			
			//filter
			if(lang.isArray(this.filterProps)){
				var filterContainer = domConstruct.create("span", {
					className: "filterContainer"
				}, dom.byId(this.customFilterNode) || this.filterNode);
				domConstruct.create("span", {
					innerHTML: "Filter: "
				}, filterContainer);
				var propInput = new TextBox({
					placeHolder: "input filter",
					intermediateChanges: true,
					onChange: lang.hitch(this, function(value){
						array.forEach(this.filterProps, function(prop){
							this.queryParams[prop] = "*" + value + "*";
						}, this);
						this.filter(this.queryParams);
					})
				});
				filterContainer.appendChild(propInput.domNode);
				
				var cleanFilter = new Button({
					label: "Clean",
					onClick: lang.hitch(this, function(){
						propInput.set("value", "");
					})
				});
				filterContainer.appendChild(cleanFilter.domNode);
			}
			
			//sort
			if(lang.isArray(this.sortProps)){
				var sortContainer = domConstruct.create("span", {
					className: "sortContainer"
				}, dom.byId(this.customSortNode) || this.sortNode);
				domConstruct.create("span", {
					innerHTML: "Sort By: "
				}, sortContainer);
				var options = [{ label: "N/A", value: "none", selected: true}];
				array.forEach(this.sortProps, function(prop){
					options.push({ label: prop, value: prop});
				}, this);
				var propSelect = new Select({
					options: options,
					onChange: lang.hitch(this, function(prop){
						this.currentSortProp = prop;
						this.processSort();
					})
				});
				sortContainer.appendChild(propSelect.domNode);
				
				var propSelectSortMode = new Select({
					options: [{label: "N/A", value: "none", selected:true},{label: "Ascending", value: "ascending"},{label: "Descending", value: "descending"}],
					onChange: lang.hitch(this, function(sortMode){
						this.currentSortMode = sortMode;
						this.processSort();
					})
				});
				sortContainer.appendChild(propSelectSortMode.domNode);
			}
			
			//switch mode
			if(this.switchModeBatch){
				this.gotoDetailBatch = new Button({
					label: "Switch",
					onClick: lang.hitch(this, function(){
						var method = this.detailMode ? "_onGotoMainClick" : "_onGotoDetailClick";
						array.forEach(this.getChildren(), function(item){
							item[method]();
						})
						this.detailMode = !this.detailMode;
					})
				});
				this.gotoDetailBatch.placeAt(this.switchModeNode);
			}
			
			domStyle.set(this.containerNode, "height", (this.contentHeight) || 500 + "px");
		},
	
		fetch: function(request){
			request = request || {};
			request.onComplete = lang.hitch(this, "onComplete");
			request.onError = lang.hitch(this, "onError");
			return this.store.fetch(request);
		},
		
		filter: function(query){
			this.queryParams = query || this.queryParams;
			return this.handleResult();
		},
		
		processSort: function(){
			var sortProp = {};
			if(this.currentSortProp == "none"){
				//TODO
			}else{
				sortProp["attribute"] = this.currentSortProp;
			}
			
			if(this.currentSortMode == "none"){
				//TODO
			}else{
				sortProp[this.currentSortMode] = true;
			}
			
			this.sortParams[0] = sortProp;
			this.sort(this.sortParams);
		},
		
		sort: function(sort){
			this.sortParams = sort || this.sortParams;
			return this.handleResult();
		},
		
		handleResult: function(){
			var complexQuery = "", first = true;
			for(var key in this.queryParams){
				complexQuery += (first?" ":" OR ") + key + ": '" + this.queryParams[key] + "' ";
				first = false;
			}
			return this.fetch({ query: complexQuery, sort: this.sortParams, queryOptions: {ignoreCase: true}});
		},

		onError: function(){
			this.items = [];
			this.render();
		},

		onComplete: function(items, request){
			this.items = items||[];
			this.render();
		},
		
		clearData: function(){
			this.destroyDescendants();
		},
		
		render: function(){
			this.destroyDescendants();
			if(this.items.length <= 0){
				domClass.add(this.containerNode, "emptyContent");
				this.containerNode.innerHTML = "Sorry, No item matched"
			}else{
				//animation
				if(this.animation){
					domStyle.set(this.containerNode, {
						position: "relative"
					});
					var pos = domGeom.position(this.containerNode);
					this.rowItemNum = parseInt((pos.w-this.itemGap*2)/(this.itemWidth+this.itemGap*2));
				}
				
				domClass.remove(this.containerNode, "emptyContent");
				array.forEach(this.items, function(item, index){
					var attrs = this.store.getAttributes(item);
					var initItem = {};
					initItem["templateString"] = this.itemTemplate;
					array.forEach(attrs, function(attr){
						if(attr == "id"){return;}
						initItem[attr] = this.store.getValue(item, attr);
					}, this);
					var fvListItem = null;
						
					try{
						fvListItem = new _DataViewListItem(initItem);
					}catch(e){
						console.log(e.message);
					}
					
					this.addChild(fvListItem);
					domStyle.set(fvListItem.domNode, {
						width: this.itemWidth + "px",
						height: this.itemHeight + "px"
					});
					
					//animation
					if(this.animation){
						//origin position
						var identity = this.store.getIdentity(item);
						var originPosition = this.itemPositions[identity] ? this.itemPositions[identity] : {x: 10, y: 10};
						domStyle.set(fvListItem.domNode, {
							position: "absolute",
							left: originPosition.x + "px",
							top: originPosition.y + "px"
						});
						
						var position = this.getItemPosition(index);
						dojoxFx.slideBy({node:fvListItem.domNode, left:position.x-originPosition.x, top:position.y-originPosition.y, duration:1000}).play();
						this.itemPositions[identity] = position;
					}
				}, this);
			}
		},
		
		getItemPosition: function(index){
			var position = {x:10, y: 10};
			position.x += (index % this.rowItemNum) * (this.itemWidth + this.itemGap*2);
			position.y += parseInt(index / this.rowItemNum) * (this.itemHeight + this.itemGap*2);
			return position;
		},
		
		getSelectedItems: function(){
			return this.selectedItems;
		},
		
		updateWidget: function(dvListItem, showDetailPopup){
			this.selectItem = dvListItem.selected ? dvListItem : null;
			var titleDesc = "";
			if(this.selectedItems.length){
				titleDesc += "Selected Items: ";
				array.forEach(this.selectedItems, lang.hitch(this, function(item){
					titleDesc += item["name"] + " . ";
				}));
				
			}else{
				titleDesc = "(No item selected)";
			}
			domAttr.set(this.titleDescNode, "innerHTML", titleDesc);
			
			this.showPopupDetails && this.updateDetailPopup(dvListItem, showDetailPopup);
		},
		
		updateDetailPopup: function(dvListItem, showDetailPopup){
			if(this.popupAnimating){
				return false;
			}
			
			domConstruct.empty(this.detailPopupNode);
			domStyle.set(this.detailPopupNode, {
				opacity: "0",
				filter: "alpha(opacity=0)"
			});
			
			if(showDetailPopup){
				this.popupAnimating = true;
				for(var prop in dvListItem.params){
					if(prop == "image"){
						var imgDiv = domConstruct.create("div", {
							className: "popupImageDiv"
						}, this.detailPopupNode, "first");
						domConstruct.create("img", {
							src: dvListItem.params[prop],
							className: "popupImage"
						}, imgDiv);
						domConstruct.create("hr", {}, imgDiv, "after");
					}else if(prop == "templateString"){
						//TODO
					}else{
						domConstruct.create("div", {
							className: "popupInfoHeaderDiv",
							innerHTML: prop + ":"
						}, this.detailPopupNode);
						domConstruct.create("div", {
							className: "popupInfoDiv",
							innerHTML: dvListItem.params[prop]
						}, this.detailPopupNode);
					}
				}
			
				//start animation
				var properties = {
					node: this.detailPopupNode,
					rows: 1,
					columns: 10
				};
				this.currentAnimation = _Animation.blockFadeIn(lang.mixin(properties, {
					onEnd: lang.hitch(this, function(){
						this.popupAnimating = false;
					})
				}));
				this.currentAnimation.play();
			}
		}
	});
	
});
