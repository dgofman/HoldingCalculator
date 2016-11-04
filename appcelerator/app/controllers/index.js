$.index.open();

var focusTextField = null;

_.each($.table.data, function(data) {
	_.each(data.rows, function(row) {
		_.each(row.children, function(child) {
			if (child.number && child.editable != false) {
				child.addEventListener('focus', function(e) {
					focusTextField = e.source;
				});
				child.addEventListener('blur', function(e) {
					if (focusTextField == e.source) {
						if (e.source.value == '' || (e.source.value < 0 && !e.source.negative) ||
						  (e.source.min != undefined && (Number(e.source.value) < Number(e.source.min)))) {
							e.source.value = e.source.min != undefined ? e.source.min : 0;
							compute();
						} else if (e.source.max != undefined && Number(e.source.value) > Number(e.source.max)) {
							e.source.value = e.source.max;
							compute();
						}
					}
				});
				child.addEventListener('change', function(e) {
					if (focusTextField == e.source && e.source.value != '-' && isNaN(e.source.value)) {
						e.source.value = e.source.value.replace(/[^0-9\.]+/, "");
						e.source.setSelection(e.source.value.length, e.source.value.length);
					}
				});
			}
		});
	});
});

var lapserate = 0.0019812;
// degrees / foot std. lapse rate C° in to K° result
var tempcorr = 273.15;
// deg Kelvin
var stdtemp0 = 288.15;
// deg Kelvin
var wasFeet = true;
// default: feet
var wasInches = true;
// default: inches
var wasCelsius = true;
// default: Celsius

var isFeet = true;
//altunits[0].checked;
var isInches = true;
//setunits[0].checked;
var isCelsius = true;
//tempunits[0].checked;
/*
 function twoplace(number)
 {
 if(isNaN(number)) return number;

 number = Math.round(100 * number);
 var whole = Math.floor(number / 100);
 var mods = number % 100;
 var decimal = mods.toString();
 if(mods < 10)  decimal = "0" + decimal;
 return whole.toString() + "." + decimal;
 }
 */
function roundit(thenum) {
	return Math.floor(thenum + 0.5);
}

function round(value) {
	return Math.round(10 * value) / 10;
}

/*
 function fixunits(units)
 {
 return
 with($) {
 if("alt" == units  &&  isFeet != wasFeet) {
 factor = 3.28084;			// meters to feet
 if(!isFeet)  factor = 1. / factor;	// feet to meters
 if(IA.value)  IA.value = roundit(factor * eval(IA.value));
 if(PA.value)  PA.value = roundit(factor * eval(PA.value));
 if(DA.value)  DA.value = roundit(factor * eval(DA.value));
 wasFeet = isFeet;
 IA.focus();
 }
 else if("set" == units  &&  isInches != wasInches) {
 factor = 0.02953;				// hPa to inches
 if(!isInches)  factor = 1. / factor;	// inches to hPa
 if(altstg.value)
 altstg.value = twoplace(factor * eval(altstg.value));
 wasInches = isInches;
 altstg.focus();
 }
 else if("temp" == units  &&  isCelsius != wasCelsius) {
 factor = isCelsius ? 5. / 9:  9. / 5;
 if(temp.value) {
 theTemp = eval(temp.value);
 theTemp = twoplace((theTemp + 40) * factor) - 40;
 temp.value = theTemp;
 }
 wasCelsius = isCelsius;
 temp.focus();
 }
 }
 compute();
 }*/

