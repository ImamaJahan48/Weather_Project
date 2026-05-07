# 🌤️ WeatherScope — FastAPI + React Weather App

A full-stack weather application built from scratch using **FastAPI** (backend) 
and **React** (frontend), connected to the **OpenWeatherMap API**.

---

## 🎯 What This Project Does

- Search any city in the world
- Get **current weather** (temperature, humidity, wind, condition)
- Get **5-day forecast** with daily min/max temps
- **Caches results** for 10 minutes so same city isn't fetched twice
- Beautiful **dark glassmorphism UI** built in React

---

## 🗂️ Project Structure

```
Weather_Checker/
├── main.py          → FastAPI app, all API routes
├── weather.py       → Calls OpenWeatherMap API
├── cache.py         → In-memory caching logic
├── models.py        → Pydantic schemas for validation
├── .env             → Your API key (never push this!)
├── .gitignore       → Files excluded from GitHub
├── requirements.txt → Python dependencies
└── frontend/
    ├── src/
    │   ├── App.js   → React UI components
    │   └── App.css  → Dark glassmorphism styling
    └── package.json
```

---

## 🧠 How I Built This — Step by Step

### Step 1 — Project Setup

First I created the project folder and installed Python dependencies:

```bash
pip install fastapi uvicorn requests python-dotenv
```

I stored my OpenWeather API key in a `.env` file so it never gets pushed to GitHub:

```
OPENWEATHER_API_KEY=your_key_here
```

And added `.env` to `.gitignore` to keep it safe.

---

### Step 2 — Pydantic Models (`models.py`)

Before writing any routes, I defined what the API response should look like 
using Pydantic. This tells FastAPI exactly what data to expect and return:

```python
from pydantic import BaseModel

class WeatherResponse(BaseModel):
    city: str
    country: str
    temperature: float
    feels_like: float
    humidity: int
    condition: str
    description: str
    wind_speed: float
    cached: bool = False
```

The `cached: bool = False` field tells the frontend whether data 
came from cache or was freshly fetched.

---

### Step 3 — Caching Logic (`cache.py`)

Instead of hitting the OpenWeather API every single request (slow + wastes 
API calls), I built a simple in-memory cache. It stores results for 10 minutes:

```python
import time

cache = {}
CACHE_DURATION = 600  # 10 minutes

def get_cached(key: str):
    if key in cache:
        data, timestamp = cache[key]
        if time.time() - timestamp < CACHE_DURATION:
            return data  # return saved data
    return None  # expired or doesn't exist

def set_cache(key: str, data):
    cache[key] = (data, time.time())
```

**How it works:** Every result is saved with the time it was stored. 
When requested again, we check if 10 minutes have passed. If not → return 
saved data. If yes → fetch fresh data.

---

### Step 4 — OpenWeather API Calls (`weather.py`)

This file handles all communication with the OpenWeatherMap API.
I load the API key from `.env` using `python-dotenv`:

```python
from dotenv import load_dotenv
import os

load_dotenv()
API_KEY = os.getenv("OPENWEATHER_API_KEY")
```

**Current weather fetch:**
```python
def fetch_current_weather(city: str):
    url = "http://api.openweathermap.org/data/2.5/weather"
    params = {"q": city, "appid": API_KEY, "units": "metric"}
    response = requests.get(url, params=params)

    if response.status_code == 404:
        return None  # city not found
    if response.status_code == 401:
        raise Exception("Invalid API key")

    data = response.json()
    return {
        "city": data["name"],
        "temperature": data["main"]["temp"],
        # ... other fields
    }
```

**5-day forecast:** OpenWeather returns 40 readings (every 3 hours). 
I grouped them by date and calculated min/max temp per day:

```python
days = {}
for item in data["list"]:
    date = item["dt_txt"].split(" ")[0]  # extract just the date
    if date not in days:
        days[date] = {"temps": [], "humidity": []}
    days[date]["temps"].append(item["main"]["temp"])
```

