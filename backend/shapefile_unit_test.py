# tests/test_shapefile_reader.py
import sys, os


sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))




import io
import zipfile
import pytest
from unittest.mock import patch, Mock
from services.shapefile_reader import ShapefileReader






def test_read_placeholder():
   r = ShapefileReader()
   out = r.read_shapefile(None)
   assert out["success"]


print("start\n")
def make_zip(files):
   """Helper: create an in-memory ZIP from dict of {filename: content}"""
   buf = io.BytesIO()
   with zipfile.ZipFile(buf, "w") as z:
       for name, data in files.items():
           z.writestr(name, data)
   buf.seek(0)
   return buf




# NORMAL CASES
@patch("services.shapefile_reader.gpd.read_file")
def test_1_read_valid_shapefile(mock_read):
   """Test 1 (Normal): Successfully read a valid shapefile"""
   # Mock geopandas returning a GeoDataFrame-like object
   mock_gdf = Mock()
   mock_gdf.__len__.return_value = 100
   mock_read.return_value = mock_gdf


   z = make_zip({"roads.shp": "x", "roads.shx": "x", "roads.dbf": "x", "roads.prj": "x"})
   reader = ShapefileReader()
   result = reader.read_shapefile(z)


   assert result["success"]
   assert result["feature_count"] == 100
   assert "roads" in result["filename"]




# EDGE CASES
@patch("services.shapefile_reader.gpd.read_file")
def test_2_read_single_feature_shapefile(mock_read):
   """Test 2 (Edge): Shapefile with only a single feature"""
   mock_gdf = Mock()
   mock_gdf.__len__.return_value = 1
   mock_read.return_value = mock_gdf


   z = make_zip({"single.shp": "x", "single.shx": "x", "single.dbf": "x", "single.prj": "x"})
   reader = ShapefileReader()
   result = reader.read_shapefile(z)


   assert result["success"]
   assert result["feature_count"] == 1




@patch("services.shapefile_reader.gpd.read_file")
def test_3_read_boundary_projection(mock_read):
   """Test 3 (Edge): Shapefile with edge-case projection like EPSG:3857"""
   mock_gdf = Mock()
   mock_gdf.__len__.return_value = 25
   mock_gdf.crs = "EPSG:3857"
   mock_read.return_value = mock_gdf


   z = make_zip({"boundaries.shp": "x", "boundaries.shx": "x", "boundaries.dbf": "x", "boundaries.prj": "x"})
   reader = ShapefileReader()
   result = reader.read_shapefile(z)


   assert result["success"]
   assert result["crs"] == "EPSG:3857"




# INVALID CASES
@patch("services.shapefile_reader.gpd.read_file")
def test_4_read_corrupted_shapefile(mock_read):
   """Test 4 (Invalid): Shapefile that is corrupted or unreadable"""
   mock_read.side_effect = OSError("Corrupted shapefile")


   z = make_zip({"broken.shp": "x", "broken.shx": "x", "broken.dbf": "x", "broken.prj": "x"})
   reader = ShapefileReader()
   result = reader.read_shapefile(z)


   assert not result["success"]
   assert "Corrupted" in result["error"]




@patch("services.shapefile_reader.gpd.read_file")
def test_5_read_invalid_format(mock_read):
   """Test 5 (Invalid): Provided file is not a shapefile (.csv or missing components)"""
   mock_read.side_effect = ValueError("Unsupported file format")


   z = make_zip({"data.csv": "id,lat,lon\n1,0,0"})
   reader = ShapefileReader()
   result = reader.read_shapefile(z)


   assert not result["success"]
   assert "Unsupported" in result["error"]