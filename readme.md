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

---

## ⚠️ Mistakes I Made While Pushing to GitHub & How I Fixed Them

### Mistake 1 — `.env` file committed to git
**What happened:** Ran `git add .` which included `.env` containing the real API key.  
GitHub blocked the push with `GH013: Repository rule violations — Push cannot contain secrets`.  
**Fix:**
```bash
git rm --cached .env
python -m git_filter_repo --path .env --invert-paths --force
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main --force
```
Also regenerate your API key immediately after exposing it.

---

### Mistake 2 — `.gitignore` was named `we.gitignore`
**What happened:** File was named wrong so git never read it — meaning `.env` and `node_modules` were not excluded.  
**Fix:**
```bash
rename we.gitignore .gitignore
```

---

### Mistake 3 — `node_modules` almost got pushed
**What happened:** Because `.gitignore` was wrongly named, `node_modules` (200MB+) was being tracked.  
**Fix:** Always verify before pushing:
```bash
git ls-files | findstr node_modules
```
If nothing returns → you're safe ✅

---

### Mistake 4 — README was empty on GitHub
**What happened:** Committed and pushed before saving the file in VSCode. Content was visible on screen but not saved to disk.  
**Fix:** Always check VSCode tab before pushing:
- `• README.md` → unsaved ❌  
- `README.md` → saved ✅

```bash
git add README.md
git commit -m "Add README"
git push
```

---

### Mistake 5 — Pushed to non-existent repository
**What happened:** Ran `git push` before creating the repo on GitHub — got `fatal: repository not found`.  
**Fix:** Always create the repo on GitHub website FIRST, then:
```bash
git remote remove origin
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

---

### Mistake 6 — `axios` installed in wrong folder
**What happened:** Ran `npm install axios` in project root instead of inside `frontend/`.  
**Fix:**
```bash
cd frontend
npm install axios
```

---

### Mistake 7 — `create-react-app` broke due to typo
**What happened:** When prompted `Ok to proceed? (y)` typed `y cd frontend` all in one line — broke the installation.  
**Fix:** When prompted just type `y` and press Enter only. Wait for full completion before typing anything else.

---

### Mistake 8 — Pushed to two repos by accident
**What happened:** After successful push, ran remote commands again and accidentally pushed to a second repo.  
**Fix:** After a successful push — stop. Check GitHub first before running more commands. Delete duplicate via GitHub Settings.

---

## ✅ Golden Rules for GitHub

```
1. Create .gitignore FIRST → then git add .
2. .env must ALWAYS be in .gitignore  
3. Check VSCode tab has no • before committing
4. Create GitHub repo on website BEFORE pushing
5. npm install always runs INSIDE frontend/
6. Read the full error before running more commands
7. One push → check GitHub → then stop
```