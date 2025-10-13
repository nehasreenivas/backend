import re
import requests
import urllib3
import pdfplumber
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from utils import cprint
import os

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Make sure required nltk data is available
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")

try:
    nltk.data.find("tokenizers/punkt_tab")
except LookupError:
    nltk.download("punkt_tab")

try:
    nltk.data.find("corpora/stopwords")
except LookupError:
    nltk.download("stopwords")

# Load API key safely
API_KEY = os.getenv("HF_API_KEY")

if not API_KEY:
    cprint("NO API KEY FOUND. Add api key with variable HF_API_KEY in env", color="red")
    raise Exception("No API key found")

def parse_pdf(file_path):
    """Extract text from a PDF file"""
    content = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                content += text
    return content

def removeStopWords(txt):
    """Remove stopwords from text"""
    stop_words = set(stopwords.words("english"))
    txt = txt.lower()
    word_tokens = word_tokenize(txt)
    filtered_sentence = [w for w in word_tokens if w not in stop_words]
    return " ".join(filtered_sentence)

def removePunctuations(text):
    """Remove punctuations, mentions, links, etc."""
    text = re.sub(r"(@\[A-Za-z0-9]+)|([^0-9A-Za-z \t])|(\w+:\/\/\S+)|^rt|http.+?", "", text)
    return text

def cleanText(text):
    """Apply text cleaning pipeline"""
    return removeStopWords(removePunctuations(text))

def findsim(resume_text, job_desc):
    """Call Hugging Face similarity model"""
    API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/bert-base-nli-mean-tokens"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    payload = {
        "inputs": {
            "source_sentence": resume_text,
            "sentences": [job_desc],
        },
    }

    response = requests.post(API_URL, headers=headers, json=payload, verify=False)
    try:
        result = response.json()
        if isinstance(result, list) and len(result) > 0:
            return result[0] * 100  # return similarity %
        else:
            return {"error": result}
    except Exception as e:
        return {"error": str(e)}

def start_similary(file_path, job_description):
    """Main entry point: parse, clean, and compute similarity"""
    resume_text = parse_pdf(file_path)
    cleaned_resume = cleanText(resume_text)
    cleaned_job_desc = cleanText(job_description)
    return findsim(cleaned_resume, cleaned_job_desc)