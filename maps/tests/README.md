# Map Download Tests

This directory contains comprehensive tests for the map download functionality using pytest.

## Test Coverage

The test suite covers:

### Validation Functions
- **Latitude validation**: Tests valid range (-90 to 90), invalid ranges, and invalid types
- **Longitude validation**: Tests valid range (-180 to 180), invalid ranges, and invalid types  
- **Zoom validation**: Tests valid range (1 to 18), negative values, and invalid types
- **Style validation**: Tests valid styles (terrain, satellite, streets) and invalid styles
- **Format validation**: Tests valid formats (html, png) and invalid formats
- **Radius validation**: Tests positive values and negative values (should fail)

### Utility Functions
- **Title sanitization**: Tests HTML injection prevention and length limits
- **Bounding box calculation**: Tests with various coordinates and edge cases

### Map Building
- **Build map function**: Tests with different styles and data configurations
- **Enhanced pin placement**: Tests the improved trailhead clustering system

### Edge Cases
- **Extreme coordinates**: Tests with polar regions and international date line
- **Empty data**: Tests with empty GeoJSON data
- **Negative radius**: Tests behavior with negative radius values

## Running Tests

### Prerequisites
Install the required dependencies:
```bash
pip install -r ../requirements.txt
```

### Run All Tests
```bash
# From the backend directory
python run_tests.py

# Or directly with pytest
pytest maps/tests/ -v
```

### Run Specific Test Classes
```bash
# Test only validation functions
pytest maps/tests/test_download_map.py::TestValidationFunctions -v

# Test only pin placement functionality
pytest maps/tests/test_download_map.py::TestEnhancedPinPlacement -v
```

### Run with Coverage
```bash
pytest maps/tests/ --cov=download_map --cov-report=html
```

## Test Structure

- `test_download_map.py`: Main test file with all test cases
- `README.md`: This documentation file

## Test Cases Included

1. **Invalid latitude/longitude**: Tests coordinates outside valid ranges
2. **Negative zoom**: Tests zoom levels below 1
3. **Correct instance**: Tests valid map creation with proper parameters
4. **Negative radius**: Tests radius validation (should raise error)
5. **Invalid style**: Tests unsupported map styles (should raise error)

## Enhanced Pin Placement Features

The improved trailhead pin placement system includes:

- **Smart clustering**: Groups nearby trailheads to reduce map clutter
- **Custom icons**: Uses Font Awesome hiking icons for better visual distinction
- **Grouped markers**: Shows multiple trailheads in the same area as a single marker
- **Enhanced popups**: Rich HTML popups with better formatting and information
- **Configurable clustering**: Adjustable cluster radius and zoom-based clustering behavior
