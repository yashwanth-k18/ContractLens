import { useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF contract first.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/upload-contract",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Contract analysis failed."
        );
      }

      // Backend now returns { analysis: {...} }
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group obligations by responsible party
  const groupedObligations = {};

  if (analysis?.obligations) {
    analysis.obligations.forEach((item) => {
      const party = item.party || "Responsible Party";

      if (!groupedObligations[party]) {
        groupedObligations[party] = [];
      }

      groupedObligations[party].push(item);
    });
  }

  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">
          <span>⚖️</span>
          ContractLens
        </div>

        <div className="nav-right">
          <span>AI Contract Intelligence</span>
          <div className="status-dot">●</div>
        </div>
      </header>

      <main className="container">

        {/* HERO */}
        {!analysis && (
          <section className="hero">
            <div className="badge">
              AI-POWERED CONTRACT REVIEW
            </div>

            <h1>
              Understand your contracts
              <br />
              <span>before they become problems.</span>
            </h1>

            <p>
              Upload a business contract and let ContractLens
              identify obligations, important dates, payments,
              and potential risks.
            </p>
          </section>
        )}

        {/* UPLOAD */}
        {!analysis && (
          <section className="upload-card">
            <div className="upload-icon">📄</div>

            <h2>Upload Contract</h2>

            <p>
              Upload your PDF contract for AI-powered analysis.
            </p>

            <label className="file-box">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  setFile(e.target.files[0]);
                  setError("");
                }}
              />

              <span>
                {file
                  ? `📎 ${file.name}`
                  : "Choose a PDF contract"}
              </span>
            </label>

            <button
              className="analyze-btn"
              onClick={handleUpload}
              disabled={loading}
            >
              {loading
                ? "Analyzing Contract..."
                : "Analyze Contract →"}
            </button>

            {error && (
              <div className="error">
                {error}
              </div>
            )}
          </section>
        )}

        {/* RESULTS */}
        {analysis && (
          <section className="results">

            <div className="results-header">
              <div>
                <div className="badge">
                  ANALYSIS COMPLETE
                </div>

                <h2>Contract Intelligence</h2>
              </div>

              <span className="success">
                ✓ Analyzed
              </span>
            </div>
            <div className="contract-metrics">
  <div className="metric-card">
    <span>👥</span>
    <strong>{analysis.parties?.length || 0}</strong>
    <small>Parties</small>
  </div>

  <div className="metric-card">
    <span>📋</span>
    <strong>{analysis.obligations?.length || 0}</strong>
    <small>Obligations</small>
  </div>

  <div className="metric-card">
    <span>⚠️</span>
    <strong>{analysis.risks?.length || 0}</strong>
    <small>Risks</small>
  </div>

  <div className="metric-card">
    <span>📅</span>
    <strong>{analysis.important_dates?.length || 0}</strong>
    <small>Important Dates</small>
  </div>
</div>

            {/* SUMMARY */}
            {analysis.summary && (
              <div className="summary-card">
                <h3>📋 Contract Summary</h3>
                <p>{analysis.summary}</p>
              </div>
            )}
          
            {/* JOB ROLE */}
            {analysis.job_role &&
              analysis.job_role !== "Not specified" && (
                <div className="info-card">
                  <h3>💼 Job / Contract Role</h3>
                  <p>{analysis.job_role}</p>
                </div>
              )}

            {/* COMPANY */}
            {analysis.company &&
              analysis.company !== "Not specified" && (
                <div className="info-card">
                  <h3>🏢 Organization</h3>
                  <p>{analysis.company}</p>
                </div>
              )}

            <div className="info-grid">

              {/* PARTIES */}
              {analysis.parties?.length > 0 && (
                <div className="info-card">
                  <h3>👥 Parties</h3>

                  {analysis.parties.map((party, index) => (
                    <div
                      className="party"
                      key={index}
                    >
                      <strong>{party.name}</strong>
                      <span>{party.role}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* OBLIGATIONS */}
              {Object.keys(groupedObligations).length > 0 && (
                <div className="info-card">
                  <h3>✅ Obligations</h3>

                  {Object.entries(
                    groupedObligations
                  ).map(([party, items]) => (
                    <div
                      className="obligation-group"
                      key={party}
                    >
                      <div className="obligation-party">
                        {party}
                      </div>

                      {items.map((item, index) => (
                        <div
                          className="obligation"
                          key={index}
                        >
                          <p>
                            {item.obligation}
                          </p>

                          {item.evidence &&
                            item.evidence !==
                              "Not specified" && (
                              <small>
                                Evidence:{" "}
                                {item.evidence}
                              </small>
                            )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RISKS */}
            {analysis.risks?.length > 0 && (
              <div className="info-card full">
                <h3>⚠️ Risk Review</h3>

                {analysis.risks.map(
                  (risk, index) => (
                    <div
                      className="risk"
                      key={index}
                    >
                      <strong>
                        {risk.severity}
                      </strong>

                      <h4>
                        {risk.title}
                      </h4>

                      <p>
                        {risk.risk}
                      </p>

                      {risk.evidence &&
                        risk.evidence !==
                          "Not specified" && (
                          <small>
                            Evidence:{" "}
                            {risk.evidence}
                          </small>
                        )}
                    </div>
                  )
                )}
              </div>
            )}

            {/* IMPORTANT DATES */}
{analysis.important_dates?.length > 0 && (
  <div className="info-card full dates-card">
    <h3>📅 Important Dates</h3>

    <div className="timeline">
      {analysis.important_dates.map((item, index) => (
        <div className="timeline-item" key={index}>
          <div className="timeline-marker">
            <span></span>
          </div>

          <div className="timeline-content">
            <strong>{item.event}</strong>
            <span>{item.date}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

            {/* PAYMENT */}
            {analysis.payment_details && (
              <div className="info-card full">
                <h3>💰 Payment Details</h3>

                <div className="payment-grid">

                  <div className="payment-item">
                    <small>Status</small>
                    <strong>
                      {
                        analysis.payment_details
                          .status
                      }
                    </strong>
                  </div>

                  <div className="payment-item">
                    <small>Amount</small>
                    <strong>
                      {
                        analysis.payment_details
                          .amount
                      }

                      {analysis.payment_details
                        .currency &&
                        analysis.payment_details
                          .currency !==
                          "Not specified"
                        ? ` ${analysis.payment_details.currency}`
                        : ""}
                    </strong>
                  </div>

                  <div className="payment-item">
                    <small>Frequency</small>
                    <strong>
                      {
                        analysis.payment_details
                          .frequency
                      }
                    </strong>
                  </div>

                  <div className="payment-item">
                    <small>Due Date</small>
                    <strong>
                      {
                        analysis.payment_details
                          .due_date
                      }
                    </strong>
                  </div>

                  <div className="payment-item">
                    <small>Payment Terms</small>
                    <strong>
                      {
                        analysis.payment_details
                          .payment_terms
                      }
                    </strong>
                  </div>

                </div>
              </div>
            )}

          </section>
        )}
      </main>

      <footer>
        ContractLens • AI-powered business contract intelligence
      </footer>
    </div>
  );
}

export default App;

