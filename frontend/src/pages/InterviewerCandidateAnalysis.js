import React, { useEffect, useRef, useState } from 'react'
import Navbar, { linkList } from '../Components/Navbar';
import { useIsMount, useNotifier } from '../js/utils';
import { useCallback } from 'react';
import CandidatePerformanceDashboard from '../pages/CandidatePerformanceDashboard';

import {
    getCandidateProfile,
    analizeCanadidateResume,
    getTaskStatus,
    analizeCanadidateAudio
} from '../js/httpHandler';

const InterviewerCandidateAnalysis = ({ candidate_username, video_path, job_id, designation }) => {
    const [videoPath, setVideoPath] = useState(video_path)
    const [intervalRunning, setIntervalRunning] = useState(false);
    const [resumeAnalysisText, setResumeAnalysisText] = useState('');
    const [videoAnalysisStarted, setVideoAnalysisStarted] = useState(false);
    const [videoAnalysisCompleted, setVideoAnalysisCompleted] = useState(false);
    const [videoScore, setVideoScore] = useState({
        gaze_score: 0,
        straight_frames: 0,
        total_frames: 0
    });
    const [candidateScores, setCandidateScores] = useState({
        audio_score: 0,
        audio_output: {
            'wpm': 0,
            'speed': 0,
            'initial_pause_percent': 0,
            'mute_percent': 0,
            'total_filler_words': 0,
            'filler_percent': 0,
        }
    });
    const sourceRef = useRef();
    const videoRef = useRef();

    useEffect(() => {
        if (sourceRef.current.src && videoRef.current) {
            sourceRef.current.src = `http://localhost:5000/getInterviewVideo?file_path=${videoPath}`
            videoRef.current.load();
        }

    }, [videoPath])


    const [candidateAnswers, setCandidateAnswers] = useState([]); // questions + audio paths
    const [answerScores, setAnswerScores] = useState([]); // analysis results
    const [answerAnalysisRunning, setAnswerAnalysisRunning] = useState(false);
    const [isAnalyzingResume, setIsAnalyzingResume] = useState(false);

    const [audioStarted, setAudioStarted] = useState(false);
    const [audioCompleted, setAudioCompleted] = useState(false)
    const [candidateProfile, updateCandidateProfile] = useState({
        profile_image: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png',
        first_name: '',
        last_name: '',
        job: '',
        resume_location: '',
    });

    const calculateOverallPerformance = (resumeText, audioScore, gazeScore, answerScores) => {
    // Extract resume % from text (e.g., "85 % fit")
    const resumeMatch = resumeText?.match(/([\d.]+)\s*%/);
    const resumeScore = resumeMatch ? parseInt(resumeMatch[1]) : 0;
    

    // Average answer score
    const avgAnswerScore = answerScores.length > 0
        ? answerScores.reduce((sum, ans) => sum + ans.score, 0) / answerScores.length
        : 0;

    // Weights
    const resumeWeight = 0.15;
    const audioWeight = 0.40;
    const answerWeight = 0.25;
    const gazeWeight = 0.20;

    // Weighted score
    const overall =
        (resumeScore * resumeWeight) +
        (audioScore * audioWeight) +
        (avgAnswerScore * answerWeight)+
        (gazeScore * gazeWeight);

    return Math.round(overall);
};

    const calculateAudioScore = (audio_output) => {
    let score = 100;

    // Weights for each metric
    const fillerWeight = 0.35;   // 35% weight
    const muteWeight = 0.30;     // 30% weight
    const speedWeight = 0.25;    // 25% weight
    const initialPauseWeight = 0.10; // 10% weight

    // Penalize excessive filler words (normalize %)
    score -= fillerWeight * audio_output.filler_percent;

    // Penalize long silent periods (normalize %)
    score -= muteWeight * audio_output.mute_percent;

    // Penalize extreme WPM: ideal range 120-160
    if (audio_output.wpm < 120) {
        score -= speedWeight * (120 - audio_output.wpm) / 2; // slower speech penalty
    } else if (audio_output.wpm > 160) {
        score -= speedWeight * (audio_output.wpm - 160) / 2; // faster speech penalty
    }

    // Penalize initial long pause (normalize %)
    score -= initialPauseWeight * audio_output.initial_pause_percent;

    // Cap score between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
};

    const notifier = useNotifier();
    const isResumeUploaded = () => { return (candidateProfile.resume_location.constructor === String && candidateProfile.resume_location !== '') };
    const firstMount = useIsMount();

    const fetchCandidateProfile = useCallback(async () => {
    const candidate_data = await getCandidateProfile(notifier, candidate_username);
    if (Object.keys(candidate_data).length > 0) {
        updateCandidateProfile(candidate_data);
    }
}, [notifier, candidate_username]);

useEffect(() => {
    if (firstMount) {
        fetchCandidateProfile();
    }
}, [firstMount, fetchCandidateProfile]);

useEffect(() => {
    const fetchCandidateQuestions = async () => {
        try {
            // Replace 'designation' with the job role
            const res = await fetch(`http://localhost:5000/interview_questions/${designation}`);
            const data = await res.json();
            const questions = data.questions || [];

            // Map questions to audio paths (you can replace this with actual recorded paths)
            const mappedAnswers = questions.map((q, idx) => ({
                question: q,
                audio_file_path: `uploads/answer_${idx + 1}.mp4`, // placeholder
                interview_id: 'interview_001', // replace with actual interview ID
            }));

            setCandidateAnswers(mappedAnswers);
        } catch (err) {
            console.error("Error fetching questions:", err);
        }
    };

    if (designation) {
        fetchCandidateQuestions();
    }
}, [designation]);


const analyzeCandidateAnswers = async () => {
    if (answerAnalysisRunning) return;
    if (candidateAnswers.length === 0) {
        notifier("No questions found to analyze");
        return;
    }

    setAnswerAnalysisRunning(true);

    try {
        const response = await fetch('http://localhost:5000/process_full_interview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                candidate_id: candidate_username,
                interview_id: "interview_001", // or real ID if available
                questions: candidateAnswers.map(a => a.question),
                audio_file_path: videoPath // ✅ full single audio file
            })
        });

        const data = await response.json();

        if (data.overall_score !== undefined) {
            setAnswerScores([{ question: "Overall Interview", score: data.overall_score, feedback: "Overall performance" }]);
        } else {
            notifier("Error: Invalid response from server");
        }

        } catch (err) {
            console.error(err);
            notifier("Server error while analyzing answers");
        } finally {
            setAnswerAnalysisRunning(false);
        }
    };



    const REFRESH_INTERVAL = 1500;
    const analizeResume = async () => {
        // Add Interval counter if not exists
        if (!intervalRunning) {
            setIsAnalyzingResume(true);
            const task_id = await analizeCanadidateResume(notifier, candidate_username, job_id);
            if (!task_id) {
                console.error("Task couldn't be created.")
                return
            }

            // Main intervel. Runs every 2 second to check for job status.
            const _intervalCounter = setInterval(async () => {
                const response = await getTaskStatus(notifier, task_id);

                if (!(response && response.status)) {
                    console.error('No response status found')
                }
                else {
                    if (response.status === 'Success') {
                        setResumeAnalysisText(`By resume analysis, the candidate is ${response.result} % fit for your Job role.`);
                        setIsAnalyzingResume(false);
                        setIntervalRunning(false);
                        clearInterval(_intervalCounter);
                    }
                    else if (response.status === 'Failed') {
                        setResumeAnalysisText('Some error occured in Server');
                        console.error('Task failed in server');
                        setIsAnalyzingResume(false);
                        setIntervalRunning(false);
                        clearInterval(_intervalCounter);
                    }
                }
            }, REFRESH_INTERVAL);

            // Set Interval counter in state, so that click on button multiple times don't generate new counters,
            // if one counter is already running.
            console.warn('Interval counter started')
            setIntervalRunning(true)
        }
    }



    const analizeAudio = async () => {

        if (!intervalRunning) {
            const task_id = await analizeCanadidateAudio(notifier, videoPath);
            if (!task_id) {
                console.error("Task couldn't be created.")
                return
            }

            // Main intervel. Runs every 2 second to check for job status.
            const _intervalCounter = setInterval(async () => {
                setAudioStarted(true);
                const response = await getTaskStatus(notifier, task_id);

                if (!(response && response.status)) {
                    console.error('No response status found')
                }
                else {
                    if (response.status === 'Success') {
                        const audio_output = response.result;
                        const audio_score = calculateAudioScore(audio_output);
                        setCandidateScores(prev => ({
                            ...prev,
                            audio_output,
                            audio_score
                        }))

                        setAudioCompleted(true);
                        setIntervalRunning(false);
                        clearInterval(_intervalCounter);
                    }
                    else if (response.status === 'Failed') {
                        console.error('Task failed in server');
                        setIntervalRunning(false);
                        clearInterval(_intervalCounter);
                    }
                }
            }, REFRESH_INTERVAL);

            // Set Interval counter in state, so that click on button multiple times don't generate new counters,
            // if one counter is already running.
            console.warn('Interval counter started')
            setIntervalRunning(true)
        }

    }

    const analyzeCandidateVideo = async () => {
        if (!intervalRunning) {
            setVideoAnalysisStarted(true);
            
            try {
                const res = await fetch(`http://localhost:5000/analizeCandidateGaze?filePath=${videoPath}`);
                const data = await res.json();
                
                if (data) {
                    setVideoScore(data);
                    setVideoAnalysisCompleted(true);
                
                } else {
                    notifier("Video analysis returned no result");
                }
            
            } catch (err) {
                console.error(err);
                notifier("Error analyzing video");
            
            } finally {
                setVideoAnalysisStarted(false);
            }
        }
    };

    return (
        <div className='page-wrapper'>
            <Navbar selectedPage={linkList.HOME} />
            <div className='page-container'>
                <div className='sample-interview-div'>
                    <button className='custom-blue-reverse'  onClick={() => { setVideoPath('uploads/sample.mp4')}}>Load Sample Interview</button>
                </div>
                <div className='profile-orverview'>

                    <div className='profile-image-container'>

                        <img className='profile-image' src={candidateProfile.profile_image} alt="" />
                    </div>

                    <span style={{ fontWeight: '600', fontSize: '1.2rem' }}>{`${candidateProfile.first_name} ${candidateProfile.last_name}`}</span>
                    <span style={{ fontSize: '1.05rem' }}>{candidateProfile.job}</span>
                </div>

                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#42A0DF' }}> Candidate Interview Recording</span>
                <div className='video-container visible' style={{ border: '2px solid black', marginTop: '20px' }}>
                    <video width='480' height='360' controls ref={videoRef}>
                        <source src={`http://localhost:5000/getInterviewVideo?file_path=${videoPath}`} ref={sourceRef} />
                    </video>
                </div>


                <div className='ai-action-section'>
                    <div style={{ fontSize: '1rem', color: '#2b2b2bda' }}>
                        <i>Analize candidate for:</i> <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>{designation}</span>
                    </div>

                    <div className='job-control-container' style={{ alignSelf: 'flex-start', width: '100%' }}>
                        {isResumeUploaded() && (<><button className='custom-blue' style={{ width: '130px' }} onClick={analizeResume} disabled={isAnalyzingResume}>Analyze Resume</button>
                        {
                            isAnalyzingResume && (<span style={{marginTop: '10px', color: '#411d7aaa', fontSize: '1.1rem', fontWeight: '600', display: 'block'}}> Analyzing Resume...</span>)
                        }

                        {
                            (resumeAnalysisText) && (
                            <div className='resume-analysis-score'>
                                {resumeAnalysisText}
                            </div>
                        )} </> )}
                    </div>
                

                    <div className='job-control-container' style={{ alignSelf: 'flex-start', width: '100%' }}>
                        <button className='custom-blue'  onClick={analizeAudio} style={{width:'130px'}}> Analize Speech</button>

                        {
                            ((audioStarted && (!audioCompleted))) && <span style={{marginTop:'10px', color:'#411d7aaa', fontSize:'1.1rem', fontWeight:'600'}}> Analyzing Audio ...</span>
                        }

                        {
                            (audioCompleted) &&
                            <div className='interview-analysis' >
                                <div style={{ alignSelf: 'stretch' }}>
                                    <div>
                                        <span style={{ fontSize: '1.3rem', textDecoration: 'underlined' }} >Speech Analysis</span>
                                    </div>

                                    <div className='audio-result-container'>
                                        <div>
                                            <span style={{ fontSize: '1.1rem' }}> Speech Speed: <span style={{ color: 'black' }}> {candidateScores.audio_output.speed} </span></span>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '1.1rem' }}> WPM: <span style={{ color: 'black' }}> {candidateScores.audio_output.wpm} </span></span>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '1.1rem' }}> Initial Pause Percent: <span style={{ color: 'black' }}> {candidateScores.audio_output.initial_pause_percent} </span></span>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '1.1rem' }}> % Time not spoken: <span style={{ color: 'black' }}> {candidateScores.audio_output.mute_percent} </span></span>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '1.1rem' }}> Total Filler words used: <span style={{ color: 'black' }}> {candidateScores.audio_output.total_filler_words} </span></span>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '1.1rem' }}> % Filler words used: <span style={{ color: 'black' }}> {candidateScores.audio_output.filler_percent} </span></span>
                                        </div>
                                    </div>
                                    <span style={{ color: 'red', fontSize: '1.3rem' }}>Audio Score: </span>
                                    <span style={{ fontSize: '1.3rem' }}>{candidateScores.audio_score} %</span>

                                </div>
                            </div>

                        }

                    </div>

                    <div className='job-control-container' style={{ alignSelf: 'flex-start', width: '100%' }}>
                        <button className='custom-blue' style={{ width: '130px' }} onClick={analyzeCandidateVideo}>
                            {videoAnalysisStarted ? 'Analyzing...' : 'Analyze Video'}
                        </button>
                        
                        {videoAnalysisCompleted && (
                            <div className='video-analysis-results' style={{ marginTop: '10px', fontSize: '1.1rem' }}>
                                <div>Gaze Score: {videoScore.gaze_score}</div>
                                <div>Straight Frames: {videoScore.straight_frames}</div>
                            <div>Total Frames: {videoScore.total_frames}</div>
                        </div>)}
                    </div>

                    <div className='job-control-container' style={{ alignItems: 'felx-start', width: '100%' }}>
                        <button className='custom-blue' style={{ width: '130px' }} onClick={analyzeCandidateAnswers}>
                            {answerAnalysisRunning ? 'Analyzing...' : 'Analize Answers'}
                        </button>

                    {answerScores.length > 0 && !answerAnalysisRunning && (
                        <span style={{ fontWeight: '600', color: 'grey' }}>
                            {answerScores[0].score} %
                        </span>
                    )}
                    </div>



                    {answerScores.length > 0 && (
                        <>
                        {/* Keep the plain overall percentage */}
                        <div style={{ marginTop: '20px', fontSize: '1.3rem', color: '#0078D7' }}>
                            <b>Overall Interview Performance Score:</b>{" "}
                            {calculateOverallPerformance(
                                resumeAnalysisText,
                                candidateScores.audio_score,
                                videoScore.gaze_score,
                                answerScores
                            )}%
                        </div>
                        
                        {/* Add the dashboard component */}
                        <div style={{ marginTop: '20px' }}>
                            <CandidatePerformanceDashboard
                                resumeScore={parseInt(resumeAnalysisText.match(/([\d.]+)\s*%/)?.[1] || 0)}
                                audioScore={candidateScores.audio_score}
                                gazeScore={videoScore.gaze_score}
                                answerScores={answerScores}

                            />
                        </div></>
                    )}
                    
                </div>
            </div>
        </div >
    )
}

export default InterviewerCandidateAnalysis