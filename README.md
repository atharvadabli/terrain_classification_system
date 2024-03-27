# Terrain Classification System

This is an Earth Engine script to export terrain of an area (given as a Feature Collection) as a TIF file asset using Topographic Position Index.

# Input : 
mt1k : Feature Collection (e.g. collection of microwatersheds of a block etc. as shape file)
dem : SRTM DEM (we have used 30m res).
watershed_id : name of the export file as string.

The inner radius and outer radius can be changed in line 24, 31. Currently they are set as follows :
Small Scale TPI : 5 to 10 px (5 x 30 = 150 m to 300 m)
Large Scale TPI : 62 to 67 px ( About 1800-2000 m)

We have used factor λ as :
λ = max (a - b * log (std_dev_elev + 1), min_fac)

a and b can be set in line 81
Currently,
a = 3; b = 1; min_fac = 0.3
which works good for all the areas we are working in.


# Labels : 
• 1: ’V-shape river valleys, Deep narrow canyons’
• 2: ’Lateral midslope incised drainages, Local valleys in plains’
• 3: ’Upland incised drainages Stream headwaters’
• 4: ’U-shape valleys’
• 5: ’Broad Flat Areas’
• 6: ’Broad open slopes’
• 7: ’Mesa tops’
• 8: ’Upper Slopes’
• 9: ’Local ridge/hilltops within broad valleys’
• 10: ’Lateral midslope drainage divides, Local ridges in plains’
• 11: ’Mountain tops, high ridges’
• 12: ’Low Plains’
• 13: ’Medium Plains’
• 14: ’High Plains’

