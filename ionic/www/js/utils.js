'use strict';

angular.module('holding.utils', [])
.factory('Utils', function() {
	var EARTH_RADIUS_IN_NM = 4500, //https://en.wikipedia.org/wiki/Earth_radius
		fail = function(error) {
			console.error(error);
			alert('ERROR: ' + JSON.stringify(error));
		};
	return {
		updates: function(callback) {
			callback();
		},

		download: function(fileName, dirName, fileUrl) {
			if (window.LocalFileSystem) {
				window.requestFileSystem(window.LocalFileSystem.PERSISTENT, 0, function(fs) {
					fs.root.getDirectory(
						dirName, { create: true }, function(dirEntry) {
							dirEntry.getFile(
								fileName,
								{
									create: true, 
									exclusive: false
								},
								function gotFileEntry(fileEntry) {
									//fe.remove();
									var ft = new window.FileTransfer();
									ft.onprogress = function(progressEvent) {
										console.log(Math.floor(progressEvent.loaded / progressEvent.total * 100));
									};
									ft.download(
										encodeURI(fileUrl),
										fileEntry.toURL(),
										function(entry) {
											console.log(entry.toURL());
										}, fail, false, null);
								}, fail);
						}, fail);
				}, fail);
			}
		},

		openDB: function(dbName, collection, callback) {
			try{
				var http = new window.XMLHttpRequest();
				http.open("GET", './' + dbName + '.db', true);
				http.responseType = "arraybuffer";
				http.onload = function () {
					var db = new window.SQL.Database(new Uint8Array(http.response));
					if (http.status === 200) {
						collection[dbName] = db;
						if (callback) {
							callback(db);
						}
					}
				};
				http.send(null);
			} catch(err) {}
		},

		findFix: function(db, lat, lng, distance) {
			/*var sql = 'SELECT *, (' + 
				Math.sin(lat * Math.PI / 180) + ' * sin_lat + ' +
				Math.cos(lat * Math.PI / 180) + ' * cos_lat * (' +
				Math.sin(lng * Math.PI / 180) + ' * sin_lng + ' +
				Math.cos(lng * Math.PI / 180) + ' * cos_lng) ' +
				') as distance from NAVAID where distance > ' +
				Math.cos(distance / EARTH_RADIUS_IN_NM) + ' order by distance desc';
			return db.exec(sql);*/

			var rad2deg = function(radians) {
				return radians * 180 / Math.PI;
			}, deg2rad = function(degrees) {
				return degrees * Math.PI / 180;
			};

			var R = EARTH_RADIUS_IN_NM,
				$maxLat = lat + rad2deg(distance / R),
				$minLat = lat - rad2deg(distance / R),
				$maxLon = lng + rad2deg(distance / R / Math.cos(deg2rad(lat))),
				$minLon = lng - rad2deg(distance / R / Math.cos(deg2rad(lat))),
				$distance = '((lng - ' + lng + ') * (lng - ' + lng + ')) + ((lat - ' + lat + ') * (lat - ' + lat + '))';


			var sql = 'SELECT *, ' + $distance + ' AS distance FROM NAVAID WHERE lng BETWEEN ';
			if (Math.abs($minLon) < Math.abs($maxLon)) {
				sql += $minLon + ' AND ' + $maxLon;
			} else {
				sql += $maxLon + ' AND ' + $minLon;
			}
			sql += ' AND lat BETWEEN ';

			if (Math.abs($minLat) < Math.abs($maxLat)) {
				sql += $minLat + ' AND ' + $maxLat;
			} else {
				sql += $maxLat + ' AND ' + $minLat;
			}

			sql += ' ORDER BY distance';

			return db.exec(sql);
		}
	};
});