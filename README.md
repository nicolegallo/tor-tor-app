# Tori Time Tracker 2.0

A cute, mobile-friendly web app for tracking every precious minute spent
together.\
Built by **Nicole** for **Tori** 💕

`<img src="https://i.ibb.co/NtqRfCM/nictoria-hand.png" width="150" />`{=html}

------------------------------------------------------------------------

## ✨ Overview

Tori Time Tracker 2.0 lets you:

-   Start and stop a "Tori Time" session\
-   Track where you were and who claimed the date (Nicole, Tori, or
    Nictori)\
-   Automatically compute the time spent\
-   Save each entry locally and send it to a connected **Google Sheets**
    log\
-   Edit or delete previous entries locally\
-   View total time and number of dates\
-   Enjoy a fully mobile-optimized layout with a sticky Start/Stop bar\
-   Install on iPhone Home Screen like a native app

This project uses **pure HTML, CSS, JS**, **localStorage**, and a
**Google Apps Script** as a write-only API.

------------------------------------------------------------------------

## 📁 File Structure

    tori-time-tracker/
    │── index.html
    │── style.css
    │── script.js
    │── README.md

------------------------------------------------------------------------

## 🚀 Deployment (Netlify)

### Manual Deploy

1.  Go to https://app.netlify.com\
2.  Click **Add new site → Deploy manually**\
3.  Drag and drop your whole project folder\
4.  Instantly deployed

------------------------------------------------------------------------

## 📊 Google Sheets Integration

The app sends data to a Google Apps Script endpoint with a POST request.

Your sheet columns must match:

    Date # | Date | Day of Week | Where | Date Claimed By | Time Started | Time Ended | Time Spent | Total Tori Time

Only new rows are appended.

------------------------------------------------------------------------

## 🛠 Local Development

Run a simple local server:

    python3 -m http.server

Visit http://localhost:8000

------------------------------------------------------------------------

## ❤️ Credits

Built by **Nicole Gallo**\
Dedicated to **Tori**\
Designed for documenting the Nictorian Era ✨
