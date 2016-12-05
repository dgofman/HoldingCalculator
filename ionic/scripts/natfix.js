'use strict';

var fs = require('fs'),
	readline = require('readline'),
	execSync = require('child_process').execSync;


//download: https://nfdc.faa.gov/webContent/56DaySub/2016-11-10/NATFIX.zip
//			https://nfdc.faa.gov/webContent/56DaySub/2016-11-10/APT.zip


var date,
	airports = {},
	airTypes = {
		'AIRPORT': 1,
		'BALLOONPORT': 1,
		'SEAPLANE BASE': 1,
		'GLIDERPORT': 1,
		'HELIPORT': 1
	},
	rd = readline.createInterface({
	input: fs.createReadStream(process.env.USERPROFILE + '/Downloads/APT/APT.txt'),
	output: process.stdout,
	terminal: false
});

rd.on('line', function(line) {
	var type = line.substr(14, 13).trim(),
		id = line.substr(27, 4).trim();
	if (airTypes[type]) {
		airports[id] = type;
	}
});

rd.on('close', function() {
	console.log('Total Airports: ' + Object.keys(airports).length);

	rd = readline.createInterface({
		input: fs.createReadStream(process.env.USERPROFILE + '/Downloads/NATFIX/NATFIX.txt'),
		output: process.stdout,
		terminal: false
	});

	var allnatfix,
		ifrnatfix,
		navType = {
			'REP-PT': 1,
			'NDB': 1,
			'NDB/DME': 1,
			'TACAN': 1,
			'UHF/NDB': 1,
			'VOR': 1,
			'VOR/DME': 1,
			'VORTAC': 1
		};

	var lineIndex = 0;
	rd.on('line', function(line) {
		lineIndex++;
		if (lineIndex === 1 && line.trim() !== 'NATFIX') {
			throw new Error('Invalid file the first line must be NATFIX.');
		}
		if (lineIndex === 2) {
			if (line.charAt(0) !== '\'') {
				throw new Error('Invalid file check date line.');
			}
			date = line.substr(1).trim();
			allnatfix = openFile('all', 'natfix');
			ifrnatfix = openFile('ifr', 'natfix');
		}

		if (line.substr(31, 2).trim()) { //state exists
			var sql,
				id = line.substr(2, 5).trim(),
				lat = line.substr(8, 7).trim(),
				lng = line.substr(16, 8).trim(),
				state = line.substr(31, 2).trim(),
				type = line.substr(37, 7).trim(),
				latitude = Number(lat.substr(0, 2)) + (Number(lat.substr(2, 2)) / 60) + (Number(lat.substr(4, 2)) / 3600),
				longitude = Number(lng.substr(0, 3)) + (Number(lng.substr(3, 2)) / 60) + (Number(lng.substr(5, 2)) / 3600);

			if (lat.charAt(6) === 'S') {
				latitude = 0 - latitude;
			}

			if (lng.charAt(7) === 'W') {
				longitude = 0 - longitude;
			}

			if (type === 'ARPT' && airports[id] === undefined && id.length === 4) {
				if ((id.charAt(0) === 'K' && airports[id.substr(1)]) || 
					(id.charAt(0) === 'P' && airports[id.substr(1)])) {
					id = id.substr(1);
				}
			}

			sql = "INSERT INTO NAVAID VALUES ('" + id + "','" + state + "', '" + type + "', '" + (airports[id] || '') + "', " + latitude.toFixed(5) + ", " + longitude.toFixed(5) + ");\n";

			if (navType[type]) {
				fs.write(ifrnatfix, sql);
			} else if (type === 'ARPT') {
				if (airports[id] === null) {
					return;
				} else if (airports[id]) {
					airports[id] = null; //remove duplicates
				}
				fs.write(ifrnatfix, sql);
			}

			//all fixes
			fs.write(allnatfix, sql);
		}
	});


	rd.on('close', function() {
		closeFile('all', 'natfix', allnatfix);
		closeFile('ifr', 'natfix', ifrnatfix);
	});
});

function openFile(dir, fileName) {
	var path = __dirname + '/data';
	if (!fs.existsSync(path)){
		fs.mkdirSync(path);
	}
	path += '/' + date;
	if (!fs.existsSync(path)){
		fs.mkdirSync(path);
	}
	path += '/' + dir;
	if (!fs.existsSync(path)){
		fs.mkdirSync(path);
	}
	path += '/' + fileName;
	try {
		fs.unlinkSync(path + '.db');
	} catch(err) {
		if (err.errno !== -4058) {
			console.error(err);
		}
	}

	var file = fs.openSync(path + '.sql', 'w');
	fs.writeSync(file, "PRAGMA synchronous = OFF;\n");
	fs.writeSync(file, "PRAGMA journal_mode = OFF;\n");
	fs.writeSync(file, "PRAGMA locking_mode = EXCLUSIVE;\n");
	fs.writeSync(file, "PRAGMA temp_store = MEMORY;\n");
	fs.writeSync(file, "PRAGMA count_changes = OFF;\n");
	fs.writeSync(file, "PRAGMA PAGE_SIZE = 4096;\n");
	fs.writeSync(file, "PRAGMA default_cache_size=700000;\n"); 
	fs.writeSync(file, "PRAGMA cache_size=700000;\n");
	fs.writeSync(file, "PRAGMA compile_options;\n");

	fs.writeSync(file, "CREATE TABLE NAVAID (id VARCHAR(5) NOT NULL, state VARCHAR(2) NOT NULL, type VARCHAR(7) NOT NULL, facility VARCHAR(7) NOT NULL, lat TEXT NOT NULL, lng TEXT NOT NULL);\n");

	fs.writeSync(file, "BEGIN;\n");

	return file;
}

function closeFile(dir, fileName, file) {
	var path = __dirname + '/data/' + date + '/' + dir + '/' + fileName;
	fs.writeSync(file, "COMMIT;\n");
	fs.closeSync(file);

	execSync('sqlite3 ' + path + '.db < ' + path + '.sql');
	fs.unlinkSync(path + '.sql');
}