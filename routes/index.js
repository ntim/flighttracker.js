var express = require('express');
var router = express.Router();
var request = require('request');
var later = require('later');
var Histogram2D = require('./histogram.js');

var cache = [];
var lon = 6.050051;
var lat = 50.781574;
var histogram = new Histogram2D(32, 2, 12, 32, 48, 54);

function distance(lat1, lon1, lat2, lon2, unit) {
	var radlat1 = Math.PI * lat1 / 180;
	var radlat2 = Math.PI * lat2 / 180;
	var radlon1 = Math.PI * lon1 / 180;
	var radlon2 = Math.PI * lon2 / 180;
	var theta = lon1 - lon2;
	var radtheta = Math.PI * theta / 180;
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1)
			* Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist);
	dist = dist * 180 / Math.PI;
	dist = dist * 60 * 1.1515;
	// Kilometers
	if (unit == "K") {
		dist = dist * 1.609344;
	}
	// Nautical miles
	if (unit == "N") {
		dist = dist * 0.8684;
	}
	return dist
}

function update_aircrafts_cache() {
	request('http://lx3afamous02:10000/data/aircraft.json', function(error, response, body) {
		if (error) {
			console.log(error);
			return;
		}
		try {
			var data = JSON.parse(body);
			var aircrafts = data['aircraft'];
			// Only accept valid data.
			aircrafts = aircrafts.filter(function(aircraft) {
				return 'lat' in aircraft && 'lon' in aircraft;
			});
			// Create lookup table.
			var lookup = {};
			aircrafts.forEach(function(aircraft) {
				var hex = aircraft['hex'];
				lookup[hex] = aircraft;
			});
			// Remove disappeared aircrafts.
			for(var hex in cache) {
				if(!(hex in lookup)) {
					delete cache[hex];
					console.log("Removing flight " + hex);
				}
			}
			// Add new aircrafts and update positions of existing aircrafts.
			for(var hex in lookup) {
				var coords = [ lookup[hex]['lon'], lookup[hex]['lat'] ];
				if(!(hex in cache)) {
					console.log("Adding flight " + hex);
					cache[hex] = {
							coordinates : [ coords ],
							properties : lookup[hex]
					};
					histogram.fill(coords[0], coords[1]);
				} else {
					var prev = cache[hex]['coordinates'][cache[hex]['coordinates'].length - 1];
					if(prev[0] != coords[0] && prev[1] != coords[1]) {
						console.log("Updating flight " + hex);
						cache[hex]['coordinates'].push(coords);
						histogram.fill(coords[0], coords[1]);
					}
				}
				cache[hex]['properties']['distance'] = Math.ceil(distance(coords[1], coords[0], lat, lon));
			}
		} catch (error) {
			console.log(error);
		}
	});
}

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', {
		title : 'Flight tracker'
	});
});

/* GET geo locations. */
router.get('/geo.json', function(req, res, next) {
	var features = [];
	for ( var hex in cache) {
		var aircraft = cache[hex];
		if (aircraft['coordinates'].length > 1) {
			var lineCoordinates = [];
			for (var i = 1; i < aircraft['coordinates'].length; i++) {
				lineCoordinates.push([aircraft['coordinates'][i - 1], aircraft['coordinates'][i] ]);
			}
			features.push({
				type : "Feature",
				geometry : {
					type : "MultiLineString",
					coordinates : lineCoordinates
				}
			});
		}
		features
		.push({
			type : "Feature",
			geometry : {
				type : "Point",
				coordinates : aircraft['coordinates'][aircraft['coordinates'].length - 1]
			},
			properties : aircraft['properties']
		});
	}
	res.json({
		type : "FeatureCollection",
		features : features
	});
});

/* GET heatmap. */
router.get('/heatmap.json', function(req, res, next) {
	var features = [];
	var max = histogram.max();
	for (var i = 0; i < histogram.nx; i++) {
		for (var j = 0; j < histogram.ny; j++) {
			features.push({
				type : "Feature",
				geometry : {
					type : "Point",
					coordinates : [histogram.center(i, 'x'), histogram.center(j, 'y')]
				},
				properties : {
					weight: histogram.get(i, j) / max
				}
			});
		}
	}
	res.json({
		type : "FeatureCollection",
		features : features
	});
});

// Update every 60 seconds
var schedule = later.parse.recur().every(1).second();
later.setInterval(update_aircrafts_cache, schedule);

module.exports = router;
