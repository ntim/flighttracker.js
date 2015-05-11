var express = require('express');
var router = express.Router();
var request = require('request');
var later = require('later');

var flights = [];

function update_flights_cache() {
	request(
			'http://lx3afamous02:8754/flights.json',
			function(error, response, body) {
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
									flights[attr]['coordinates']
											.push(coordinates);
								}
							} else {
								console.log("Adding flight " + attr);
								flights[attr] = {
									name : el[0],
									callsign : el[16] || "N/A",
									alt : el[4] + "ft",
									sqw : el[6] || "N/A",
									coordinates : [ coordinates ]
								};
							}
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

/* GET home page. */
router.get('/geo.json', function(req, res, next) {
	var features = [];
	for ( var attr in flights) {
		if (flights[attr]['coordinates'].length > 1) {
			var lineCoordinates = [];
			for (var i = 1; i < flights[attr]['coordinates'].length; i++) {
				lineCoordinates
						.push([ flights[attr]['coordinates'][i - 1], flights[attr]['coordinates'][i] ]);
			}
			features.push({
				type : "Feature",
				geometry : {
					type : "MultiLineString",
					coordinates : lineCoordinates
				}
			});
		}
		features.push({
			type : "Feature",
			geometry : {
				type : "Point",
				coordinates : flights[attr]['coordinates'][flights[attr]['coordinates'].length - 1]
			},
			properties : {
				name : flights[attr]['name'],
				callsign : flights[attr]['callsign'],
				alt : flights[attr]['alt'],
				sqw : flights[attr]['sqw']
			}
		});
	}
	res.json({
		type : "FeatureCollection",
		features : features
	});
});

// Update every 60 seconds
var schedule = later.parse.recur().every(1).second();
later.setInterval(update_flights_cache, schedule);

module.exports = router;
