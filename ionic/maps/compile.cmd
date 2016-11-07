@echo off

REM download GDAL and sqlite3
REM download http://aeronav.faa.gov/enroute/09-15-2016/enr_l03.zip
REM Extract ENR_L03.tif

mkdir aviationCharts
cd aviationCharts
git init
git remote add -f origin https://github.com/jlmcgraw/aviationCharts.git
git config core.sparseCheckout true
echo clippingShapes/enroute > .git/info/sparse-checkout
git pull origin master
cd ..

DEL *.mbtiles

gdalwarp -co COMPRESS=DEFLATE -wo OPTIMIZE_SIZE=YES --config GDAL_CACHEMAX 500 -wm 500 -dstalpha -cutline aviationCharts/clippingShapes/enroute/ENR_L03.shp ENR_L03.tif ENR_L03_cropped.tif

gdal_translate -of MBTILES -co TILE_FORMAT=PNG8 -outsize 10%% 10%% -r bilinear ENR_L03_cropped.tif ENR_L03_10.mbtiles
gdal_translate -of MBTILES -co TILE_FORMAT=PNG8 -outsize 20%% 20%% -r bilinear ENR_L03_cropped.tif ENR_L03_20.mbtiles
gdal_translate -of MBTILES -co TILE_FORMAT=PNG8 -outsize 30%% 30%% -r bilinear ENR_L03_cropped.tif ENR_L03_30.mbtiles

> merge.txt (
@echo.PRAGMA journal_mode=PERSIST;
@echo.PRAGMA page_size=80000;
@echo.PRAGMA synchronous=OFF;
@echo.ATTACH DATABASE 'ENR_L03_10.mbtiles' AS source;
@echo.REPLACE INTO tiles SELECT * FROM source.tiles;
@echo.DETACH DATABASE source;
@echo.ATTACH DATABASE 'ENR_L03_20.mbtiles' AS source;
@echo.REPLACE INTO tiles SELECT * FROM source.tiles;
@echo.DETACH DATABASE source;
@echo.ATTACH DATABASE 'ENR_L03_30.mbtiles' AS source;
@echo.REPLACE INTO tiles SELECT * FROM source.tiles;
@echo.UPDATE metadata SET value=^(SELECT value FROM source.metadata WHERE name='minzoom'^) WHERE name='maxzoom';
@echo.DETACH DATABASE source;
)

COPY ENR_L03_10.mbtiles ENR_L03.mbtiles

sqlite3 ENR_L03.mbtiles < merge.txt

IF "%1" == "debug" GOTO END

DEL merge.txt
DEL *.mbtiles-journal
DEL *0.mbtiles
DEL *cropped.tif
RMDIR aviationCharts /S /Q

:END
ECHO DONE
PAUSE