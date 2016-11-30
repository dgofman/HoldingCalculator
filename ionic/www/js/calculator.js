'use strict';

angular.module('holding.calculator', [])
.factory('Calculator', function() {
	var lapserate = 0.0019812;
	// degrees / foot std. lapse rate C° in to K° result
	var tempcorr = 273.15;
	// deg Kelvin
	var stdtemp0 = 288.15;
	// deg Kelvin
	/*var wasFeet = true;
	// default: feet
	var wasInches = true;
	// default: inches
	var wasCelsius = true;
	// default: Celsius*/

	var isFeet = true;
	//altunits[0].checked;
	var isInches = true;
	//setunits[0].checked;
	var isCelsius = true;

	var altFactor = isFeet ? 1.0 : 3.28084;
	var setFactor = isInches ? 1.0 : 0.02953;

	//Altitude constants
	var altitudes = new Array(0, 11000, 20000, 32000, 47000, 51000, 71000, 84852);
	var temperatures = new Array(288.15, 216.65, 216.65, 228.65, 270.65, 270.65, 214.65, 186.946);
	var tempGrads = new Array(-6.5, 0, 1, 2.8, 0, -2.8, -2, 0);

	return {
		init: function($scope, $filter) {
			var self = this;

			$scope.model = {
				IAS: 120,
				IA: 6000,
				altstg: 29.92,
				temp: 3.1,
				WS: 0,
				WD: 0,
				course: 0
			};

			$scope.$watchGroup([
				function(){ return $scope.model.IAS; },
				function(){ return $scope.model.altstg; },
				function(){ return $scope.model.temp; },
				function(){ return $scope.model.WS; },
				function(){ return $scope.model.WD; },
				function(){ return $scope.model.course; }
			], function() {
				self.compute($scope.model, $filter);
			});

			$scope.$watchGroup([
				function(){ return $scope.model.IA; }
			], function() {
				self.calcAlt($scope.model);
			});
		},

		roundit: function(thenum) {
			return Math.floor(thenum + 0.5);
		},

		round: function(value) {
			return Math.round(10 * value) / 10;
		},

		compute: function(model, $filter) {
			var IA = parseInt(model.IA || 0);
			model.IA = IA;

			var altstg = model.altstg;
			if (altstg === undefined) {
				altstg = isInches ? 29.92 : 1013.25;
			}
			model.altstg = altstg;

			var temp = parseFloat(model.temp);
			if (temp === undefined) {
				temp = isCelsius ? 15 : 59;
			}
			model.temp = temp;

			if (!isCelsius) {
				temp = (temp + 40) * (5 / 9) - 40;
			}

			var xx = setFactor * altstg / 29.92126,
			PA = IA + 145442.2 * altFactor * (1 - Math.pow(xx, 0.190261));
			model.PA = this.roundit(parseFloat(PA));

			var stdtemp = stdtemp0 - PA * lapserate,
				Tratio = stdtemp / altFactor / lapserate;
			xx = stdtemp / (temp + tempcorr);

			// for temp in deg C
			var DA = PA + Tratio * altFactor * (1 - Math.pow(xx, 0.234969));
			model.DA = this.roundit(DA);

			var aa = DA * lapserate,
			// Calculate DA temperature
			bb = stdtemp0 - aa,
			// Correct DA temp to Kelvin
			cc = bb / stdtemp0,
			// Temperature ratio
			cc1 = 1 / 0.234969,
			// Used to find .235 root next
			cc2 = Math.pow(cc, cc1),
			// Establishes Density Ratio
			dd = Math.pow(cc2, 0.5),
			// For TAS, square root of DR
			ee = 1 / dd;

			// For TAS; 1 divided by above
			var cas = model.IAS,
				ff = ee * cas,
				tas = this.roundit(ff);
			model.TAS = tas;

			//Ground Speed, Heading, Correction
			var crs = (Math.PI / 180) * model.course,
				wd = (Math.PI / 180) * model.WD,
				ws = parseInt(model.WS || 0);
			var swc = (ws / tas) * Math.sin(wd - crs);
			var hd = crs + Math.asin(swc);

			if (hd < 0) {
				hd = hd + 2 * Math.PI;
			}

			if (hd > 2 * Math.PI) {
				hd = hd - 2 * Math.PI;
			}

			var heading = Math.round((180 / Math.PI) * hd);
			if (isNaN(heading)) {
				heading = 360;
			}
			model.heading = heading;

			var gs = Math.round(tas * Math.sqrt(1 - Math.pow(swc, 2)) - ws * Math.cos(wd - crs)),
				wca = Math.atan2(ws * Math.sin(hd - wd), tas - ws * Math.cos(hd - wd)),
				wca1 = Math.round((180 / Math.PI) * (wca * -1)),
				inbound = tas * (1 / 60),
				xtrk = tas * (2 / 60) / Math.PI,
				hs = (IA > 14000 ? 1.5 : 1) / 60;

			var a = model.WD - model.heading;
			if (a < 0) {
				a = -a;
			}
			var twind, xwind = (ws * (Math.sin (0.0174 * a)));
			model.CW = this.round(Math.abs(xwind));

			if (model.heading - model.WD === 180) {
				twind = ws;
			} else if (model.WD - model.heading === 180) {
				twind = -ws;
			} else {
				twind = (ws * (Math.cos (0.0174 * a)));
			}

			if (twind < 0) {
				model.HW = 0;
				model.TW = this.round(Math.abs(twind));
			} else {
				model.TW = 0;
				model.HW = this.round(twind);
			}

			model.GS = gs;
			model.WCA = wca1 || 0;

			var dgs = 0;
			if (ws !== 0) {
				if (model.HW === 0 && model.TW === 0) {
					dgs = (model.TW * hs) * 2 - Math.abs(xwind * hs / 2);
				} else {
					dgs = -(twind * hs) * 2;
				}
			}

			model.inbound = $filter('number')(this.round(inbound - twind * hs), 1);
			model.XTRK = $filter('number')(this.round(xtrk + xwind * hs), 1);
			model.diagonal =  $filter('number')(this.round(Math.sqrt(Math.pow(inbound, 2) + Math.pow(xtrk, 2)) + dgs), 1);
		},

		calcAlt: function(model) {
			var lAltitudeUnitToSI = isFeet ? 0.3048 : 1;
			var altpress = parseInt(model.IA || 0);
			var altitude = altpress * lAltitudeUnitToSI;
			var i = 0;
			if (altitude > 0) {
				while (altitude > altitudes[i + 1]) {
					i = i + 1;
				}
			}

			var lBaseTemp = temperatures[i];
			var tempGrad = tempGrads[i] / 1000;
			var lDeltaAltitude = altitude - altitudes[i];
			var temperature = lBaseTemp + tempGrad * lDeltaAltitude;

			if (isCelsius) {
				model.temp = this.round(temperature - 273.15);
			} else {
				model.temp = this.round(9 / 5 * temperature - 459.67);
			}
		}
	};
});