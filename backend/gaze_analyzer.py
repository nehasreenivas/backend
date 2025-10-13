import cv2
import mediapipe as mp  # <-- this was missing

def analyze_gaze(video_path, sample_every_n_frames=10):
    """
    Returns % of time candidate is looking straight into camera.
    Only counts frames where exactly one face is detected.
    """
    mp_face_mesh = mp.solutions.face_mesh
    cap = cv2.VideoCapture(video_path)

    total_frames = 0
    straight_frames = 0

    with mp_face_mesh.FaceMesh(
        max_num_faces=5,  # detect multiple faces
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as face_mesh:

        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_every_n_frames == 0:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = face_mesh.process(rgb_frame)

                # Only process frame if exactly one face detected
                if results.multi_face_landmarks and len(results.multi_face_landmarks) == 1:
                    total_frames += 1
                    landmarks = results.multi_face_landmarks[0].landmark
                    left_eye = landmarks[33]
                    right_eye = landmarks[263]
                    nose_tip = landmarks[1]

                    eye_mid_x = (left_eye.x + right_eye.x) / 2
                    yaw = nose_tip.x - eye_mid_x

                    if -0.02 <= yaw <= 0.02:
                        straight_frames += 1
                else:
                    # Frame invalid (zero or multiple faces)
                    total_frames += 1  # count frame but do not increment straight_frames
            frame_idx += 1

    cap.release()
    gaze_score = round((straight_frames / total_frames) * 100) if total_frames > 0 else 0
    return {"gaze_score": gaze_score, "total_frames": total_frames, "straight_frames": straight_frames}