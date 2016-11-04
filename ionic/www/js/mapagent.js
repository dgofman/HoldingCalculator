'use strict';

angular.module('holding.mapAgent', [])
.factory('MapAgent', function() {
	var map,
		L = window.L,
		MBTiles = window.MBTiles,

		httpRequest = function(file) {
			var http = new window.XMLHttpRequest();
			http.open("GET", file, true);
			http.responseType = "arraybuffer";

			http.onload = function () {
				var g = new MBTiles();
				g._open(new Uint8Array(http.response));
				callback(g);
			};

			http.send(null);
		},
		callback = function(config) {
			var boundVal = config._metadata['bounds'].split(",");
			var bounds = new L.LatLngBounds( new L.LatLng(boundVal[1],boundVal[0]), new L.LatLng(boundVal[3],boundVal[2]) );
			var MBLayer = L.TileLayer.extend({
				getTileUrl: function (tilePoint) {
					var zoom = Math.min(config._metadata['maxzoom'], tilePoint.z),
						limit = Math.pow(2, zoom);
					tilePoint.y = limit - tilePoint.y - 1;
					return config.getTileImage(tilePoint.x, tilePoint.y, zoom);
				}
			});

			var MBLayerObj = new MBLayer('map_layer', {
				maxNativeZoom: config._metadata['maxzoom'],
				minZoom: config._metadata['minzoom'],
				maxZoom: 12,
				opacity: 1,
				bounds: bounds,
				attribution: 'Softigent/Holding Calculator'
			});

			map.addLayer(MBLayerObj);

			//console.log(centerVal);
			//map.setView(new L.LatLng(parseFloat(boundVal[1]),parseFloat(boundVal[0])),parseInt(boundVal[2]));
			map.fitBounds(bounds);
			map.setZoom(10);
		};


	return {
		createMap: function() {
			map = new L.Map('map', {
				zoomControl: true
			});

			map.on('click', function(e) {
				console.log("Lat, Lon : " + e.latlng.lat + "," + e.latlng.lng, map.getZoom());
			});
		},

		createLayer: function(file) {
			if (window.location.port !== '80') {
				httpRequest('./' + file);
			} else { //Web
				MBTiles.load(
					window.location.origin + '/maps/' + file,
					callback
				);
			}
		}
	};
});