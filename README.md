# Smart Insurance Risk Predictor

AI-powered insurance premium prediction and risk classification using Machine Learning.

## Project Structure

```
├── main.py              # Backend: ML pipeline + Flask API server
├── insurance.csv         # Training dataset
├── models/               # Saved ML models (auto-generated)
├── src/
│   ├── App.tsx           # React frontend UI
│   ├── main.tsx          # React entry point
│   └── index.css         # Styles
├── index.html            # Vite HTML entry
├── requirements.txt      # Python dependencies
├── package.json          # Node.js dependencies
├── vite.config.ts        # Vite configuration
└── tsconfig.json         # TypeScript configuration
```

## Setup & Run

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend (Python/Flask)

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run (trains models + starts API on port 5000)
python main.py
```

### Frontend (React/Vite)

```bash
# Install dependencies
npm install

# Start dev server (port 5173)
npm run dev

# Build for production
npm run build
```

### Usage

1. Start the backend: `python main.py` (runs on `http://localhost:5000`)
2. Start the frontend: `npm run dev` (runs on `http://localhost:5173`)
3. Open `http://localhost:5173` in your browser
4. Fill in the form and click **Predict Insurance**

## API

### POST `/predict`

**Request:**
```json
{
  "age": 35,
  "sex": "male",
  "bmi": 25.0,
  "children": 2,
  "smoker": "no",
  "region": "northwest"
}
```

**Response:**
```json
{
  "Predicted Premium": 19108.61,
  "Risk Class": "Low Risk"
}
```

## ML Models

- **Regression:** Linear Regression, KNN Regressor → best saved automatically
- **Classification:** Logistic Regression, KNN Classifier, Naive Bayes → best saved automatically

## License

This project has no copyright claim but please don't copy it 👉👈.