# AI Interview Analysis Platform - Setup Guide

## Prerequisites

- **Python 3.11+**
- **Node.js 20.11.0+** and npm
- **MongoDB** (running locally on default port 27017)
- **Git**

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/tymortechnologies/AI_Interview.git
cd AI_Interview
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
# Copy the content below to backend/.env
```

**Backend `.env` file:**
```env
# Hugging Face API Key
HF_API_KEY=your_huggingface_api_key_here
```

Get your Hugging Face API key from: https://huggingface.co/settings/tokens

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

### 4. Start MongoDB

Make sure MongoDB is running on `localhost:27017` (default port).

**Windows:**
```bash
mongod
```

**Linux/Mac:**
```bash
sudo systemctl start mongodb
# or
brew services start mongodb-community
```

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
python server.py
```
Backend will run on: `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```
Frontend will run on: `http://localhost:3000`

## Default Login Credentials

### For Candidates:
- **Username:** `hari_vilas` | **Password:** `hari@123`
- **Username:** `neha_kotapalli` | **Password:** `neha@123`
- **Username:** `student` | **Password:** `student@123`

### For Companies/Interviewers:
- **Username:** `company1` | **Password:** `comp1@123`
- **Username:** `company2` | **Password:** `comp2@123`
- **Username:** `tymor` | **Password:** `tym2@123`

## Features

### For Hiring Companies:
- Post and manage job openings
- Schedule video interviews
- Analyze candidate performance through:
  - Facial emotion analysis
  - Speech pattern analysis
  - Resume-job description matching
- Review candidate profiles

### For Candidates:
- Browse and apply for jobs
- Participate in video interviews
- Upload resume
- View interview schedule

## Troubleshooting

### White Screen on Company Dashboard
- Clear browser cache (Ctrl + Shift + R)
- Log out and log back in
- Check browser console for errors

### Backend Not Starting
- Ensure MongoDB is running
- Check if port 5000 is available
- Verify all Python dependencies are installed

### Frontend Errors
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Check if port 3000 is available

### Session/Authentication Issues
- Clear browser cookies
- Restart both backend and frontend servers

## Technology Stack

**Backend:**
- Flask (Python web framework)
- OpenCV (Computer vision)
- TensorFlow/Keras (Deep learning)
- MongoDB (Database)
- PyMongo (MongoDB driver)
- Librosa (Audio analysis)
- MediaPipe (Face detection)

**Frontend:**
- React.js
- Redux (State management)
- React Router (Navigation)
- Axios (HTTP client)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is developed by Tymor Technologies.

## Support

For issues and questions, please open an issue on the GitHub repository.

