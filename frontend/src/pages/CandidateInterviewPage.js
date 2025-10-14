import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar, { linkList } from '../Components/Navbar';
import { useNotifier } from '../js/utils';
import { getStreamId } from '../js/httpHandler';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import './CandidateInterviewPage.css';

const CandidateInterviewPage = () => {
  const location = useLocation();
  const notifier = useNotifier();

  const { interview_id, jobRole, candidate_id } = location.state?.props || {};

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [streamId, setStreamId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [errorFetching, setErrorFetching] = useState(false);
  const [answerScores, setAnswerScores] = useState({});

  const videoFrameRef = useRef();
  const blobsRef = useRef([]);

  // Fetch questions for the job role
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/interview_questions/${encodeURIComponent(jobRole)}`
        );
        setQuestions(res.data.questions || []);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setErrorFetching(true);
      } finally {
        setLoadingQuestions(false);
      }
    };
    if (jobRole) fetchQuestions();
  }, [jobRole]);

  // Speak question
  const playQuestion = () => {
    if (questions.length === 0) return;
    const text = questions[currentQuestion]?.text;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // Upload blobs to server
  const sendBlobs = useCallback(
    async (blob_data) => {
      if (!streamId) return;
      const formData = new FormData();
      formData.append('blob_data', blob_data);
      formData.append('stream_id', streamId);
      try {
        await fetch('http://localhost:5000/postBlob', { method: 'POST', body: formData });
      } catch (err) {
        console.error('Failed to send blob', err);
      }
    },
    [streamId]
  );

  // Setup MediaRecorder
  useEffect(() => {
    if (!mediaRecorder || !streamId) return;

    const handleDataAvailable = (e) => {
      if (e.data && e.data.size > 0) {
        blobsRef.current.push(e.data);
        sendBlobs(e.data);
      }
    };

    mediaRecorder.ondataavailable = handleDataAvailable;
    if (mediaRecorder.state === 'inactive') mediaRecorder.start(5000);

    return () => {
      if (mediaRecorder.state === 'recording') mediaRecorder.stop();
    };
  }, [mediaRecorder, streamId, sendBlobs]);

  // Request camera & mic access
  const allowRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setPermissionGranted(true);
      videoFrameRef.current.srcObject = stream;

      const _streamId = await getStreamId(notifier, interview_id);
      if (_streamId) setStreamId(_streamId);

      setMediaRecorder(new MediaRecorder(stream, { mimeType: 'video/webm' }));
    } catch (err) {
      console.error(err);
      setPermissionError(true);
    }
  };

  // Trigger AI analysis for current question
  const analyzeCandidateAnswer = async (questionText, questionIndex) => {
    try {
      const res = await axios.post('http://localhost:5000/analyze_answer', {
        candidate_id,
        interview_id,
        question_index: questionIndex,
        question: questionText,
        audio_file_path: streamId, // adjust if your server expects blob path
      });

      const data = res.data;
    if (data && data.score !== undefined) {
      setAnswerScores((prev) => ({
        ...prev,
        [questionIndex]: data.score,
      }));
    }

      console.log(`AI analysis triggered for question ${questionIndex + 1}`);
    } catch (err) {
      console.error('Error analyzing answer:', err);
    }
  };

  // Navigate to next question
  const handleNext = async () => {
    const currentQ = questions[currentQuestion];
    if (currentQ) await analyzeCandidateAnswer(currentQ?.text, currentQuestion);

    if (currentQuestion === questions.length - 1) {
      const scores = Object.values(answerScores);
      if (scores.length > 0) {
        const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
        notifier(`Interview Completed ✅  Average Score: ${avgScore}`, 'success');

        } else {
          notifier('Interview Completed ✅ You can Sign out', 'success');
      }
      return;
    }
    setCurrentQuestion(currentQuestion + 1);
  };


  // Navigate to previous question
  const handlePrev = () => {
    if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
  };

  // Render
  return (
    <div className='page-wrapper'>
      <Navbar selectedPage={linkList.HOME} />
      <div className='page-container'>
        {!permissionGranted && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <label style={{ fontWeight: 600 }}>Click to give camera permission</label>
            <br />
            <button className='custom-purple' onClick={allowRecording}>
              Start Camera
            </button>
          </div>
        )}

        {permissionError && (
          <div className='alert-message'>
            <span>Error: User did not grant camera permission</span>
          </div>
        )}

        <div className={`video-container ${permissionGranted ? 'visible' : ''}`}>
          <video className='video-frame' autoPlay muted ref={videoFrameRef} />
        </div>

        <div className='interview-questions' style={{ marginTop: '20px', width: '80%', marginInline: 'auto' }}>
          {loadingQuestions ? (
            <p>Loading interview questions...</p>
          ) : errorFetching ? (
            <p>❌ Failed to load questions for {jobRole}</p>
          ) : (
            <>
              <h3>Interview for {jobRole}</h3>
              {questions.length > 0 ? (
                <div className='question-box'>
                  <p style={{ fontSize: '18px', lineHeight: '1.6' }}>
                    <strong>Question {currentQuestion + 1}:</strong> {questions[currentQuestion]?.text}
                  </p>

                  {answerScores[currentQuestion] !== undefined && (
                    <p style={{ marginTop: '8px', color: 'green' }}>
                      <strong>Answer Score:</strong> {answerScores[currentQuestion]} / 100
                      </p>
                    )}

                  <div className='controls'>
                    <button onClick={handlePrev} disabled={currentQuestion === 0}>
                      ⬅ Previous
                    </button>
                    <button onClick={handleNext}>
                      {currentQuestion < questions.length - 1 ? 'Next ➡' : 'Finish ✅'}
                    </button>
                    <button onClick={playQuestion}>🎧 Click to Listen Question</button>
                  </div>
                </div>
              ) : (
                <p>No questions available for this job role.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateInterviewPage;