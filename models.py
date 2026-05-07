from pydantic import BaseModel
from typing import Optional

class WeatherResponse(BaseModel):
    city: str
    country: str
    temperature: float
    feels_like: float
    humidity: int
    condition: str
    description: str
    wind_speed: float
    cached: bool = False  # tells user if data came from cache

class ForecastDay(BaseModel):
    date: str
    min_temp: float
    max_temp: float
    condition: str
    description: str
    humidity: int

class ForecastResponse(BaseModel):
    city: str
    country: str
    forecast: list[ForecastDay]
    cached: bool = False