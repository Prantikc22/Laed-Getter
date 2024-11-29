# Lead Generation Web App

A powerful lead generation tool that helps you find and connect with businesses. Search by keywords and location, find contact information, and generate AI-powered outreach emails.

## Features

- Business search by keyword and location
- Accurate business data (name, address, website, phone)
- Email finder functionality
- Save and manage lead lists
- Export to Excel
- AI-powered email generation
- Modern, responsive UI with retractable sidebar

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
Create a `.env` file in the root directory with:
```
GOOGLE_MAPS_API_KEY=your_api_key
OPENAI_API_KEY=your_openai_api_key
SECRET_KEY=your_flask_secret_key
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

4. Run the application:
Backend:
```bash
python app.py
```

Frontend:
```bash
cd frontend
npm start
```

## API Keys Required

- Google Maps API Key (for business search)
- OpenAI API Key (for email generation)

## Tech Stack

- Backend: Flask
- Frontend: React
- Database: SQLAlchemy
- APIs: Google Places API, OpenAI
