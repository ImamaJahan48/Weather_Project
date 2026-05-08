import React, { useState } from "react";
import "./App.css";
import axios from "axios";

const API_BASE = "https://weather-project-seven-jet.vercel.app";

const weatherIcons = {
  Clear: "☀️", Clouds: "☁️", Rain: "🌧️",
  Drizzle: "🌦️", Thunderstorm: "⛈️", Snow: "❄️",
  Mist: "🌫️", Fog: "🌫️", Haze: "🌫️",
};

const weatherBg = {
  Clear: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
  Clouds: "linear-gradient(135deg, #1a1a2e, #2d3561, #454f8a)",
  Rain: "linear-gradient(135deg, #0f0f1a, #1a2744, #0d2137)",
  Thunderstorm: "linear-gradient(135deg, #0a0a0f, #1a0a2e, #2d1b69)",
  Snow: "linear-gradient(135deg, #0f1923, #1e2d3d, #2c3e50)",
  Default: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
};

function WeatherCard({ weather }) {
  const icon = weatherIcons[weather.condition] || "🌡️";
  return (
    <div className="weather-card">
      <div className="card-glow" />
      <div className="weather-header">
        <div className="location-info">
          <div className="city-name">{weather.city}</div>
          <div className="country-name">{weather.country}</div>
          <div className="condition-text">{weather.description}</div>
          {weather.cached && <div className="cached-pill">⚡ Cached result</div>}
        </div>
        <div className="weather-emoji">{icon}</div>
      </div>
      <div className="temp-display">
        <span className="temp-number">{Math.round(weather.temperature)}</span>
        <span className="temp-unit">°C</span>
      </div>
      <div className="feels-like">Feels like {Math.round(weather.feels_like)}°C</div>
      <div className="stats-row">
        <div className="stat-pill">
          <span>💧</span>
          <div>
            <div className="stat-val">{weather.humidity}%</div>
            <div className="stat-lbl">Humidity</div>
          </div>
        </div>
        <div className="stat-pill">
          <span>💨</span>
          <div>
            <div className="stat-val">{weather.wind_speed} m/s</div>
            <div className="stat-lbl">Wind</div>
          </div>
        </div>
        <div className="stat-pill">
          <span>🌤️</span>
          <div>
            <div className="stat-val">{weather.condition}</div>
            <div className="stat-lbl">Condition</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForecastCard({ day, index }) {
  const icon = weatherIcons[day.condition] || "🌡️";
  const date = new Date(day.date);
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <div className="forecast-card" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="fc-date">{dayName}</div>
      <div className="fc-datenum">{dateStr}</div>
      <div className="fc-icon">{icon}</div>
      <div className="fc-condition">{day.condition}</div>
      <div className="fc-temps">
        <span className="fc-max">{Math.round(day.max_temp)}°</span>
        <span className="fc-min">{Math.round(day.min_temp)}°</span>
      </div>
      <div className="fc-humidity">💧 {day.humidity}%</div>
    </div>
  );
}

function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bgGradient = weather
    ? weatherBg[weather.condition] || weatherBg.Default
    : weatherBg.Default;

  const fetchWeather = async () => {
    if (!city.trim()) return;
    setLoading(true);
    setError("");
    setWeather(null);
    setForecast(null);
    try {
      const [wRes, fRes] = await Promise.all([
        axios.get(`${API_BASE}/weather/${city}`),
        axios.get(`${API_BASE}/forecast/${city}`),
      ]);
      setWeather(wRes.data);
      setForecast(fRes.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError(`City "${city}" not found. Check spelling and try again.`);
      } else {
        setError("Cannot connect to backend. Make sure FastAPI is running on port 8000.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app" style={{ background: bgGradient }}>
      <div className="bg-orb orb1" />
      <div className="bg-orb orb2" />
      <div className="bg-orb orb3" />

      <div className="container">
        <div className="header">
          <div className="logo">🌤️</div>
          <h1 className="title">WeatherScope</h1>
          <p className="subtitle">Real-time weather powered by FastAPI</p>
        </div>

        <div className="search-wrapper">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search city... (e.g. Lahore, London, Tokyo)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchWeather()}
              className="search-input"
            />
            <button
              className={`search-btn ${loading ? "loading" : ""}`}
              onClick={fetchWeather}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : "Search"}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-card">
            <span>⚠️</span> {error}
          </div>
        )}

        {weather && <WeatherCard weather={weather} />}

        {forecast && (
          <div className="forecast-section">
            <div className="section-label">📅 5-Day Forecast</div>
            <div className="forecast-grid">
              {forecast.forecast.map((day, i) => (
                <ForecastCard key={day.date} day={day} index={i} />
              ))}
            </div>
          </div>
        )}

        <div className="footer">
          Built with FastAPI + React • Powered by OpenWeatherMap
        </div>
      </div>
    </div>
  );
}

export default App;
