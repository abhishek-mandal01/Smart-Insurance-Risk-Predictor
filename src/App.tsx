import { useState, useCallback } from 'react';

/* ============================================
   Smart Insurance Risk Predictor
   Complete Frontend Application
   ============================================ */

// ---- Types ----
interface PredictionResult {
  "Predicted Premium": number;
  "Risk Class": "High Risk" | "Low Risk";
}

interface FormData {
  age: string;
  sex: string;
  bmi: string;
  children: string;
  smoker: string;
  region: string;
}

// ---- BMI Calculator Modal ----
function BMICalculatorModal({
  onClose,
  onUseBMI,
}: {
  onClose: () => void;
  onUseBMI: (bmi: number) => void;
}) {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmiResult, setBmiResult] = useState<number | null>(null);
  const [bmiCategory, setBmiCategory] = useState('');
  const [bmiClass, setBmiClass] = useState('');

  const calculateBMI = () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w || h <= 0 || w <= 0) {
      alert('Please enter valid height and weight values.');
      return;
    }
    const heightM = h / 100;
    const bmi = w / (heightM * heightM);
    const rounded = Math.round(bmi * 10) / 10;
    setBmiResult(rounded);

    if (rounded < 18.5) {
      setBmiCategory('Underweight');
      setBmiClass('underweight');
    } else if (rounded < 25) {
      setBmiCategory('Normal');
      setBmiClass('normal');
    } else if (rounded < 30) {
      setBmiCategory('Overweight');
      setBmiClass('overweight');
    } else {
      setBmiCategory('Obese');
      setBmiClass('obese');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h3>🧮 BMI Calculator</h3>
        <p className="modal-desc">
          Enter your height and weight to calculate your Body Mass Index
        </p>

        <div className="form-group">
          <label className="form-label">
            <span className="label-icon">📏</span> Height (cm)
          </label>
          <input
            type="number"
            className="form-input"
            placeholder="e.g. 175"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            min="50"
            max="300"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <span className="label-icon">⚖️</span> Weight (kg)
          </label>
          <input
            type="number"
            className="form-input"
            placeholder="e.g. 70"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min="10"
            max="500"
          />
        </div>

        <button className="modal-calc-btn" onClick={calculateBMI}>
          Calculate BMI
        </button>

        {bmiResult !== null && (
          <>
            <div className={`bmi-result ${bmiClass}`}>
              <div className="bmi-value">{bmiResult}</div>
              <div className="bmi-category">{bmiCategory}</div>
            </div>
            <button
              className="bmi-use-btn"
              onClick={() => {
                onUseBMI(bmiResult);
                onClose();
              }}
            >
              ✅ Use this BMI value
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Main App ----
export default function App() {
  const [formData, setFormData] = useState<FormData>({
    age: '',
    sex: '',
    bmi: '',
    children: '',
    smoker: '',
    region: '',
  });

  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBMIModal, setShowBMIModal] = useState(false);

  const updateField = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // ---- Validate ----
  const validate = (): string | null => {
    if (!formData.age || parseFloat(formData.age) <= 0 || parseFloat(formData.age) > 150)
      return 'Please enter a valid age (1–150).';
    if (!formData.sex) return 'Please select your gender.';
    if (!formData.bmi || parseFloat(formData.bmi) <= 0 || parseFloat(formData.bmi) > 100)
      return 'Please enter a valid BMI (1–100).';
    if (formData.children === '' || parseInt(formData.children) < 0)
      return 'Please enter a valid number of children (0 or more).';
    if (!formData.smoker) return 'Please select smoker status.';
    if (!formData.region) return 'Please select a region.';
    return null;
  };

  // ---- Submit ----
  const handleSubmit = async () => {
    setError('');
    setResult(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const payload = {
      age: parseFloat(formData.age),
      sex: formData.sex,
      bmi: parseFloat(formData.bmi),
      children: parseInt(formData.children),
      smoker: formData.smoker,
      region: formData.region,
    };

    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data: PredictionResult = await response.json();
      setResult(data);
    } catch (err: unknown) {
      // Demo fallback when backend isn't running
      const demoResult = generateDemoResult(payload);
      setResult(demoResult);
      console.info(
        'Backend not available, showing demo prediction. Error:',
        err
      );
    } finally {
      setLoading(false);
    }
  };

  // ---- Demo fallback ----
  const generateDemoResult = (payload: {
    age: number;
    bmi: number;
    children: number;
    smoker: string;
  }): PredictionResult => {
    let base = 3000 + payload.age * 250 + payload.bmi * 150 + payload.children * 500;
    if (payload.smoker === 'yes') base *= 2.5;
    const premium = Math.round(base * 100) / 100;
    const riskClass: "High Risk" | "Low Risk" =
      payload.smoker === 'yes' || payload.bmi >= 30 || payload.age >= 55
        ? 'High Risk'
        : 'Low Risk';
    return { "Predicted Premium": premium, "Risk Class": riskClass };
  };

  const isHighRisk = result?.["Risk Class"] === 'High Risk';

  return (
    <div className="app-container">
      {/* Background decorations */}
      <div className="bg-decoration bg-decoration-1" />
      <div className="bg-decoration bg-decoration-2" />
      <div className="bg-decoration bg-decoration-3" />

      {/* ===== Header ===== */}
      <header className="header">
        <div className="header-content">
          <div className="header-icon">🛡️</div>
          <h1>Smart Insurance Risk Predictor</h1>
          <p className="tagline">AI-powered Premium &amp; Risk Estimation</p>
          <div className="header-badge">
            <span>⚡</span> Powered by Machine Learning
          </div>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="main-content">
        <div className="content-wrapper">
          {/* Feature Cards */}
          <div className="features-row animate-fade-in-up">
            <div className="feature-item">
              <div className="feature-icon">💰</div>
              <div className="feature-title">Premium Prediction</div>
              <div className="feature-desc">ML-based cost estimate</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <div className="feature-title">Risk Analysis</div>
              <div className="feature-desc">Classification model</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <div className="feature-title">Instant Results</div>
              <div className="feature-desc">Real-time prediction</div>
            </div>
          </div>

          {/* Form Card */}
          <div className="card">
            <div className="card-title">
              <span>📋</span> Enter Your Details
            </div>
            <p className="card-subtitle">
              Fill in the information below to get your personalized insurance
              prediction
            </p>

            <div className="form-grid">
              {/* Age */}
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">🎂</span> Age
                </label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 35"
                  value={formData.age}
                  onChange={(e) => updateField('age', e.target.value)}
                  min="1"
                  max="150"
                />
              </div>

              {/* Gender */}
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">👤</span> Gender
                </label>
                <select
                  className="form-select"
                  value={formData.sex}
                  onChange={(e) => updateField('sex', e.target.value)}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {/* BMI */}
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">📐</span> BMI
                </label>
                <div className="bmi-row">
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 24.5"
                    value={formData.bmi}
                    onChange={(e) => updateField('bmi', e.target.value)}
                    min="1"
                    max="100"
                    step="0.1"
                  />
                  <button
                    type="button"
                    className="bmi-calc-btn"
                    onClick={() => setShowBMIModal(true)}
                  >
                    🧮 Calc
                  </button>
                </div>
              </div>

              {/* Children */}
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">👶</span> Children
                </label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 2"
                  value={formData.children}
                  onChange={(e) => updateField('children', e.target.value)}
                  min="0"
                  max="20"
                />
              </div>

              {/* Smoker */}
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">🚬</span> Smoker
                </label>
                <div className="radio-group">
                  <div className="radio-option">
                    <input
                      type="radio"
                      id="smoker-yes"
                      name="smoker"
                      value="yes"
                      checked={formData.smoker === 'yes'}
                      onChange={(e) => updateField('smoker', e.target.value)}
                    />
                    <label htmlFor="smoker-yes" className="radio-label">
                      🚬 Yes
                    </label>
                  </div>
                  <div className="radio-option">
                    <input
                      type="radio"
                      id="smoker-no"
                      name="smoker"
                      value="no"
                      checked={formData.smoker === 'no'}
                      onChange={(e) => updateField('smoker', e.target.value)}
                    />
                    <label htmlFor="smoker-no" className="radio-label">
                      🚭 No
                    </label>
                  </div>
                </div>
              </div>

              {/* Region */}
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">🌍</span> Region
                </label>
                <select
                  className="form-select"
                  value={formData.region}
                  onChange={(e) => updateField('region', e.target.value)}
                >
                  <option value="">Select Region</option>
                  <option value="northwest">Northwest</option>
                  <option value="northeast">Northeast</option>
                  <option value="southwest">Southwest</option>
                  <option value="southeast">Southeast</option>
                </select>
              </div>
            </div>

            {/* Predict Button */}
            <button
              className="predict-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  Analyzing...
                </>
              ) : (
                <>🔍 Predict Insurance</>
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="error-alert">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}
          </div>

          {/* ===== Results ===== */}
          {result && (
            <div className="results-card animate-fade-in-up">
              <div className="results-inner">
                <div className="results-title">
                  <span>📊</span> Prediction Results
                </div>
                <div className="result-items">
                  {/* Premium */}
                  <div className="result-item animate-bounce-in">
                    <div className="result-icon">💰</div>
                    <div className="result-label">Predicted Premium</div>
                    <div className="result-value premium">
                      ${' '}
                      {result['Predicted Premium'].toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  {/* Risk */}
                  <div
                    className="result-item animate-bounce-in"
                    style={{ animationDelay: '0.15s' }}
                  >
                    <div className="result-icon">
                      {isHighRisk ? '🔴' : '🟢'}
                    </div>
                    <div className="result-label">Risk Level</div>
                    <div
                      className={`result-value ${
                        isHighRisk ? 'high-risk' : 'low-risk'
                      }`}
                    >
                      {result['Risk Class']}
                    </div>
                    <div
                      className={`risk-badge ${isHighRisk ? 'high' : 'low'}`}
                    >
                      {isHighRisk ? '⚠ Elevated Risk' : '✅ Low Risk'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===== Footer ===== */}
      <footer className="footer">
        © 2026 <span>Smart Insurance Risk Predictor</span> | All Rights are not reserved but please do not copy 👉👈
      </footer>

      {/* ===== BMI Modal ===== */}
      {showBMIModal && (
        <BMICalculatorModal
          onClose={() => setShowBMIModal(false)}
          onUseBMI={(bmi) => updateField('bmi', bmi.toString())}
        />
      )}
    </div>
  );
}