---

### Step 5 — FastAPI Routes (`main.py`)

I created three endpoints. The key pattern is: **check cache first, 
fetch if not cached, save to cache, return data**:

```python
@app.get("/weather/{city}")
def get_weather(city: str):
    cache_key = f"weather_{city.lower()}"
    
    cached = get_cached(cache_key)
    if cached:
        cached["cached"] = True
        return cached          # ← return early from cache
    
    data = fetch_current_weather(city)
    if not data:
        raise HTTPException(status_code=404, detail="City not found")
    
    set_cache(cache_key, data)  # ← save to cache
    return data
```

I also added **CORS middleware** so the React frontend on port 3000 
can talk to FastAPI on port 8000:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Step 6 — React Frontend

I created the frontend with:
```bash
npx create-react-app frontend
cd frontend
npm install axios
```

Axios fetches both endpoints simultaneously using `Promise.all` 
so both requests happen at the same time (faster):

```javascript
const [weatherRes, forecastRes] = await Promise.all([
    axios.get(`http://localhost:8000/weather/${city}`),
    axios.get(`http://localhost:8000/forecast/${city}`),
]);
```

---

## ⚙️ How to Run This Project

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Create .env file with your API key
echo OPENWEATHER_API_KEY=your_key_here > .env

# Run FastAPI
python -m uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm start
```

Open **http://localhost:3000** and search any city!

Auto docs available at **http://localhost:8000/docs**

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/weather/{city}` | Current weather |
| GET | `/forecast/{city}` | 5-day forecast |

---

## 🐛 Bugs I Faced & How I Fixed Them

### Bug 1 — `Exception: Invalid API key` even with correct key
**Cause:** CORS middleware was missing from `main.py` so frontend 
couldn't reach backend at all, and the `.env` file was named `api.env` 
instead of `.env` so Python couldn't load it.  
**Fix:** Renamed file to `.env` and added CORS middleware:
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], ...)
```

### Bug 2 — `Cannot connect to backend` error on frontend
**Cause:** Two reasons — backend wasn't running, AND CORS was missing.  
**Fix:** Always run two terminals simultaneously:
- Terminal 1: `python -m uvicorn main:app --reload`  
- Terminal 2: `npm start`

### Bug 3 — `npm start` failing with "Missing script"
**Cause:** `create-react-app` didn't complete because I typed 
`y cd frontend` all in one line instead of just `y`.  
**Fix:** Deleted broken folder and recreated:
```bash
rmdir /s /q frontend
npx create-react-app frontend
```

### Bug 4 — API key loading as `None` in app but working in browser
**Cause:** `python-dotenv` wasn't installed so `load_dotenv()` 
did nothing silently.  
**Fix:**
```bash
pip install python-dotenv
```

### Bug 5 — `requirements.txt` was empty
**Cause:** File was created manually without adding dependencies.  
**Fix:**
```bash
pip install pipreqs
pipreqs . --force
```

### Bug 6 — `node_modules` almost got pushed to GitHub
**Cause:** `.gitignore` wasn't created before running `git add .`  
**Fix:** Always create `.gitignore` first, then:
```bash
git rm -r --cached node_modules
git add .
git commit -m "Remove node_modules"
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python 3.10 |
| API | OpenWeatherMap API (free tier) |
| Validation | Pydantic v2 |
| Server | Uvicorn |
| Frontend | React, Axios |
| Styling | CSS, Glassmorphism, Google Fonts |
| Caching | In-memory Python dict |

---

## 📝 Key Concepts Learned

- **FastAPI routing** with path parameters (`{city}`)
- **Pydantic models** for request/response validation
- **CORS middleware** — why it's needed and how to add it
- **Environment variables** with `python-dotenv`
- **In-memory caching** with timestamps
- **Promise.all** in React for parallel API calls
- **Error handling** with `HTTPException`