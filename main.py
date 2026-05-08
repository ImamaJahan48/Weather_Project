from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import WeatherResponse, ForecastResponse
from weather import fetch_current_weather, fetch_forecast
from cache import get_cached, set_cache

app = FastAPI(title="Weather API", description="Current weather + 5 day forecast")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","weather-project-seven-jet.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Weather API is running!", "endpoints": ["/weather/{city}", "/forecast/{city}"]}

@app.get("/weather/{city}", response_model=WeatherResponse)
def get_weather(city: str):
    cache_key = f"weather_{city.lower()}"
    cached = get_cached(cache_key)
    if cached:
        cached["cached"] = True
        return cached
    data = fetch_current_weather(city)
    if not data:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")
    set_cache(cache_key, data)
    data["cached"] = False
    return data

@app.get("/forecast/{city}", response_model=ForecastResponse)
def get_forecast(city: str):
    cache_key = f"forecast_{city.lower()}"
    cached = get_cached(cache_key)
    if cached:
        cached["cached"] = True
        return cached
    data = fetch_forecast(city)
    if not data:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")
    set_cache(cache_key, data)
    data["cached"] = False
    return data