import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENWEATHER_API_KEY")
print(f"🔑 API KEY IN WEATHER.PY: {API_KEY}")  # ← add this
BASE_URL = "http://api.openweathermap.org/data/2.5"

def fetch_current_weather(city: str):
    url = f"{BASE_URL}/weather"
    params = {
        "q": city,
        "appid": API_KEY,
        "units": "metric"  # celsius
    }
    response = requests.get(url, params=params)

    if response.status_code == 404:
        return None  # city not found
    if response.status_code == 401:
        raise Exception("Invalid API key")

    data = response.json()
    return {
        "city": data["name"],
        "country": data["sys"]["country"],
        "temperature": data["main"]["temp"],
        "feels_like": data["main"]["feels_like"],
        "humidity": data["main"]["humidity"],
        "condition": data["weather"][0]["main"],
        "description": data["weather"][0]["description"],
        "wind_speed": data["wind"]["speed"],
    }

def fetch_forecast(city: str):
    url = f"{BASE_URL}/forecast"
    params = {
        "q": city,
        "appid": API_KEY,
        "units": "metric",
        "cnt": 40  # 5 days x 8 readings per day
    }
    response = requests.get(url, params=params)

    if response.status_code == 404:
        return None
    if response.status_code == 401:
        raise Exception("Invalid API key")

    data = response.json()

    # Group by date and get daily summary
    days = {}
    for item in data["list"]:
        date = item["dt_txt"].split(" ")[0]  # get just the date part
        if date not in days:
            days[date] = {
                "date": date,
                "temps": [],
                "humidity": [],
                "condition": item["weather"][0]["main"],
                "description": item["weather"][0]["description"],
            }
        days[date]["temps"].append(item["main"]["temp"])
        days[date]["humidity"].append(item["main"]["humidity"])

    forecast = []
    for date, info in days.items():
        forecast.append({
            "date": info["date"],
            "min_temp": round(min(info["temps"]), 1),
            "max_temp": round(max(info["temps"]), 1),
            "condition": info["condition"],
            "description": info["description"],
            "humidity": int(sum(info["humidity"]) / len(info["humidity"])),
        })

    return {
        "city": data["city"]["name"],
        "country": data["city"]["country"],
        "forecast": forecast
    }