"""
Pulse — Autonomous Daily Summary Bot
Fetches live weather + a motivational quote and writes a daily report.
Designed to run via GitHub Actions on a daily cron.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

CITY = os.environ.get("PULSE_CITY", "London")
OUT_DIR = Path("reports")
OUT_DIR.mkdir(exist_ok=True)


def _get(url: str, timeout: int = 15) -> str:
    req = Request(url, headers={"User-Agent": "PulseBot/1.0 (+github-actions)"})
    with urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def fetch_weather(city: str) -> dict:
    try:
        raw = _get(f"https://wttr.in/{city}?format=j1")
        data = json.loads(raw)
        cur = data["current_condition"][0]
        area = data["nearest_area"][0]
        return {
            "ok": True,
            "city": area["areaName"][0]["value"],
            "country": area["country"][0]["value"],
            "temp_c": cur["temp_C"],
            "feels_c": cur["FeelsLikeC"],
            "condition": cur["weatherDesc"][0]["value"],
            "humidity": cur["humidity"],
            "wind_kph": cur["windspeedKmph"],
        }
    except (URLError, KeyError, ValueError, TimeoutError) as e:
        return {"ok": False, "error": str(e)}


def fetch_quote() -> dict:
    try:
        raw = _get("https://zenquotes.io/api/random")
        item = json.loads(raw)[0]
        return {"ok": True, "quote": item["q"], "author": item["a"]}
    except Exception as e:  # noqa: BLE001
        return {
            "ok": True,
            "quote": "The only way to do great work is to love what you do.",
            "author": "Steve Jobs",
            "fallback": True,
            "error": str(e),
        }


def build_report(weather: dict, quote: dict) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "================================",
        "       PULSE DAILY SUMMARY      ",
        "================================",
        f"Generated: {now}",
        "",
        "── WEATHER ─────────────────────",
    ]
    if weather["ok"]:
        lines += [
            f"Location : {weather['city']}, {weather['country']}",
            f"Condition: {weather['condition']}",
            f"Temp     : {weather['temp_c']}°C (feels {weather['feels_c']}°C)",
            f"Humidity : {weather['humidity']}%",
            f"Wind     : {weather['wind_kph']} km/h",
        ]
    else:
        lines.append(f"Weather unavailable: {weather.get('error')}")
    lines += [
        "",
        "── QUOTE ───────────────────────",
        f"\"{quote['quote']}\"",
        f"  — {quote['author']}",
        "",
        "── STATUS ──────────────────────",
        f"weather_api : {'OK' if weather['ok'] else 'FAIL'}",
        f"quote_api   : {'OK (fallback)' if quote.get('fallback') else 'OK'}",
        "================================",
    ]
    return "\n".join(lines)


def main() -> int:
    weather = fetch_weather(CITY)
    quote = fetch_quote()
    report = build_report(weather, quote)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    (OUT_DIR / f"summary-{today}.txt").write_text(report, encoding="utf-8")
    (OUT_DIR / "latest.txt").write_text(report, encoding="utf-8")
    (OUT_DIR / "latest.json").write_text(
        json.dumps({"date": today, "weather": weather, "quote": quote}, indent=2),
        encoding="utf-8",
    )
    print(report)
    return 0 if weather["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
