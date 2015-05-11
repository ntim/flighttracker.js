$(document).on(
		'ready page:load',
		function() {

			var geojsonFormat = new ol.format.GeoJSON();
			var geojson = new ol.source.Vector();
			var heatmap = new ol.source.Vector();

			function update() {
				$.ajax({
					url : '/geo.json?time=' + $.now(),
					dataType : 'json',
					type : 'get',
					data : $.now()
				}).done(function(response) {
					geojson.clear();
					var features = geojsonFormat.readFeatures(response, {
						featureProjection : 'EPSG:3857'
					});
					geojson.addFeatures(features);
				});
				$.ajax({
					url : '/heatmap.json?time=' + $.now(),
					dataType : 'json',
					type : 'get',
					data : $.now()
				}).done(function(response) {
					heatmap.clear();
					var features = geojsonFormat.readFeatures(response, {
						featureProjection : 'EPSG:3857'
					});
					heatmap.addFeatures(features);
				});
				setTimeout(update, 5000);
			}

			var style = {
				'Point' : [ new ol.style.Style({
					image : new ol.style.Circle({
						fill : new ol.style.Fill({
							color : 'rgba(255,0,0,0.5)'
						}),
						radius : 5,
						stroke : new ol.style.Stroke({
							color : 'rgba(255,0,0,1)',
							width : 1
						})
					})
				}) ],
				'LineString' : [ new ol.style.Style({
					stroke : new ol.style.Stroke({
						color : 'rgba(255,0,0,1)',
						width : 3
					})
				}) ],
				'MultiLineString' : [ new ol.style.Style({
					stroke : new ol.style.Stroke({
						color : 'rgba(255,0,0,0.5)',
						width : 3
					})
				}) ]
			};

			var rasterLayer = new ol.layer.Tile({
				source : new ol.source.Stamen({
					layer : 'toner-lite'
				})
			});
			// var raster = new ol.layer.Tile({
			// source : new ol.source.OSM()
			// });
			var heatmapLayer = new ol.layer.Heatmap({
				source : heatmap,
				opacity : 0.2,
				visible: false
			});
			var geoLayer = new ol.layer.Vector({
				source : geojson,
				style : function(feature, resolution) {
					return style[feature.getGeometry().getType()];
				}
			});

			// Create the map
			var map = new ol.Map({
				target : document.getElementById('map'),
				renderer : 'canvas', // Force the renderer to be used
				// Add a new Tile layer getting tiles from OpenStreetMap source
				layers : [ rasterLayer, heatmapLayer, geoLayer ],
				view : new ol.View({
					center : ol.proj.transform([ 6.050051, 50.781574 ],
							'EPSG:4326', 'EPSG:3857'),
					zoom : 9
				})
			});

			var displayFeatureInfo = function(pixel) {
				var features = [];
				map.forEachFeatureAtPixel(pixel, function(feature, layer) {
					features.push(feature);
				});
				if (features.length > 0) {
					var feature = features[0];
					$("#name").text(feature.get('name'));
					$("#callsign").text(feature.get('callsign'));
					$("#alt").text(feature.get('alt'));
					$("#sqw").text(feature.get('sqw'));
					document.getElementById('map').style.cursor = 'pointer';
				} else {
					$("#name").text("-");
					$("#callsign").text("-");
					$("#alt").text("-");
					$("#sqw").text("-");
					document.getElementById('map').style.cursor = '';
				}
			};

			map.on('pointermove', function(evt) {
				if (evt.dragging) {
					return;
				}
				var pixel = map.getEventPixel(evt.originalEvent);
				displayFeatureInfo(pixel);
			});

			map.on('click', function(evt) {
				displayFeatureInfo(evt.pixel);
			});
			
			map.on('moveend', function(evt) {
				if (map.getView().getZoom() > 7) {
					heatmapLayer.setVisible(false);
				} else {
					heatmapLayer.setVisible(true);
				}
			}); 

			update();

		});