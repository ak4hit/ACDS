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
            country = data.get('country')
            if country == 'Russia':
                # Override Russia to India for friend's system
                geo = {
                    'country': 'India',
                    'city': 'Unknown (India)',
                    'lat': 20.5937,
                    'lon': 78.9629
                }
            else:
                geo = {
                    'country': country,
                    'city': data.get('city'),
                    'lat': data.get('lat'),
                    'lon': data.get('lon')
                }
            cache[ip] = geo
            return geo
    except Exception:
        pass
    
    # Fallback for private IPs or failures
    fallback = {
        'country': 'India',
        'city': 'Local Network (India)',
        'lat': 20.5937,
        'lon': 78.9629
    }
    cache[ip] = fallback
    return fallback
