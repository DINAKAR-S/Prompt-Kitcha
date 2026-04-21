import requests

# Try common PDF locations for Kaggle whitepapers
urls_to_try = [
    'https://www.kaggle.com/download/prompt-engineering-whitepaper.pdf',
    'https://storage.googleapis.com/kaggle-media/prompt-engineering-whitepaper.pdf',
    'https://www.kaggle.com/whitepaper-prompt-engineering/download',
    'https://www.kaggle.com/whitepaper-prompt-engineering.pdf',
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

for url in urls_to_try:
    try:
        r = requests.head(url, headers=headers, allow_redirects=True, timeout=5)
        print(f'{url}: {r.status_code}')
        if r.status_code == 200:
            print(f'  Content-Type: {r.headers.get("content-type", "unknown")}')
    except Exception as e:
        print(f'{url}: Error - {e}')
