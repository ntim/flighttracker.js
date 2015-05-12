var express = require('express');
var router = express.Router();
var request = require('request');
var later = require('later');
var Histogram2D = require('./histogram.js');

var flights = [];
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

function update_flights_cache() {
	request('http://lx3afamous02:8754/flights.json', function(error, response, body) {
		if (error) {
			console.log(error);
			return;
		}
		try {
			var data = JSON.parse(body);
			// Clear disappeared flights.
			for ( var attr in flights) {
				if (!(attr in data)) {
					delete flights[attr];
					console.log("Removing flight " + attr);
				}
			}
			for ( var attr in data) {
				var el = data[attr];
				if (el[2] > 0 && el[1] > 1) {
					var coordinates = [ el[2], el[1] ];
					if (attr in flights) {
						// Append coordinates to flight.
						var prev = flights[attr]['coordinates'][flights[attr]['coordinates'].length - 1];
						if (coordinates[0] != prev[0]
						|| coordinates[1] != prev[1]) {
							flights[attr]['coordinates'].push(coordinates);
						}
					} else {
						console.log("Adding flight " + attr);
						flights[attr] = {
								coordinates : [ coordinates ]
						};
					}
					flights[attr]['properties'] = {
							name : el[0],
							callsign : el[16] || "N/A",
							alt : el[4] + "ft",
							sqw : el[6] || "N/A",
							dist : distance(coordinates[1],
									coordinates[0], lat, lon, 'K')
					};
					histogram.fill(coordinates[0], coordinates[1]);
				}
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
	for ( var attr in flights) {
		var flight = flights[attr];
		if (flight['coordinates'].length > 1) {
			var lineCoordinates = [];
			for (var i = 1; i < flight['coordinates'].length; i++) {
				lineCoordinates.push([flight['coordinates'][i - 1], flight['coordinates'][i] ]);
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
				coordinates : flight['coordinates'][flight['coordinates'].length - 1]
			},
			properties : flight['properties']
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
	for (var i = 0; i < histogram.nx; i++) {
		for (var j = 0; j < histogram.ny; j++) {
			features.push({
				type : "Feature",
				geometry : {
					type : "Point",
					coordinates : [histogram.center(i, 'x'), histogram.center(j, 'y')]
				},
				properties : {
					weight: histogram.get(i, j)
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
var schedule = later.parse.recur().every(5).second();
later.setInterval(update_flights_cache, schedule);

module.exports = router;
