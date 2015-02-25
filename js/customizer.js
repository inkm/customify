(function($, exports){
	/*
	 Simple Javascript undo and redo.
	 https://github.com/ArthurClemens/Javascript-Undo-Manager
	 */
	Array.prototype.removeFromTo = function(from, to) {
		this.splice(from,
			!to ||
			1 + to - from + (!(to < 0 ^ from >= 0) && (to < 0 || -1) * this.length));
		return this.length;
	};

	var UndoManager = function () {
		"use strict";

		var commands = [],
			index = -1,
			limit = 0,
			isExecuting = false,
			callback,

		// functions
			execute;

		execute = function(command, action) {
			if (!command || typeof command[action] !== "function") {
				return this;
			}
			isExecuting = true;

			command[action]();

			isExecuting = false;
			return this;
		};

		return {

			/*
			 Add a command to the queue.
			 */
			add: function (command) {
				if (isExecuting) {
					return this;
				}
				// if we are here after having called undo,
				// invalidate items higher on the stack
				commands.splice(index + 1, commands.length - index);

				commands.push(command);

				// if limit is set, remove items from the start
				if (limit && commands.length > limit) {
					commands.removeFromTo(0, -(limit+1));
				}

				// set the current index to the end
				index = commands.length - 1;
				if (callback) {
					callback();
				}
				return this;
			},

			/*
			 Pass a function to be called on undo and redo actions.
			 */
			setCallback: function (callbackFunc) {
				callback = callbackFunc;
			},

			/*
			 Perform undo: call the undo function at the current index and decrease the index by 1.
			 */
			undo: function () {
				var command = commands[index];
				if (!command) {
					return this;
				}
				execute(command, "undo");
				index -= 1;
				if (callback) {
					callback();
				}
				return this;
			},

			/*
			 Perform redo: call the redo function at the next index and increase the index by 1.
			 */
			redo: function () {
				var command = commands[index + 1];
				if (!command) {
					return this;
				}
				execute(command, "redo");
				index += 1;
				if (callback) {
					callback();
				}
				return this;
			},

			/*
			 Clears the memory, losing all stored states. Reset the index.
			 */
			clear: function () {
				var prev_size = commands.length;

				commands = [];
				index = -1;

				if (callback && (prev_size > 0)) {
					callback();
				}
			},

			hasUndo: function () {
				return index !== -1;
			},

			hasRedo: function () {
				return index < (commands.length - 1);
			},

			getCommands: function () {
				return commands;
			},

			setLimit: function (l) {
				limit = l;
			}
		};
	};

	var undo_manager_timeout = null,
		undoManager = new UndoManager();

	$(document).ready(function(){
		// when the customizer is ready prepare our fields events
		wp.customize.bind('ready', function(){
			var api = this;

			// simple select2 field
			$('.customify_select2' ).select2();

			prepare_typography_field();

			/**
			 * Make the customizer save on CMD/CTRL+S action
			 * This is awesome!!!
			 */
			$(window).bind('keydown', function(event) {
				if (event.ctrlKey || event.metaKey) {
					switch (String.fromCharCode(event.which).toLowerCase()) {
						case 's':
							event.preventDefault();
							api.previewer.save();
							break;
					}
				}
			});

			// for each range input add a value preview output
			$('input[type="range"]' ).each(function(){
				var $clone = $(this).clone();

				$clone
					.attr('type', 'number')
					.attr('class', 'range-value');

				$(this).after( $clone );

				$(this).on('input', function() {
					$(this).siblings('.range-value').val($(this).val());
				});
			});

			// add a reset button for each panel
			$('.panel-meta' ).each(function( el, key ){
				var container = $(this).parents('.control-panel' ),
					id = container.attr('id' ),
					panel_name = id.replace('accordion-panel-', '');

				$(this ).parent().append( '<button class="reset_panel" data-panel="' + panel_name + '">Reset Panel</button>');
			});

			// reset panel
			$( document ).on('click', '.reset_panel', function( e ) {
				e.preventDefault();

				var panel_id = $(this).data('panel' ),
					panel = api.panel( panel_id ),
					sections = panel.sections();

				if ( sections.length > 0 ) {
					$.each( sections, function(){
						//var settings = this.settings();
						var controls = this.controls();

						if ( controls.length > 0 ) {
							$.each( controls, function( key, ctrl ) {
								var this_setting = api( ctrl.id.replace( '_control', '' ) );
								this_setting.set( ctrl.params.defaultValue );
							});
						}
					});
				}
			});

			//add reset section
			$('.accordion-section-content' ).each(function( el, key ){
				var section = $(this).parent();

				var section_id  = section.attr('id' );
				if ( section_id === 'accordion-section-customify_toolbar' ) {
					return;
				}
				if ( typeof section_id !== 'undefined' && section_id.indexOf('accordion-section-' ) > -1 ) {

					var id = section_id.replace('accordion-section-', '' );
					$(this).append( '<button class="reset_section" data-section="' + id + '">Reset Section</button>');
				}
			});

			// reset section event
			$( document ).on('click', '.reset_section', function( e ) {
				e.preventDefault();

				var section_id = $(this).data('section' ),
					section = api.section( section_id ),
					controls = section.controls();

				if ( controls.length > 0 ) {
					$.each( controls, function( key, ctrl ) {
						var this_setting = api( ctrl.id.replace( '_control', '' ) );
						this_setting.set( ctrl.params.defaultValue );
					});
				}
			});

			// customify undo manager
			init_customify_undo_manager();

			var undo_manager_string = sessionStorage.getItem("cutomify_undo_manager" ),
				undo_manager = JSON.parse( undo_manager_string );
			update_toogle_bar_buttons();

			$(document).on('click', '#customize-control-undo_customify button', function() {
				undoManager.undo();
				//var undo_manager_string = sessionStorage.getItem("cutomify_undo_manager" ),
				//	undo_manager = JSON.parse( undo_manager_string );
				//
				//
				//var step = undo_manager.steps[undo_manager.current_step];
				//
				//var setting = api( step.id );
				//
				//setting.set( step.old_value );

				////update_toogle_bar_buttons( undo_manager );
				//undo_manager = JSON.stringify( undo_manager );
				//sessionStorage.setItem("cutomify_undo_manager", undo_manager);
			});

			$(document ).on('click', '#customize-control-redo_customify button', function() {
					undoManager.redo();
			});
		});

		wp.customize.bind('change', function( setting ){

			var id = setting.id,
				new_value = setting(),
				old_value = _wpCustomizeSettings.settings[id].value;

				if ( undo_manager_timeout !== null ){
					clearTimeout(undo_manager_timeout);
					undo_manager_timeout = null;
				} else {
					undo_manager_timeout = setTimeout( function(){
						var undo_manager_string = sessionStorage.getItem("cutomify_undo_manager" ),
							undo_manager = JSON.parse( undo_manager_string );

						var step = { id: id, old_value: old_value, new_value: new_value };

						undo_manager.steps.push(step);
						undo_manager.current_step++;

						// make undo-able
						undoManager.add({
							undo: function() {
								var undo_manager_string = sessionStorage.getItem("cutomify_undo_manager" ),
									undo_manager = JSON.parse( undo_manager_string );

								if ( undo_manager.steps !== null && undo_manager.steps.length > 1 ) {
									undo_manager.current_step--;
									step = undo_manager.steps[undo_manager.current_step];
									var setting = wp.customize( step.id );
									setting.set( step.old_value );

								}
							},
							redo: function() {
								undo_manager.current_step++;
							}
						});

						update_toogle_bar_buttons();

						undo_manager = JSON.stringify( undo_manager );
						sessionStorage.setItem("cutomify_undo_manager", undo_manager);

						_wpCustomizeSettings.settings[id].value = new_value;
						undo_manager_timeout = null;
					},1000);
				}
		});

		$(document).on('change', '.customize-control input.range-value', function() {
			var range = $(this).siblings('input[type="range"]');
			range.val($(this ).val());
		});

		// get each typography field and bind events
		var prepare_typography_field = function() {

			var $typos = $('.customify_typography_font_family' );

			$typos.each(function(){
				var font_family_select = this,
					$input = $(font_family_select).siblings('.customify_typography_values');
				// on change
				$(font_family_select).on('change',function(){
					update_siblings_selects( font_family_select );
					$input.trigger('change');
				});
				update_siblings_selects( font_family_select );
			});
		};

		$(document).on('change', '.customify_typography_font_subsets',function(ev){

			var $input = $(this).parents('.options').siblings('.customify_typography').children('.customify_typography_values'),
				current_val =  $input.val();

			current_val = JSON.parse( current_val );
			current_val.selected_subsets = $(this).val();

			$input.val( JSON.stringify( current_val ) );

			$input.trigger('change');
		});

		$(document).on('change', '.customify_typography_font_weight', function(ev){

			var $input = $(this).parents('.options').siblings('.customify_typography').children('.customify_typography_values' ),
				current_val =  $input.val();

			current_val = JSON.parse( current_val );
			// @todo currently the font weight selector works for one value only
			// maybe make this a multiselect
			current_val.selected_variants = { 0: $(this).val() };

			$input.val(  JSON.stringify( current_val ) );
			$input.trigger('change');
		});

		var update_siblings_selects = function ( font_select  ) {

			this.bound_once = false;
			var selected_font = $(font_select).val(),
				$input = $(font_select).siblings('.customify_typography_values' ),
				current_val = $input.val();

			if ( typeof current_val === '' ){
					return;
			}

			var $font_weight = $(font_select ).parent().siblings('ul.options').find('.customify_typography_font_weight');
			var $font_subsets = $(font_select).parent().siblings('ul.options').find('.customify_typography_font_subsets');

			try {
				current_val = JSON.parse( current_val );
			} catch (e) {
				// in case of an error, force the rebuild of the json
				if ( typeof $(font_select).data('bound_once') === "undefined" ) {

					$(font_select).data('bound_once', true);
					//var api = wp.customize;
					//api.previewer.refresh();

					$(font_select).change();
					$font_weight.change();
					$font_subsets.change();
				}
			}

			var option_data = $(font_select).find( 'option[value="' + selected_font + '"]' );

			if ( option_data.length > 0  ) {

				var font_type = option_data.data('type' ),
					value_to_add = { 'type': font_type, 'font_family': selected_font},
					variants = null,
					subsets = null;

				if ( font_type == 'std' ) {
					variants = {0: '100', 1: '200', 3: '300', 4: '400', 5: '500'};
				} else {
					variants = $( option_data[0] ).data('variants' );
					subsets = $( option_data[0] ).data('subsets');
				}

				// make the variants selector
				if ( variants !== null && typeof $font_weight !== "undefined" ) {

					value_to_add['variants'] = variants;
					// when a font is selected force the first weight to load
					value_to_add['selected_variants'] = { 0: variants[0] };

					var variants_options = '',
						count_weights = 0;

					$.each(variants, function(key, el){
						var is_selected = '';
						if ( typeof current_val.selected_variants === "object" && inObject( el, current_val.selected_variants ) ) {
							is_selected = ' selected="selected"';
						}

						variants_options += '<option value="' + el + '"' + is_selected + '>' +el + '</option>';
						count_weights++;
					});
					$font_weight.html(variants_options);
					// if there is no weight or just 1 we hide the weight select ... cuz is useless
					if ( count_weights <= 1 ) {
						$font_weight.parent().hide();
					} else {
						$font_weight.parent().show();
					}
				}

				// make the subsets selector
				if ( subsets !== null && typeof $font_subsets !== "undefined" ) {
					value_to_add['subsets'] = subsets;
					// when a font is selected force the first subset to load
					value_to_add['selected_subsets'] = { 0: subsets[0] };
					var subsets_options = '',
						count_subsets = 0;
					$.each(subsets, function(key, el){
						var is_selected = '';
						if ( typeof current_val.selected_subsets === "object" && inObject( el, current_val.selected_subsets ) ) {
							is_selected = ' selected="selected"';
						}

						subsets_options += '<option value="' + el + '"'+is_selected+'>' +el + '</option>';
						count_subsets++;
					});

					$font_subsets.html(subsets_options);

					// if there is no subset or just 1 we hide the subsets select ... cuz is useless
					if ( count_subsets <= 1 ) {
						$font_subsets.parent().hide();
					} else {
						$font_subsets.parent().show();
					}
				}

				$input.val( JSON.stringify( value_to_add ) );
			}
		};

		var get_typography_font_family = function( $el ) {

			var font_family_value = $el.val();
			// first time this will not be a json so catch that error
			try {
				font_family_value = JSON.parse( font_family_value );
			} catch (e) {
				return {font_family: font_family_value};
			}

			if ( typeof font_family_value.font_family !== 'undefined' ) {
				return font_family_value.font_family;
			}

			return false;
		};


		function init_customify_undo_manager() {
			try {
				var current = sessionStorage.getItem("cutomify_undo_manager");

				if ( current === null ) {
					var init_value =  { current_step: 0, steps: [] };

					init_value.steps.push('0');

					sessionStorage.setItem("cutomify_undo_manager", JSON.stringify( init_value ));
				}

			} catch (e) {
				return false;
			}
		}

		function update_toogle_bar_buttons() {
			if ( undoManager.hasUndo() ) {
				$('#customize-control-undo_customify button' ).removeAttr('disabled');
			}

			if ( undoManager.hasRedo() ) {
				$('#customize-control-redo_customify button' ).removeAttr('disabled');
			}
		}
	});

	/**
	 * Function to check if a value exists in an object
	 * @param value
	 * @param obj
	 * @returns {boolean}
	 */
	var inObject = function( value, obj ) {
		for (var k in obj) {
			if (!obj.hasOwnProperty(k)) continue;
			if (obj[k] === value) {
				return true;
			}
		}
		return false;
	};
})(jQuery, window);