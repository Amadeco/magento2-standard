define([
    'jquery',
    'underscore',
    'imagerotator'
], function ($) {
    'use strict';

    var mixin = {

        initialize: function(config, element) {
            this._super(config, element);
        },

        handleFotorama: function(e, fotorama) {
            var spinFrame = fotorama.activeFrame.$stageFrame;
            if (spinFrame.hasClass('webrotate360'))
                return;

            var spinWrap = spinFrame.find('.wr360wrap');

            if (spinWrap.length == 1) {
                spinFrame.addClass('webrotate360');
                spinWrap.html("<div id='wr360PlayerId' style='height:100%;'></div>");
                spinWrap.on('pointerdown touchstart mousedown click mousemove touchmove mouseup', function(e) {
					e.stopPropagation();
                });

				spinWrap.on('pointerdown mousedown', this.disableFocusClick);
				
                var cfg = __WR360Config;
                var ir = WR360.ImageRotator.Create("wr360PlayerId");
                var self = this;

                ir.settings.graphicsPath = cfg.graphicsPath;
                ir.settings.configFileURL = this.selectedSimpleConfig ? this.selectedSimpleConfig.confFileURL : cfg.confFileURL;
                ir.settings.rootPath = this.selectedSimpleConfig ? this.selectedSimpleConfig.rootPath : cfg.rootPath;
                ir.settings.googleEventTracking  = cfg.useAnalytics;
                ir.licenseFileURL = cfg.licensePath;

                ir.settings.apiReadyCallback = function(api, isFullscreen) {
					spinWrap.off('pointerdown mousedown', self.disableFocusClick);
					
                    if (cfg.apiCallback.length > 0) {
                        var fn = window[cfg.apiCallback];
                        if (typeof fn === 'function')
                            fn(api, isFullscreen);
                    }

                    if (isFullscreen)
                        return;

                    $(e.target).on('fotorama:fullscreenenter fotorama:fullscreenexit fotorama:showend', function() {
                        api.updateDimensions();
                    });

                    function onFullScreenChange() {
                        var fsElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
                        if (!fsElement && fotorama.fullScreen) {
                            setTimeout(function() {
                                api.updateDimensions()
                            }, 100);
                        }
                    }

                    // Subscribe to fullscreen change so we can update viewer dimensions on viewer's monitor fullscreen exit,
                    // as fotorama slightly changes its expanded "fullScreen" gallery layout when system fullscreen is triggered (for some reason).

                    document.addEventListener("fullscreenchange", onFullScreenChange, false);
                    document.addEventListener("webkitfullscreenchange", onFullScreenChange, false);
                    document.addEventListener("mozfullscreenchange", onFullScreenChange, false);
                };

                ir.runImageRotator();
            }
        },

        initApi: function() {
            this._super();

            if (typeof __WR360Config === 'undefined')
                return;

            var self = this;
            var updateDataOld = this.settings.api.updateData;

            this.settings.api.updateData = function(data) {
                self.selectedSimpleConfig = null;

                var productIndex = __WR360Config.swatches ? $('[data-role=swatch-options]').data('mageSwatchRenderer').options.jsonConfig.index : null;
                if (productIndex) {
                    var selectedSimpleProductId = self.getSelectedSimpleProduct(productIndex);
                    if (selectedSimpleProductId) {
                        self.selectedSimpleConfig = __WR360Config.swatches[selectedSimpleProductId];
                        if (self.selectedSimpleConfig) {
                            // console.log('Simple config for ' + selectedSimpleProductId + ':');
                            // console.log(self.selectedSimpleConfig);
                        }
                    }
                }

                var fsViewer = $('#wr360PlayerId_fs');
                if (fsViewer.length > 0)
                    fsViewer.remove();

                updateDataOld(data);
                self.initViewerFrame();
            };

            self.initViewerFrame();

            // This seems to be a quick workaround to fix disappearing arrows (display: none) on first fotoramaApi.push or unshift.
            this.settings.fotoramaApi.setOptions({ arrows: 1 });
        },

        initViewerFrame: function() {
            var slide = {
                html: "<div class='wr360wrap' style='height:100%;'></div>",
                thumb: __WR360Config.thumbPath,
                type: 'webrotate360'
            };

            if (__WR360Config.endPlacement)
                this.settings.fotoramaApi.push(slide);
            else
                this.settings.fotoramaApi.unshift(slide);

            this.settings.$elementF.on('fotorama:ready fotorama:showend', $.proxy(this.handleFotorama, this));
        },

        getSelectedSimpleProduct: function(productIndex) {
            var selectedOptions = {};

            jQuery('div.swatch-attribute').each(function() {
                var attribute = $(this).attr('attribute-id');
                var option = $(this).attr('option-selected');

                if (attribute && option)
                    selectedOptions[attribute] = option;
            });

            /*
             for (var indexKey in productIndex) {
             if (productIndex.hasOwnProperty(indexKey)) {
             var productOptions = productIndex[indexKey];
             if (_.isEqual(productOptions, selectedOptions))
             return indexKey;
             }
             }
             */

            for (var indexKey in productIndex) {
                if (productIndex.hasOwnProperty(indexKey)) {
                    var productOptions = productIndex[indexKey];

                    var isMatching = true;
                    for (var attribute in selectedOptions) {
                        var option = selectedOptions[attribute];
                        if (productOptions[attribute] != option) {
                            isMatching = false;
                            break;
                        }
                    }

                    if (isMatching)
                        return indexKey;
                }
            }

            return null;
        },

        disableFocusClick: function (e) {
            e.preventDefault();
        },

        selectedSimpleConfig: null
    };

    return function (target) {
        return target.extend(mixin);
    };
});