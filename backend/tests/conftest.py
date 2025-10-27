"""
Pytest configuration and shared fixtures for all tests
"""

import pytest
import os
import sys
from unittest.mock import Mock, patch

# Add the parent directory to the path so we can import from backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def mock_firebase_admin():
    """Mock Firebase Admin SDK"""
    with patch('firebase_admin.initialize_app') as mock_init, \
         patch('firebase_admin.credentials') as mock_creds, \
         patch('firebase_admin.firestore') as mock_firestore, \
         patch('firebase_admin.auth') as mock_auth:
        
        # Mock Firestore client
        mock_db = Mock()
        mock_firestore.client.return_value = mock_db
        
        yield {
            'init_app': mock_init,
            'credentials': mock_creds,
            'firestore': mock_firestore,
            'auth': mock_auth,
            'db': mock_db
        }


@pytest.fixture
def mock_requests():
    """Mock requests library for HTTP calls"""
    with patch('requests.post') as mock_post, \
         patch('requests.get') as mock_get:
        yield {
            'post': mock_post,
            'get': mock_get
        }


@pytest.fixture
def mock_folium():
    """Mock folium library for map generation"""
    with patch('folium.Map') as mock_map, \
         patch('folium.TileLayer') as mock_tile_layer, \
         patch('folium.FeatureGroup') as mock_feature_group, \
         patch('folium.GeoJson') as mock_geojson, \
         patch('folium.Marker') as mock_marker, \
         patch('folium.MarkerCluster') as mock_marker_cluster, \
         patch('folium.Icon') as mock_icon, \
         patch('folium.Popup') as mock_popup:
        
        # Configure mock map
        mock_map_instance = Mock()
        mock_map.return_value = mock_map_instance
        
        yield {
            'Map': mock_map,
            'TileLayer': mock_tile_layer,
            'FeatureGroup': mock_feature_group,
            'GeoJson': mock_geojson,
            'Marker': mock_marker,
            'MarkerCluster': mock_marker_cluster,
            'Icon': mock_icon,
            'Popup': mock_popup,
            'map_instance': mock_map_instance
        }


@pytest.fixture
def sample_event_data():
    """Sample event data for testing"""
    from datetime import datetime, timedelta
    
    return {
        'title': 'Test Hiking Event',
        'location': 'Test Trail',
        'event_date': datetime.now() + timedelta(days=7),
        'description': 'A test hiking event',
        'max_attendees': 20,
        'difficulty_level': 'beginner',
        'organizer_uid': 'test_organizer_123',
        'attendees': ['user1', 'user2'],
        'created_at': datetime.now()
    }


@pytest.fixture
def sample_user_data():
    """Sample user data for testing"""
    return {
        'uid': 'test_user_123',
        'name': 'Test User',
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123',
        'totalHikes': 5,
        'hikingLevel': 'intermediate',
        'isActive': True
    }


@pytest.fixture
def sample_osm_data():
    """Sample OSM data for testing"""
    return {
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'properties': {
                    'name': 'Test Trail',
                    'sac_scale': 'hiking',
                    'surface': 'dirt',
                    'network': 'local'
                },
                'geometry': {
                    'type': 'LineString',
                    'coordinates': [[-121.9390, 37.3496], [-121.9380, 37.3506]]
                }
            }
        ]
    }


@pytest.fixture
def sample_trailheads_data():
    """Sample trailheads data for testing"""
    return {
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'properties': {
                    'NAME': 'Test Trailhead',
                    'ADDRESS': '123 Test St',
                    'CITY': 'Test City',
                    'STATE': 'CA',
                    'ZIPCODE': '12345',
                    'SOURCE_ORIGINATOR': 'USGS'
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates': [-121.9390, 37.3496]
                }
            }
        ]
    }


@pytest.fixture(autouse=True)
def setup_test_environment():
    """Setup test environment before each test"""
    # Mock environment variables
    with patch.dict(os.environ, {
        'FIREBASE_API_KEY': 'test_api_key',
        'FIREBASE_AUTH_DOMAIN': 'test-project.firebaseapp.com',
        'FIREBASE_PROJECT_ID': 'test-project',
        'FIREBASE_STORAGE_BUCKET': 'test-project.appspot.com',
        'FIREBASE_MESSAGING_SENDER_ID': '123456789',
        'FIREBASE_APP_ID': '1:123456789:web:abcdef'
    }):
        yield


@pytest.fixture
def mock_service_account():
    """Mock service account file"""
    service_account_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), 
        'accounts', 
        'serviceAccountKey.json'
    )
    
    with patch('os.path.exists') as mock_exists:
        mock_exists.return_value = True
        with patch('builtins.open', mock_open_service_account()):
            yield service_account_path


def mock_open_service_account():
    """Mock service account file content"""
    service_account_content = {
        "type": "service_account",
        "project_id": "test-project",
        "private_key_id": "test_key_id",
        "private_key": "-----BEGIN PRIVATE KEY-----\ntest_key\n-----END PRIVATE KEY-----\n",
        "client_email": "test@test-project.iam.gserviceaccount.com",
        "client_id": "123456789",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com"
    }
    
    def mock_open(file_path, mode='r'):
        if 'serviceAccountKey.json' in file_path:
            return Mock(read=Mock(return_value=json.dumps(service_account_content)))
        return Mock(read=Mock(return_value=""))
    
    return mock_open


# Import json for the mock
import json
