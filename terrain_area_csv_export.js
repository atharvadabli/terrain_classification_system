
var filename = "FILE_L1_LANDFORMS_AREAS_CSV";
var mt1k = FEATURE_COLLECTION_MICROWATERSHED ; // featurecollection of all the study areas for which we are calculating landforms
var dem = DEM_FILE;
var export_location = 'FOLDER_NAME_IN_DRIVE'; // csv export location

var processGeometry = function(feature) {
  // Get the geometry of the feature
  var micro_watershed_id = feature.id();
  var micro_watershed = mt1k.filter(ee.Filter.eq('system:index', micro_watershed_id));
  var studyArea = micro_watershed.geometry();
var demClipped = dem.clip(studyArea);

var small_inner = ee.Number(5);
var small_outer = ee.Number(10);
var small_inner_circle = ee.Kernel.circle(small_inner, 'pixels', false, -1);
var small_outer_circle = ee.Kernel.circle(small_outer, 'pixels', false, 1);
var small_kernel = small_outer_circle.add(small_inner_circle, true); //created annulus
// print(small_kernel);

var large_inner = ee.Number(62);
var large_outer = ee.Number(67);
var large_inner_circle = ee.Kernel.circle(large_inner, 'pixels', false, -1);
var large_outer_circle = ee.Kernel.circle(large_outer, 'pixels', false, 1);
var large_kernel = large_outer_circle.add(large_inner_circle, true); //created annulus
// print(large_kernel);

// var large_kernel = ee.Kernel.circle(60);
var focalmean_small = demClipped.reduceNeighborhood(ee.Reducer.mean(), small_kernel);
var focalmean_large = demClipped.reduceNeighborhood(ee.Reducer.mean(), large_kernel);

// Map.addLayer(demClipped);
// Map.addLayer(focalmean_small);
// Map.addLayer(focalmean_large, {}, 'Focal mean large');
var TPI_small = demClipped.subtract(focalmean_small);
var TPI_large = demClipped.subtract(focalmean_large);

// Map.addLayer(TPI_large);

var mean = TPI_small.reduceRegion({reducer: ee.Reducer.mean()}).get('elevation');
var TPI_small = TPI_small.subtract(ee.Number(mean));
var stdDev = TPI_small.reduceRegion({reducer: ee.Reducer.stdDev()}).get('elevation');
var TPI_small = TPI_small
                .divide(ee.Number(stdDev))
                .multiply(ee.Number(100))
                .add(ee.Number(0.5));
                // .toInt();

// print(mean);
// print(stdDev);
                
var mean = TPI_large.reduceRegion({reducer: ee.Reducer.mean()}).get('elevation');
var TPI_large = TPI_large.subtract(ee.Number(mean));

var stdDev = TPI_large.reduceRegion({reducer: ee.Reducer.stdDev()}).get('elevation');

// print(mean);
// print(stdDev); 

var TPI_large = TPI_large
                .divide(ee.Number(stdDev))
                .multiply(ee.Number(100))
                .add(ee.Number(0.5));
                // .toInt();
                
var combined_image = TPI_small.addBands(TPI_large);

var stdDev = TPI_large.reduceRegion({reducer: ee.Reducer.stdDev()}).get('elevation');

var slope = ee.Terrain.slope(dem);
var clippedSlope = slope.clip(studyArea);

// // ------------------------------------------------------------------------
// // Classification

var lf300x2k = ee.Image.constant(0).clip(studyArea);
var dem_std = demClipped.reduceRegion({reducer: ee.Reducer.stdDev()}).get('elevation')
dem_std = ee.Number(dem_std).add(1);
var dem_mean = demClipped.reduceRegion({reducer: ee.Reducer.mean()}).get('elevation')

var factor = ee.Number(3).subtract(ee.Number(dem_std).log10());
// factor = factor.max(1);
// print("factor : ", factor);

var right_limit = ee.Number(100).multiply(factor);
var left_limit = ee.Number(-100).multiply(factor);

lf300x2k = lf300x2k.where(
  TPI_small.gt(left_limit)
  .and(TPI_small.lt(right_limit))
  .and(TPI_large.gt(left_limit))
  .and(TPI_large.lt(right_limit))
  .and(clippedSlope.lt(5)),
  5
);

lf300x2k = lf300x2k.where(
  TPI_small.gt(left_limit)
  .and(TPI_small.lt(right_limit))
  .and(TPI_large.gt(left_limit))
  .and(TPI_large.lt(right_limit))
  .and(clippedSlope.gte(5))
  .and(clippedSlope.lt(20)),
  6
);

lf300x2k = lf300x2k.where(
  TPI_small.gt(left_limit)
  .and(TPI_small.lt(right_limit))
  .and(TPI_large.gte(right_limit))
  .and(clippedSlope.lt(6)),
  7 // Flat Ridge Tops
);

lf300x2k = lf300x2k.where(
  TPI_small.gt(left_limit)
  .and(TPI_small.lt(right_limit))
  .and(TPI_large.gt(left_limit))
  .and(TPI_large.lt(right_limit))
  .and(clippedSlope.gte(20)),
  8 // Upper Slopes
);


lf300x2k = lf300x2k.where(
  TPI_small.gt(left_limit)
  .and(TPI_small.lt(right_limit))
  .and(TPI_large.gte(right_limit))
  .and(clippedSlope.gte(6)),
  8 // Upper Slopes
);

lf300x2k = lf300x2k.where(
  TPI_small.gt(left_limit)
  .and(TPI_small.lt(right_limit))
  .and(TPI_large.lte(left_limit)),
  4
);

lf300x2k = lf300x2k.where(
  TPI_small.lte(left_limit)
  .and(TPI_large.gt(left_limit))
  .and(TPI_large.lt(right_limit)),
  2
);

lf300x2k = lf300x2k.where(
  TPI_small.gte(right_limit)
  .and(TPI_large.gt(left_limit))
  .and(TPI_large.lt(right_limit)),
  10
);

lf300x2k = lf300x2k.where(
  TPI_small.lte(left_limit)
  .and(TPI_large.gte(right_limit)),
  3
);

lf300x2k = lf300x2k.where(
  TPI_small.lte(left_limit)
  .and(TPI_large.lte(left_limit)),
  1
);

lf300x2k = lf300x2k.where(
  TPI_small.gte(right_limit)
  .and(TPI_large.gte(right_limit)),
  11
);

lf300x2k = lf300x2k.where(
  TPI_small.gte(right_limit)
  .and(TPI_large.lte(left_limit)),
  9
);


var study_area = lf300x2k.select('constant');

// var lulc = area_lulc.select('class');
var demClipped = dem.clip(study_area.geometry());

/*10 landforms to 4 general landforms */

var slopy = lf300x2k.eq(6);
var plains = lf300x2k.eq(5);
var steep_slopes = lf300x2k.eq(8);
var ridge = lf300x2k.gte(9).or(lf300x2k.eq(7));
var valleys = lf300x2k.gte(1).and(lf300x2k.lte(4));

var plain_area = ee.Number((plains.eq(1)).multiply(ee.Image.pixelArea()).reduceRegion(
                            {
                              reducer : ee.Reducer.sum(),
                              geometry: study_area.geometry(),
                              scale:30,
                              maxPixels:1e10
                            }).get('constant')).divide(1e6);

var valley_area = ee.Number((valleys.eq(1)).multiply(ee.Image.pixelArea()).reduceRegion(
                            {
                              reducer : ee.Reducer.sum(),
                              geometry: study_area.geometry(),
                              scale:30,
                              maxPixels:1e10
                            }).get('constant')).divide(1e6);

var hill_slopes_area = ee.Number((steep_slopes.eq(1)).multiply(ee.Image.pixelArea()).reduceRegion(
                            {
                              reducer : ee.Reducer.sum(),
                              geometry: study_area.geometry(),
                              scale:30,
                              maxPixels:1e10
                            }).get('constant')).divide(1e6);
                            
var mwshed_area = ee.Number(study_area.neq(0).multiply(ee.Image.pixelArea()).reduceRegion({
                              reducer : ee.Reducer.sum(),
                              geometry: study_area.geometry(),
                              scale:30,
                              maxPixels:1e10
                            }).get('constant')).divide(1e6);


var ridge_area = ee.Number((ridge.eq(1)).multiply(ee.Image.pixelArea()).reduceRegion(
                            {
                              reducer : ee.Reducer.sum(),
                              geometry: study_area.geometry(),
                              scale:30,
                              maxPixels:1e10
                            }).get('constant')).divide(1e6);
                            
var slopy_area = ee.Number((slopy.eq(1)).multiply(ee.Image.pixelArea()).reduceRegion(
                            {
                              reducer : ee.Reducer.sum(),
                              geometry: study_area.geometry(),
                              scale:30,
                              maxPixels:1e10
                            }).get('constant')).divide(1e6);
                                                 
var myDictionary = ee.Dictionary({
  'id' : micro_watershed_id,
  'dem_std' : dem_std,
  'dem_mean' : dem_mean,
  'Total Plain Area': plain_area,
  'Total Upper Slope/steep slopes' : hill_slopes_area,
  'factor' : factor,
  'Area of Microwatershed' : mwshed_area, 
  'Total Valley Area': valley_area,
  'Total Ridge/Hilly Area': ridge_area,
  'Total Broad Slopy Area': slopy_area,
});

  var feature = ee.Feature(null, myDictionary);
  return feature;
};

// print('mt1k', mt1k);
var fc = mt1k.map(processGeometry);
print(fc);

Export.table.toDrive({
  collection: fc,
  description: filename,
  folder: export_location,
  fileFormat: 'CSV'
});

