var mt1k = angul; // Here comes feature Collection with mwsheds boundaries
var watershed_id = 'angul'; // name of export file
var dem_file = dem;


function numParse(feature){
  var id = feature.id();
  var area = msheds.filter(ee.Filter.eq('system:index', id))
  .geometry().area();
  return feature.set('area', area).set('id', id);
}
mt1k = mt1k.map(numParse);
// mt1k = mt1k.filter(ee.Filter.gt('area', 2000000));

var processGeometry = function(feature) {
  // Get the geometry of the feature
  var micro_watershed_id = feature.id();
  var micro_watershed = mt1k.filter(ee.Filter.eq('system:index', micro_watershed_id));
  var studyArea = micro_watershed.geometry();
var demClipped = dem_file.clip(studyArea);
var dem_std = demClipped.reduceRegion({
  reducer: ee.Reducer.stdDev(), bestEffort:true}).get('elevation');

var small_inner = ee.Number(5); // here 5 represent number of pixels. Each pixel is 30m in SRTM DEM
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

var TPI_small = demClipped.subtract(focalmean_small);
var TPI_large = demClipped.subtract(focalmean_large);

var mean = TPI_small.reduceRegion({reducer: ee.Reducer.mean(), bestEffort:true}).get('elevation');
TPI_small = TPI_small.subtract(ee.Number(mean));
var stdDev = TPI_small.reduceRegion({reducer: ee.Reducer.stdDev(), bestEffort:true}).get('elevation');
TPI_small = TPI_small
                .divide(ee.Number(stdDev))
                .multiply(ee.Number(100))
                .add(ee.Number(0.5));
var mean = TPI_large.reduceRegion({reducer: ee.Reducer.mean(), bestEffort:true}).get('elevation');
var TPI_large = TPI_large.subtract(ee.Number(mean));

var stdDev = TPI_large.reduceRegion({reducer: ee.Reducer.stdDev(),  bestEffort:true}).get('elevation');
var TPI_large = TPI_large
                .divide(ee.Number(stdDev))
                .multiply(ee.Number(100))
                .add(ee.Number(0.5));
                // .toInt();
                
var combined_image = TPI_small.addBands(TPI_large);
var stdDev = TPI_large.reduceRegion({reducer: ee.Reducer.stdDev(), bestEffort:true}).get('elevation');
var slope = ee.Terrain.slope(dem_file);
var clippedSlope = slope.clip(studyArea);

// ------------------------------------------------------------------------
// Classification
// dem_std = ee.Number(dem_std).add(1);
// var factor = ee.Number(3.2).subtract(ee.Number(dem_std).log10());
// factor = factor.max(0.3);
// // print("factor : ", factor);

// var right_limit = ee.Number(100).multiply(factor);
// var left_limit = ee.Number(-100).multiply(factor);


var lf300x2k = ee.Image.constant(0).clip(studyArea);

dem_std = ee.Number(dem_std).add(1);
var a = 3;
var b = 1.0;
var min_factor = 0.3;
var fac_1 = ee.Number(dem_std).log10().multiply(b);
var factor = ee.Number(a).subtract(fac_1);
factor = factor.max(min_factor);

var right_limit = ee.Number(100).multiply(factor);
var left_limit = ee.Number(-100).multiply(factor);

// print("right limit : ", right_limit);
// print("left limit : ", left_limit);

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

var elevation_plains = demClipped.updateMask(lf300x2k.eq(5));
// Map.addLayer(elevation_plains);

var samples = elevation_plains.sample({
    region: elevation_plains.geometry(),
    scale : 30,
    numPixels:50000,
    tileScale:4
  })

var cluster = ee.Clusterer.wekaKMeans(3).train(samples);
var elevation_clusters = elevation_plains.cluster(cluster);
// Map.addLayer(elevation_clusters, {palette : ['#a50026', '#e0f3f8', '#313695'].reverse()});

var cl1 = elevation_plains.updateMask(elevation_clusters.eq(0));
var cl2 = elevation_plains.updateMask(elevation_clusters.eq(1));
var cl3 = elevation_plains.updateMask(elevation_clusters.eq(2));

// var elevation_clusters_centroids = elevation_clusters.clusterCentroids();
// var centroids = elevation_plains.reduceConnectedComponents(reducer, 'label', 256);
// print(elevation_clusters_centroids);

var elev1 = ee.Number(cl1.reduceRegion(
                {
                  reducer : ee.Reducer.mean(),
                  geometry: lf300x2k.geometry(),
                  scale:30,
                  maxPixels:1e10
                  , bestEffort:true
                }).get('elevation'));


var elev2 = ee.Number(cl2.reduceRegion(
                {
                  reducer : ee.Reducer.mean(),
                  geometry: lf300x2k.geometry(),
                  scale:30,
                   maxPixels:1e10, bestEffort:true
                }).get('elevation'));


var elev3 = ee.Number(cl3.reduceRegion(
                {
                  reducer : ee.Reducer.mean(),
                  geometry: lf300x2k.geometry(),
                  scale:30,
                   maxPixels:1e10, bestEffort:true
                }).get('elevation'));
                
var highest_landform = ee.Image(ee.Algorithms.If(
  elev1.gt(elev2).and(elev1.gt(elev3)), cl1,
  ee.Algorithms.If(
    elev2.gt(elev1).and(elev2.gt(elev3)), cl2,
    cl3
  )
));

var low_landform = ee.Image(ee.Algorithms.If(
  elev1.lt(elev2).and(elev1.lt(elev3)), cl1,
  ee.Algorithms.If(
    elev2.lt(elev1).and(elev2.lt(elev3)), cl2,
    cl3
  )
));



// print("Cl1 elev", cl1_elev);

var high_mean = ee.Number(highest_landform.reduceRegion(
                {
                  reducer : ee.Reducer.mean(),
                  geometry: lf300x2k.geometry(),
                  scale:30,
                   maxPixels:1e10, bestEffort:true
                }).get('elevation'));

var low_mean = ee.Number(low_landform.reduceRegion(
                {
                  reducer : ee.Reducer.mean(),
                  geometry: lf300x2k.geometry(),
                  scale:30,
                   maxPixels:1e10, bestEffort:true
                }).get('elevation'));
                
var middle_landform = ee.Image(ee.Algorithms.If(
  elev1.neq(high_mean).and(elev1.neq(low_mean)), cl1,
  ee.Algorithms.If(
    elev2.neq(high_mean).and(elev2.neq(low_mean)), cl2,
    cl3
  )
));

var middle_mean = ee.Number(middle_landform.reduceRegion(
                {
                  reducer : ee.Reducer.mean(),
                  geometry: lf300x2k.geometry(),
                  scale:30,
                   maxPixels:1e10, bestEffort:true
                }).get('elevation'));
  
// print("middle_mean", middle_mean);
// function convert_to_binary(image){
//   var binaryImage = image.updateMask(image.neq(0));
//   // var binaryImage = mask.selfMask();
//   return binaryImage;
// }

// Map.addLayer(low_landform, {}, "Low_LF");
var low_plains_cluster = low_landform.neq(0);
// Map.addLayer(low_plains_cluster, {}, "Low plains cluster");
var mid_plains_cluster = middle_landform.neq(0);
var high_plains_cluster = highest_landform.neq(0);

// Map.addLayer(high_plains_cluster, {}, "high_plains_cluster")

var plains_clustered = ee.Image.constant(0).clip(studyArea);
plains_clustered = plains_clustered.where(
  low_plains_cluster.eq(1),
  1
);

plains_clustered = plains_clustered.where(
  mid_plains_cluster.eq(1),
  2
);

plains_clustered = plains_clustered.where(
  high_plains_cluster.eq(1),
  3
);

// // var plains_clustered = low_plains_cluster.add(mid_plains_cluster.multiply(2)).add(high_plains_cluster.multiply(3));
// Map.addLayer(plains_clustered, {}, "updated_cluster")


function calculate_percent_difference(plain1_mean, plain2_mean){
    var result = ((ee.Number(plain2_mean).subtract(plain1_mean)).divide(plain1_mean)).multiply(100);
    return result.abs()
}

var percent_diff_low_mid = calculate_percent_difference(low_mean, middle_mean);
var percent_diff_mid_high = calculate_percent_difference(middle_mean, high_mean);


plains_clustered = ee.Image(ee.Algorithms.If(
  percent_diff_mid_high.lte(0),
  
  plains_clustered.where(
    plains_clustered.eq(3),
    2
  ),
  plains_clustered
));

plains_clustered =  ee.Image(
  ee.Algorithms.If(
    percent_diff_low_mid.lte(0), 
    plains_clustered.where(
      plains_clustered.eq(2),
      1
    ),
    plains_clustered
  )
);


lf300x2k = lf300x2k.where(
  plains_clustered.eq(1),
  12
);

lf300x2k = lf300x2k.where(
  plains_clustered.eq(2),
  13
);

lf300x2k = lf300x2k.where(
  plains_clustered.eq(3),
  14
);

  return lf300x2k;
};

// Map the function over the FeatureCollection
// print('mt1k', mt1k);
var landforms = ee.ImageCollection(mt1k.map(processGeometry));
var geom = landforms.union();
var collected = landforms.mosaic();
var clipped_landforms = collected.clip(geom);

// print(landforms);
var exportOptions = {
  image: clipped_landforms,
  description: watershed_id, // Name for the exported image
  region: geom,
  scale: 30,
  maxPixels: 3784216672400, // Set an appropriate maxPixels value
};

Export.image.toAsset(exportOptions);
