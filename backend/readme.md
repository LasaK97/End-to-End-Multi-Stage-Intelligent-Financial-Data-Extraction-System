### How to Run


1. Naviage to 'fintech extractor' directory.

2. Install dependencies.

```pip install -r requirements.txt```

3. Download the models.
```python3 scripts/download_models.py```

4. Copy the documents in to 'data/uploads' directory.

5. Run the test script.
``` python3 tests/test_ext_pipeline```

6. Extracted data is been saved to 'data/outputs' directory.