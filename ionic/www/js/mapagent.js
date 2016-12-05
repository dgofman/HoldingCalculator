'use strict';

angular.module('holding.mapAgent', [])
.factory('MapAgent', function() {
	var map,
		L = window.L,
		MBTiles = window.MBTiles,

		callback = function(config, done) {
			var boundVal = config._metadata['bounds'].split(",");
			var bounds = new L.LatLngBounds( new L.LatLng(boundVal[1],boundVal[0]), new L.LatLng(boundVal[3],boundVal[2]) );
			var MBLayer = L.TileLayer.extend({
				getTileUrl: function (tilePoint) {
					var zoom = Math.min(this.options.maxNativeZoom, tilePoint.z),
						limit = Math.pow(2, zoom);
					tilePoint.y = limit - tilePoint.y - 1;
					return config.getTileImage(tilePoint.x, tilePoint.y, zoom);
				}
			});

			var MBLayerObj = new MBLayer('map_layer', {
				maxNativeZoom: parseInt(config._metadata['maxzoom']),
				minZoom: parseInt(config._metadata['minzoom']),
				maxZoom: 12,
				opacity: 1,
				bounds: bounds,
				attribution: 'Softigent/Holding Calculator'
			});

			map.addLayer(MBLayerObj);

			map.fitBounds(bounds);
			map.setMaxBounds(bounds);
			done();
		};

	var RotatedMarker = L.Marker.extend({
		_setPos: function (pos) {
			L.Marker.prototype._setPos.call(this, pos);
			this.setAngle(this.options.angle);
		},
		setAngle: function(val) {
			this.options.angle = val;
			if (this._icon) {
				var rotate = ' rotate(' + this.options.angle + 'deg)',
					transform = this._icon.style[L.DomUtil.TRANSFORM];

				if (transform.indexOf('rotate') === -1) {
					transform += rotate;
				} else {
					transform = transform.replace(/rotate.*/, rotate);
				}
				this._icon.style[L.DomUtil.TRANSFORM] = transform;
			}
		}
	});
	L.RotatedMarker = function (pos, options) {
		return new RotatedMarker(pos, options);
	};

	return {
		createMap: function() {
			map = new L.Map('map', {
				zoomControl: false,
				maxBoundsViscosity: 1.0
			});
			return map;
		},

		createLayer: function(file, done) {
			if (window.location.port !== '80') {
				var http = new window.XMLHttpRequest();
				http.open("GET", './' + file, true);
				http.responseType = "arraybuffer";

				http.onload = function () {
					var config = new MBTiles();
					config._open(new Uint8Array(http.response));
					callback(config, done);
				};
				http.send(null);
			} else { //Web
				MBTiles.load(
					window.location.origin + '/maps/' + file,
					function(config) {
						callback(config, done);
					}
				);
			}
		}
	};
});