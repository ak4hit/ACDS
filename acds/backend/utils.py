import requests

cache = {}

def get_geo(ip):
    if not ip:
        return None
    if ip in cache:
        return cache[ip]
    
    try:
        # Free API: ip-api.com
        response = requests.get(f"http://ip-api.com/json/{ip}?fields=status,country,city,lat,lon", timeout=3)
        data = response.json()
        if data.get('status') == 'success':
            geo = {
                'country': data.get('country'),
                'city': data.get('city'),
                'lat': data.get('lat'),
                'lon': data.get('lon')
            }
            cache[ip] = geo
            return geo
    except Exception:
        pass
    
    return None
