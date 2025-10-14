import React from 'react';
import { Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Tooltip,
  Legend
);

const CandidatePerformanceDashboard = ({ resumeScore, audioScore, gazeScore, answerScores }) => {

  // --- Calculate overall score (weighted)
  const overallScore = Math.round(
    0.15 * resumeScore +
    0.40 * audioScore +
    0.20 * gazeScore +
    0.25 * (
      answerScores.length > 0
        ? answerScores.reduce((sum, ans) => sum + ans.score, 0) / answerScores.length
        : 0
    )
  );

  // --- Get qualitative label
  const getPerformanceLabel = (score) => {
    if (score >= 85) return "🌟 Excellent Candidate";
    if (score >= 70) return "👍 Strong Candidate";
    if (score >= 55) return "👌 Average Candidate";
    return "⚠️ Needs Improvement";
  };

  // --- Prepare chart data
  const avgAnswerScore = answerScores.length > 0
    ? answerScores.reduce((sum, ans) => sum + ans.score, 0) / answerScores.length
    : 0;

  const data = {
    labels: ['Resume', 'Audio', 'Gaze','Answers'],
    datasets: [
      {
        label: 'Candidate Score (%)',
        data: [resumeScore, audioScore,gazeScore, avgAnswerScore],
        backgroundColor: ['#42A0DF', '#FF6384', '#FFCE56'],
      }
    ]
  };

  const radarData = {
    labels: ['Resume', 'Audio', 'Gaze', 'Answers'],
    datasets: [
      {
        label: 'Candidate Performance',
        data: [resumeScore, audioScore, gazeScore, avgAnswerScore],
        backgroundColor: 'rgba(66,160,223,0.2)',
        borderColor: '#42A0DF',
        borderWidth: 2,
        pointBackgroundColor: '#42A0DF',
      }
    ]
  };

  // --- Layout
  return (
    <div
      style={{
        marginTop: '30px',
        border: '1px solid #ddd',
        padding: '20px 15px',
        borderRadius: '10px',
        background: '#f9f9f9',
        maxWidth: '680px',
        margin: 'auto'
      }}
    >
      <h3 style={{ color: '#0078D7', textAlign: 'center' }}>
        Overall Candidate Performance
      </h3>

      <p style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        Overall Score: {overallScore}%
        <br />
        <span style={{ fontSize: '1.1rem', color: '#555' }}>
          {getPerformanceLabel(overallScore)}
        </span>
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginTop: '30px',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        {/* Bar Chart */}
        <div style={{ width: '300px', marginBottom: '20px' }}>
          <h4 style={{ textAlign: 'center' }}>Per-Category Bar Chart</h4>
          <Bar
            data={data}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, max: 100 }
              }
            }}
          />
        </div>

        {/* Radar Chart */}
        <div style={{ width: '300px', marginBottom: '20px' }}>
          <h4 style={{ textAlign: 'center' }}>Performance Radar Chart</h4>
          <Radar
            data={radarData}
            options={{
              responsive: true,
              scales: {
                r: { beginAtZero: true, max: 100 }
              }
            }}
          />
        </div>
      </div>

      {/* Category Breakdown Section */}
      <div style={{ marginTop: '25px', textAlign: 'left' }}>
        <h4 style={{ color: '#0078D7' }}>Score Breakdown</h4>
        <ul style={{ lineHeight: '1.8', listStyleType: 'disc', paddingLeft: '20px' }}>
          <li>
            <b>Resume Score:</b> {resumeScore}% – based on resume keyword relevance & structure.
          </li>
          <li>
            <b>Audio Score:</b> {audioScore}% – clarity, pace, and confidence from speech.
          </li>
          <li>
            <b>Gaze Score:</b> {gazeScore}% – focus and attention from video analysis.
          </li>
          <li>
            <b>Answer Score:</b> {avgAnswerScore.toFixed(1)}% – quality and depth of interview responses.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CandidatePerformanceDashboard;