import math
from speech_analyzer import analize_audio  # your existing audio metrics module

def process_all_answers(candidate_id, interview_id, questions, audio_file_path=None):
    """
    Analyze candidate's interview answers from a single audio file and return overall score.
    Matches keywords from all questions in transcription.

    Parameters:
        candidate_id (str)
        interview_id (str)
        questions (list of dicts): Each dict can have:
            - 'question': text of the question
        audio_file_path (str): single audio file for the entire interview

    Returns:
        dict: overall score, per-question scores, audio metrics, keyword coverage
    """
    
    if not audio_file_path:
        raise ValueError("audio_file_path must be provided for full interview analysis.")

    # Analyze the entire audio
    audio_metrics = analize_audio(audio_file_path)
    transcription = audio_metrics.get("transcription", "").lower().split()  # words from full audio

    per_question_scores = []
    total_metrics = {
        "wpm": audio_metrics.get("wpm", 120),
        "filler_percent": audio_metrics.get("filler_percent", 0),
        "mute_percent": audio_metrics.get("mute_percent", 0),
        "initial_pause_percent": audio_metrics.get("initial_pause_percent", 0)
    }

    total_score = 0

    for qa in questions:
        question_text = qa.get("question", "").lower().split()
        if not question_text:
            question_text = []

        # Keyword coverage: how many question words appear in transcription
        matched_words = sum(1 for word in question_text if word in transcription)
        coverage_percent = (matched_words / max(len(question_text), 1)) * 100

        # Base audio score
        score = 100
        score -= 0.35 * audio_metrics.get("filler_percent", 0)
        score -= 0.30 * audio_metrics.get("mute_percent", 0)
        wpm = audio_metrics.get("wpm", 120)
        if wpm < 120:
            score -= 0.25 * ((120 - wpm) / 2)
        elif wpm > 160:
            score -= 0.25 * ((wpm - 160) / 2)
        score -= 0.10 * audio_metrics.get("initial_pause_percent", 0)

        # Keyword matching adds up to 20% of question score
        score = score * 0.8 + coverage_percent * 0.2
        score = max(0, min(100, round(score, 1)))

        per_question_scores.append({
            "question": qa.get("question", "N/A"),
            "score": score,
            "keyword_coverage_percent": round(coverage_percent, 1),
            "audio_metrics": audio_metrics
        })

        total_score += score

    overall_score = round(total_score / max(len(questions), 1), 1)

    return {
        "candidate_id": candidate_id,
        "interview_id": interview_id,
        "overall_score": overall_score,
        "per_question_scores": per_question_scores,
        "average_audio_metrics": total_metrics
    }