function compute() {
	var altFactor = isFeet ? 1. : 3.28084;
	var setFactor = isInches ? 1. : 0.02953;

	if ($.IA.value) {
		IA = eval($.IA.value);
	} else {
		IA = 0;
	}
	$.IA.value = IA;

	if ($.altstg.value) {
		altstg = eval($.altstg.value);
	} else {
		altstg = isInches ? 29.92 : 1013.25;
	}
	$.altstg.value = altstg;

	if ($.temp.value) {
		temp = eval($.temp.value);
	} else {
		temp = isCelsius ? 15 : 59;
	}

	$.temp.value = round(temp);

	if (!isCelsius)
		temp = (temp + 40) * (5 / 9) - 40;

	xx = setFactor * altstg / 29.92126;
	PA = IA + 145442.2 * altFactor * (1 - Math.pow(xx, 0.190261));
	$.PA.value = roundit(PA);

	stdtemp = stdtemp0 - PA * lapserate;

	Tratio = stdtemp / altFactor / lapserate;
	xx = stdtemp / (temp + tempcorr);
	// for temp in deg C
	DA = PA + Tratio * altFactor * (1 - Math.pow(xx, 0.234969));
	$.DA.value = roundit(DA);

	aa = DA * lapserate;
	// Calculate DA temperature
	bb = stdtemp0 - aa;
	// Correct DA temp to Kelvin
	cc = bb / stdtemp0;
	// Temperature ratio
	cc1 = 1 / 0.234969;
	// Used to find .235 root next
	dd = Math.pow(cc, cc1);
	// Establishes Density Ratio
	dd = Math.pow(dd, .5);
	// For TAS, square root of DR
	ee = 1 / dd;
	// For TAS; 1 divided by above
	var cas = $.IAS.value;
	ff = ee * cas;
	$.TAS.value = roundit(ff);

	//Ground Speed, Heading, Correction
	var crs = (Math.PI / 180) * eval($.course.value);
	var wd = (Math.PI / 180) * eval($.WD.value);
	var swc = ($.WS.value / $.TAS.value) * Math.sin(wd - crs);
	var hd = crs + Math.asin(swc);

	if (hd < 0) {
		hd = hd + 2 * Math.PI;
	}

	if (hd > 2 * Math.PI) {
		hd = hd - 2 * Math.PI;
	}

	$.heading.value = Math.round((180 / Math.PI) * hd);
	if (isNaN($.heading.value)) {
		$.heading.value = 360;
	}
	$.GS.value = Math.round($.TAS.value * Math.sqrt(1 - Math.pow(swc, 2)) - $.WS.value * Math.cos(wd - crs));

	var wca = Math.atan2($.WS.value * Math.sin(hd - wd), $.TAS.value - $.WS.value * Math.cos(hd - wd)),
		gs = $.GS.value;

	$.WCA.value = Math.round((180 / Math.PI) * (wca * -1));
	
	if ($.WCA.value == 0) { //I have not idea why is -0 can be
		$.WCA.value = 0;
	}

	$.distance.value = round(gs * (1 / 60));
	$.XTRK.value = round(gs * (2 / 60) / 3.14);
	$.diagonal.value = round(Math.sqrt(($.distance.value * 2) + ($.XTRK.value * 2)));
}

function calcAlt() {
	var altpress = eval($.IA.value);
	if (isNaN(altpress)) {
		$.altstg.value = 29.92;
		$.temp.value = 15;
		return;
	}
	var pstd = 1013.25;
	var mb = Math.pow(1 - (altpress / 145366.45), 1.0 / 0.190284) * pstd;
	$.altstg.value = ( isInches ? mb / 33.8639 : mb).toFixed(2);

	var celsius = true;
	var lAltitudeUnitToSI = isFeet ? 0.3048 : 1;
	var altitude = altpress * lAltitudeUnitToSI;
	var altitudes = new Array(0, 11000, 20000, 32000, 47000, 51000, 71000, 84852);
	var pressureRels = new Array(1, 2.23361105092158e-1, 5.403295010784876e-2, 8.566678359291667e-3, 1.0945601337771144e-3, 6.606353132858367e-4, 3.904683373343926e-5, 3.6850095235747942e-6);
	var temperatures = new Array(288.15, 216.65, 216.65, 228.65, 270.65, 270.65, 214.65, 186.946);
	var tempGrads = new Array(-6.5, 0, 1, 2.8, 0, -2.8, -2, 0);
	var gravity = 9.80665;
	// Acceleration of gravity [m/s2]
	var RGas = 8.31432;
	// Gas constant [kg/Mol/K]
	var airMolWeight = 28.9644;
	// Molecular weight of air
	var gMR = gravity * airMolWeight / RGas;

	var i = 0;
	if (altitude > 0) {
		while (altitude > altitudes[i + 1]) {
			i = i + 1;
		}
	}

	var lBaseTemp = temperatures[i];
	var tempGrad = tempGrads[i] / 1000;
	var lPressureRelBase = pressureRels[i];
	var lDeltaAltitude = altitude - altitudes[i];
	var temperature = lBaseTemp + tempGrad * lDeltaAltitude;

	// Calculate relative pressure
	if (Math.abs(tempGrad) < 1e-10) {
		lPressureRelative = lPressureRelBase * Math.exp(-gMR * lDeltaAltitude / 1000 / lBaseTemp);
	} else {
		lPressureRelative = lPressureRelBase * Math.pow(lBaseTemp / temperature, gMR / tempGrad / 1000);
	}

	if (isCelsius) {
		$.temp.value = round(temperature - 273.15);
	} else {
		$.temp.value = round(9 / 5 * temperature - 459.67);
	}

	compute();
}