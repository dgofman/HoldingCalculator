'use strict';

angular.module('starter.pattern', ['holding.mapAgent'])
.factory('Pattern', function(MapAgent) {

	var map,
		plane,
		hold,
		course,
		nmToMeter = 1852,
		L = window.L,
		mNorth = 13.5, //magnetic variation
		po = { //plane options
			width: 50,
			height: 50,
			color: '#ff0000'
		},
		ho = { //hold options
			stroke: 2,
			x1: 1.4,
			x2: 1.4,
			y2: 2.2,
			color: 'FUCHSIA',
			inbound: 'GREEN'
		},
		fillPlane = true,
		milesToPixels = function(nm) {
			var lng = hold.getLatLng().lng,
				lat = hold.getLatLng().lat,
				d = Math.PI / 180,
				latR = ((nm * nmToMeter) / L.CRS.Earth.R) / d,
				top = map.project([lat + latR, lng]),
				bottom = map.project([lat - latR, lng]),
				p = top.add(bottom).divideBy(2);

			return Math.max(Math.round(p.y - top.y), 1);
		},
		drawHold = function(right_entry) {
			if (!hold) {
				return;
			}

			var radius1 = milesToPixels(ho.x1) / 2,
				radius2 = milesToPixels(ho.x2) / 2,
				y1 = radius1 + ho.stroke,
				y2 = milesToPixels(ho.y2) + radius2 + ho.stroke,
				x1 = milesToPixels(ho.x1) + ho.stroke * 2,
				x2 = milesToPixels(ho.x2) + ho.stroke * 2,
				width = Math.max(x1, x2) + ho.stroke,
				height = y2 + radius2 + ho.stroke;

			var entry = right_entry[0] ? {y: 1, z: mNorth} : {y: 180, z: -mNorth},
				html = '<div style="transform: rotateY(' + entry.y + 'deg) rotateZ(' + entry.z + 'deg); transform-origin: top left">' +
				'<div style="position: absolute; width: 100%; height: 100%; top: -' + radius1 + 'px; left: -' + ho.stroke + 'px">' +
				'<?xml version="1.0"?>' +
				'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewbox="0 0 ' + width + ' ' + height + '">' +
				'<g stroke-width="' + ho.stroke + '" stroke="' + ho.color + '">' +
				/*'<rect x="0" y="0" width="100%" height="100%" fill="none" stroke="#000"/>' +*/
				'<path d="M' + [ho.stroke, y1].join() + ', A' + radius1 + ',' + radius1 + ' 0 1,1 ' + [x1, y1].join() + '" fill="transparent"/>' +
				'<path d="M' + [ho.stroke, y2].join() + ', A' + radius2 + ',' + radius2 + ' 0 1,0 ' + [x2, y2].join() + '" fill="transparent"/>' +
				'<line x1="' + ho.stroke + '" y1="' + y1 + '" x2="' + ho.stroke + '" y2="' + y2 + '" stroke="' + ho.inbound + '"/>' +
				'<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>' +
				'</g></svg></div></div>';

			hold.setIcon(L.divIcon({
				iconAnchor: [0, 0],
				iconSize: new L.Point(width, height),
				html: html
			}));
		},
		svg01 = '<?xml version="1.0"?>' +
				'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">' +
				'<path style="fill:{COLOR};" d="M348.36,490L245,437.265L141.64,490v-64.682l51.467-55.236v-64.686L0,363.323v-63.507l193.107-137.082V60.343' +
				'	C193.107,27.069,216.39,0,245,0c28.609,0,51.893,27.069,51.893,60.343v102.391L490,299.816v63.507l-193.107-57.927v64.686' +
				'	l51.467,55.236V490z M245,414.104l82.509,42.099v-22.87l-51.467-55.236V277.645l193.107,57.927v-25.219L276.042,173.27V60.343' +
				'	c0-21.93-13.927-39.773-31.042-39.773c-17.115,0-31.042,17.843-31.042,39.773V173.27L20.851,310.352v25.219l193.107-57.927v100.453' +
				'	l-51.467,55.236v22.87L245,414.104z"/>' +
				'</svg>',
		svg02 = '<?xml version="1.0"?>' +
				'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">' +
				'<path style="fill:{COLOR};" d="M482,363.333c2.667,0.666,5,0.332,7-1c2-1.334,3-3.334,3-6v-36c0-6.668-3-12-9-16l-187-111'+
				'	c-6-3.334-9-8.668-9-16v-125c0-6.667-1.333-13-4-19c-7.333-18.667-17.667-29-31-31c-2-0.667-4-1-6-1s-4.333,0.333-7,1' +
				'	c-0.667,0-1.5,0.167-2.5,0.5s-2.167,0.833-3.5,1.5c-4.667,1.333-9,4.333-13,9s-7,9-9,13l-3,7c-2,6-3,12.333-3,19v125' +
				'	c0,7.333-3,12.667-9,16l-187,111c-6,4-9,9.332-9,16v36c0,2.666,1,4.666,3,6c2,1.332,4.333,1.666,7,1l185-60' +
				'	c2.667-1.334,5-1.168,7,0.5c2,1.666,3,3.832,3,6.5v97c0,7.334-2.667,13-8,17l-25,18c-5.333,4-8,9.666-8,17v24c0,2.666,1,4.666,3,6' +
				'	s4.333,1.666,7,1l62-18c6.667-2,13.333-2,20,0l62,18c2.667,0.666,5,0.334,7-1s3-3.334,3-6v-24c0-7.334-2.667-13-8-17l-25-18' +
				'	c-5.333-4-8-9.666-8-17v-97c0-3.334,1-5.668,3-7c2-1.334,4.333-1.334,7,0L482,363.333z"/>' +
				'</svg>';

	return {
		init: function($scope) {
			map = MapAgent.createMap();

			map.on('zoomend', function() {
				drawHold([$scope.model.right_entry]);
			});

			//L.control.scale().addTo(map);

			if (!L.Browser.edge) {
				map.on('contextmenu', function(e) {
					if (plane) {
						var cur_pos = plane.getLatLng();
						if (!course) {
							course = new L.Polyline([cur_pos, e.latlng], {
								color: 'red',
								weight: 2,
								opacity: 1,
								smoothFactor: 1
							}).addTo(map);

							hold = L.RotatedMarker(e.latlng, {
								angle: $scope.model.inbound
							}).addTo(map);

							drawHold([$scope.model.right_entry]);
						} else {
							course.setLatLngs([cur_pos, e.latlng]);
						}
						hold.setLatLng(e.latlng);

						map.setView(e.latlng, map.getMaxZoom());
					}
				}, false);
			}

			MapAgent.createLayer('mbtiles/EnrouteLowUS/ENR_L03.mbtiles');

			//Define scope model
			$scope.model = {
				inbound: 0,
				right_entry: true
			};

			$scope.$watchGroup([
				function(){ return $scope.model.inbound; }
			], function(newValue) {
				if (hold) {
					hold.setAngle(newValue);
				}
			});
			$scope.$watchGroup([function(){ return $scope.model.right_entry; }], drawHold);

			$scope.findPlane = function() {
				map.panTo(plane.getLatLng());
			};

			if (window.navigator.geolocation) {
				window.navigator.geolocation.getCurrentPosition(function(position) {
					var cur_pos = [position.coords.latitude, position.coords.longitude];
					plane = L.RotatedMarker(cur_pos, {
							angle: 0,
							icon: L.divIcon({ 
								iconSize: new L.Point(po.width, po.height),
								iconAnchor: [0, 0],
								html: '<div style="transform: rotateZ(' + mNorth + 'deg); transform-origin: top left">' +
										'<div style="position: absolute; width: 100%; height: 100%; left: -' + (po.width / 2) + 'px; top: -' + (po.height / 2) + 'px">' +
										(fillPlane ? svg02 : svg01).replace('{COLOR}', po.color) + 
										'</div></div>'
							})
						}).addTo(map);

					/*L.circle([position.coords.latitude, position.coords.longitude], {
						iconSize: new L.Point(50, 50), 
						fillOpacity: 1,
						defaultColor: '#00f', color: '#0f0', 
						radius: 5500
					}).addTo(map);
					console.log(map.latLngToContainerPoint([36.715458, -120.778683]));

					var circle = L.circle(e.latlng, 24.4 * 1852, {
								color: 'red',
								fillColor: '#f03'
							}).addTo(map);
					*/

					map.panTo(cur_pos);

					for (var name in position.coords) {
						$scope.model[name] = position.coords[name];
					}
					$scope.$apply($scope.model);

					window.navigator.geolocation.watchPosition(
						function (position) {
							var cur_pos = [position.coords.latitude, position.coords.longitude];
							for (var name in position.coords) {
								$scope.model[name] = position.coords[name];
							}
							$scope.$apply($scope.model);

							if (course) {
								var latLngs = course.getLatLngs();
								latLngs[0] = cur_pos;
								course.setLatLngs(latLngs);
							}

							if (!isNaN(parseInt(position.coords.heading))) {
								plane.setAngle(parseInt(position.coords.heading));
							}
							plane.setLatLng(cur_pos);
					});
				}, function() {
					alert('Error: The Geolocation service failed.');
				}, {enableHighAccuracy:true, maximumAge:30000, timeout:27000});
			}
		}
	};
});