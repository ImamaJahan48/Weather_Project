import time

cache = {}
CACHE_DURATION = 600

def get_cached(key: str):
    if key in cache:
        data, timestamp = cache[key]
        if time.time() - timestamp < CACHE_DURATION:
            return data
    return None

def set_cache(key: str, data):
    cache[key] = (data, time.time())