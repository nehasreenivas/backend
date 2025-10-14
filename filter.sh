#!/bin/sh
if [ -f backend/resume_similarity.py ]; then
  sed -i "s/API_KEY = os.getenv(\\"HF_API_KEY\\", \\"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\\")/API_KEY = os.getenv(\\"HF_API_KEY\\")/g" backend/resume_similarity.py
fi
