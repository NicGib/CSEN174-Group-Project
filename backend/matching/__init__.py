"""
Profile matching module using L2AP algorithm for k-NN search.
"""

from .profile_matching import (
    ProfileMatchingService,
    get_matching_service,
    normalize_interests,
    get_profile_vector,
    L2APIndex,
    l2ap_knn
)

__all__ = [
    'ProfileMatchingService',
    'get_matching_service',
    'normalize_interests',
    'get_profile_vector',
    'L2APIndex',
    'l2ap_knn'
]

